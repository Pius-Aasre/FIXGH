'use strict';

const { Resend } = require('resend');
const nodemailer = require('nodemailer');

// Initialize Resend client if API key is provided
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Fallback SMTP transporter if SMTP settings are used
const smtpTransporter = process.env.EMAIL_HOST && process.env.EMAIL_USER
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

/**
 * Escape HTML special characters to prevent HTML/Email injection
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate that an image URL begins with an allowed secure scheme
 */
function safeImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return parsed.href;
  } catch {
    return null;
  }
  return null;
}

/**
 * Notify the relevant authority about a newly submitted report via Resend.
 *
 * @param {object} authority  - Prisma Authority record (.emailAddress)
 * @param {object} report     - Prisma Report record
 * @param {object} citizen    - Prisma User record (.name, .email)
 */
async function sendAuthorityEmail(authority, report, citizen) {
  if (!process.env.RESEND_API_KEY && !smtpTransporter) {
    console.log('[email] Neither RESEND_API_KEY nor SMTP credentials configured. Skipping email dispatch.');
    return;
  }

  const baseDashboardUrl = process.env.DASHBOARD_URL || 'https://fixgh.org';
  const reportUrl = `${baseDashboardUrl}/dashboard/report/${encodeURIComponent(report.id)}`;

  const safeTitle = escapeHtml(report.title);
  const safeCategory = escapeHtml(report.category || 'General');
  const safePriority = escapeHtml(report.aiPriorityScore || 'MEDIUM');
  const safeDesc = escapeHtml(report.description);
  const safeCitizenName = escapeHtml(citizen.name || 'Anonymous Citizen');
  const safeCitizenEmail = escapeHtml(citizen.email || 'N/A');
  const imageUrl = safeImageUrl(report.imageUrl);

  const locationText = report.latitude && report.longitude
    ? `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`
    : 'Not provided';

  // Resend default verified testing sender is onboarding@resend.dev
  // In production with a custom verified domain: alerts@yourdomain.com
  const fromAddress = process.env.EMAIL_FROM || 'FixGH Alerts <onboarding@resend.dev>';
  const subject = `[${safePriority}] Infrastructure Report: ${safeTitle}`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
      <h2 style="color: #0f172a; margin-top: 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">New Infrastructure Incident</h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 120px; color: #64748b;">Issue:</td>
          <td style="padding: 8px 0; font-size: 16px; font-weight: 600;">${safeTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Category:</td>
          <td style="padding: 8px 0;">${safeCategory}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #64748b;">AI Priority:</td>
          <td style="padding: 8px 0;"><span style="background-color: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${safePriority}</span></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Location:</td>
          <td style="padding: 8px 0;">📍 ${locationText}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Reported by:</td>
          <td style="padding: 8px 0;">${safeCitizenName} (${safeCitizenEmail})</td>
        </tr>
      </table>

      <div style="margin: 20px 0; background-color: #f8fafc; padding: 14px; border-radius: 8px; border-left: 4px solid #0f172a;">
        <p style="margin: 0; font-weight: bold; color: #475569; margin-bottom: 6px;">Description:</p>
        <p style="margin: 0; line-height: 1.5;">${safeDesc}</p>
      </div>

      ${imageUrl ? `
        <div style="margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: #475569;">Attached Image:</p>
          <img src="${imageUrl}" alt="Incident Photo" style="max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0;" />
        </div>
      ` : ''}

      <div style="margin-top: 28px;">
        <a href="${reportUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
          Open in Web Dashboard →
        </a>
      </div>

      <p style="margin-top: 32px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px;">
        FixGH Citizen Reporting Platform • Sent automatically
      </p>
    </div>
  `;

  // 1. Send via Resend SDK if configured (primary)
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: authority.emailAddress,
        subject,
        html: htmlContent,
      });

      if (error) {
        console.error('[email:resend] Failed to send email:', error);
      } else {
        console.log('[email:resend] Authority alert email dispatched successfully. ID:', data?.id);
      }
      return;
    } catch (resendErr) {
      console.error('[email:resend] Exception while dispatching email:', resendErr.message);
      return;
    }
  }

  // 2. Fallback to standard SMTP if configured
  if (smtpTransporter) {
    try {
      await smtpTransporter.sendMail({
        from: fromAddress,
        to: authority.emailAddress,
        subject,
        html: htmlContent,
      });
      console.log('[email:smtp] Authority alert email sent via SMTP.');
    } catch (smtpErr) {
      console.error('[email:smtp] SMTP dispatch error:', smtpErr.message);
    }
  }
}

module.exports = { sendAuthorityEmail };

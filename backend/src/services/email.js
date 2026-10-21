'use strict';

const { Resend } = require('resend');
const nodemailer = require('nodemailer');

/**
 * Single source of truth for all outbound email.
 *
 * Every message in the system (emergency authority alerts, monthly digests)
 * flows through `sendEmail()` so that delivery, fall-back and test-mode
 * behaviour are identical everywhere.
 */

// --- Providers ---------------------------------------------------------------

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

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
 * Test-mode recipient.
 *
 * When set, EVERY outbound email is redirected to this inbox instead of the
 * live authority address. This is required while sending from Resend's
 * `onboarding@resend.dev` test sender, which Resend only permits to deliver
 * to the account owner's own email address.
 *
 * The authority the alert was really addressed to is preserved in the subject
 * prefix and in a banner at the top of the message body.
 */
const TEST_RECIPIENT =
  process.env.EMAIL_TEST_RECIPIENT ||
  process.env.MONTHLY_DIGEST_TEST_RECIPIENT ||
  process.env.TEST_AUTHORITY_EMAIL ||
  null;

/**
 * Resolve the actual delivery address for a message.
 *
 * @param {string} realAddress       The address the message is really for
 * @param {string} [overrideRecipient] Explicit address that wins over test mode
 *                                    (used by the digest CLI `--to` flag)
 */
function resolveRecipient(realAddress, overrideRecipient = null) {
  if (overrideRecipient) return overrideRecipient;
  if (!TEST_RECIPIENT) return realAddress;
  if (realAddress === TEST_RECIPIENT) return realAddress;
  return TEST_RECIPIENT;
}

/**
 * True when the message will be delivered somewhere other than its intended
 * recipient.
 */
function isRedirected(intendedRecipient, actualRecipient) {
  return Boolean(actualRecipient) && actualRecipient !== intendedRecipient;
}

// --- Helpers -----------------------------------------------------------------

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
 * Subject prefix identifying the authority an alert was really addressed to.
 */
function testModeSubjectPrefix(intendedRecipient, actualRecipient) {
  if (!isRedirected(intendedRecipient, actualRecipient)) return '';
  return `[TEST → ${intendedRecipient}] `;
}

/**
 * Visible banner explaining that the message was redirected.
 */
function testModeBanner(intendedRecipient, actualRecipient) {
  if (!isRedirected(intendedRecipient, actualRecipient)) return '';
  return `
    <div style="background-color:#fff7ed; border:1px solid #fdba74; border-left:4px solid #f97316; padding:12px 14px; margin:0 0 18px; border-radius:6px; font-size:13px; color:#7c2d12;">
      <strong>TEST MODE</strong> &mdash; this alert was addressed to
      <strong>${escapeHtml(intendedRecipient)}</strong> but was redirected to
      <strong>${escapeHtml(actualRecipient)}</strong>.
      Clear <code>EMAIL_TEST_RECIPIENT</code> to deliver to the real recipient.
    </div>`;
}

// --- Core sender -------------------------------------------------------------

/**
 * Send an email, preferring Resend and falling back to SMTP.
 *
 * Never throws — the returned object always describes the outcome so callers
 * can surface delivery failures instead of silently swallowing them.
 *
 * @param {object}   opts
 * @param {string}   opts.to       Intended recipient (redirected in test mode)
 * @param {string}  [opts.recipient] Pre-resolved delivery address
 * @param {string}   opts.subject
 * @param {string}   opts.html
 * @param {string}  [opts.label]   Human-readable label used in log lines
 * @returns {Promise<{sent: boolean, provider: string, messageId: string|null,
 *   error: string|null, intendedRecipient: string, recipient: string|null}>}
 */
async function sendEmail({ to, recipient, subject, html, label = 'email' }) {
  const intendedRecipient = to;
  const actualRecipient = recipient || resolveRecipient(to);
  const fromAddress = process.env.EMAIL_FROM || 'FixGH Alerts <onboarding@resend.dev>';
  let lastError = null;

  if (!resend && !smtpTransporter) {
    const error = 'No email provider configured. Set RESEND_API_KEY or the SMTP variables.';
    console.error(`[email] ${label} skipped: ${error}`);
    return {
      sent: false,
      provider: 'none',
      messageId: null,
      error,
      intendedRecipient,
      recipient: actualRecipient,
    };
  }

  // 1. Resend (primary)
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: actualRecipient,
        subject,
        html,
      });

      if (error) {
        lastError = error.message;
        console.error(`[email:resend] ${label} failed: ${error.message}`);
      } else {
        console.log(`[email:resend] ${label} delivered to ${actualRecipient} (message ${data?.id})`);
        return {
          sent: true,
          provider: 'resend',
          messageId: data?.id || null,
          error: null,
          intendedRecipient,
          recipient: actualRecipient,
        };
      }
    } catch (resendErr) {
      lastError = resendErr.message;
      console.error(`[email:resend] ${label} threw: ${resendErr.message}`);
    }
  }

  // 2. SMTP fallback (previously unreachable — it returned early on Resend errors)
  if (smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail({
        from: fromAddress,
        to: actualRecipient,
        subject,
        html,
      });
      console.log(`[email:smtp] ${label} delivered to ${actualRecipient} (message ${info.messageId})`);
      return {
        sent: true,
        provider: 'smtp',
        messageId: info.messageId || null,
        error: null,
        intendedRecipient,
        recipient: actualRecipient,
      };
    } catch (smtpErr) {
      lastError = smtpErr.message;
      console.error(`[email:smtp] ${label} failed: ${smtpErr.message}`);
    }
  }

  return {
    sent: false,
    provider: resend ? 'resend' : 'none',
    messageId: null,
    error: lastError || 'Unknown email delivery failure.',
    intendedRecipient,
    recipient: actualRecipient,
  };
}

// --- Authority alert ---------------------------------------------------------

/**
 * Notify the relevant authority about a newly submitted report.
 *
 * @param {object} authority  - { emailAddress, departmentName }
 * @param {object} report     - Report record
 * @param {object} citizen    - User record ({ name, email })
 * @returns {Promise<object>} Delivery result (see sendEmail)
 */
async function sendAuthorityEmail(authority, report, citizen) {
  const intendedRecipient = authority.emailAddress;
  const actualRecipient = resolveRecipient(intendedRecipient);
  const baseDashboardUrl = process.env.DASHBOARD_URL || 'https://fixgh.org';
  const reportUrl = `${baseDashboardUrl}/dashboard/report/${encodeURIComponent(report.id)}`;

  const safeTitle = escapeHtml(report.title);
  const safeCategory = escapeHtml(report.category || 'General');
  const safePriority = escapeHtml(report.aiPriorityScore || 'MEDIUM');
  const safeDesc = escapeHtml(report.description);
  const safeCitizenName = escapeHtml(citizen.name || 'Anonymous Citizen');
  const safeCitizenEmail = escapeHtml(citizen.email || 'N/A');
  const imageUrl = safeImageUrl(report.imageUrl);

  const hasCoords = report.latitude !== null && report.latitude !== undefined
    && report.longitude !== null && report.longitude !== undefined;
  const locationText = report.locationText
    ? escapeHtml(report.locationText)
    : hasCoords
      ? `${Number(report.latitude).toFixed(5)}, ${Number(report.longitude).toFixed(5)}`
      : 'Not provided';

  const fromAddress = process.env.EMAIL_FROM || 'FixGH Alerts <onboarding@resend.dev>';
  const subject = `${testModeSubjectPrefix(intendedRecipient, actualRecipient)}[${safePriority}] Infrastructure Report: ${safeTitle}`;

  const htmlContent = `${testModeBanner(intendedRecipient, actualRecipient)}
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

  return sendEmail({
    to: intendedRecipient,
    recipient: actualRecipient,
    subject,
    html: htmlContent,
    label: `authority-alert(${authority.departmentName || 'authority'})`,
  });
}

module.exports = {
  sendEmail,
  sendAuthorityEmail,
  escapeHtml,
  resolveRecipient,
  isRedirected,
  testModeSubjectPrefix,
  testModeBanner,
  safeImageUrl,
};

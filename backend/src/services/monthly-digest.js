'use strict';

const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const { getDb } = require('../lib/firebase');
const { AUTHORITIES, AUTHORITIES_BY_EMAIL } = require('../constants/authorities');
const { generateMonthlyDigestSummary } = require('./ai');

// Initialize Resend
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Fallback SMTP
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
 * Builds the HTML email template for the Authority Monthly Digest
 */
function buildMonthlyDigestEmailHtml({
  authority,
  monthLabel,
  complaints,
  filteredSpamCount,
  aiSummary,
  dashboardBaseUrl,
}) {
  const safeAuthName = escapeHtml(authority.name);
  const safeDept = escapeHtml(authority.category || 'Public Authority');
  const totalReports = complaints.length;

  const emergencies = complaints.filter((c) => c.aiPriorityScore === 'EMERGENCY').length;
  const highs = complaints.filter((c) => c.aiPriorityScore === 'HIGH').length;
  const mediums = complaints.filter((c) => c.aiPriorityScore === 'MEDIUM').length;
  const lows = complaints.filter((c) => c.aiPriorityScore === 'LOW' || !c.aiPriorityScore).length;

  // Build the complaint rows
  const complaintRowsHtml = complaints.slice(0, 50).map((c, index) => {
    const priorityColor =
      c.aiPriorityScore === 'EMERGENCY' ? '#dc2626' :
      c.aiPriorityScore === 'HIGH' ? '#ea580c' :
      c.aiPriorityScore === 'MEDIUM' ? '#d97706' : '#2563eb';

    const safeTitle = escapeHtml(c.title || 'Untitled Report');
    const safeDesc = escapeHtml((c.description || '').slice(0, 160) + ((c.description || '').length > 160 ? '...' : ''));
    const safeLoc = escapeHtml(c.locationText || (c.latitude ? `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}` : 'Location pinned'));
    const dateStr = c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB') : 'N/A';
    const reportLink = `${dashboardBaseUrl}/dashboard/report/${encodeURIComponent(c.id)}`;

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
        <td style="padding: 10px 8px; color: #64748b; font-family: monospace;">#${index + 1}</td>
        <td style="padding: 10px 8px;">
          <div style="font-weight: 600; color: #0f172a; margin-bottom: 3px;">${safeTitle}</div>
          <div style="color: #475569; font-size: 12px; line-height: 1.4;">${safeDesc}</div>
          ${c.imageUrl ? `<a href="${c.imageUrl}" target="_blank" style="color: #2563eb; font-size: 11px; text-decoration: underline; display: inline-block; margin-top: 4px;">📷 View Attached Photo</a>` : ''}
        </td>
        <td style="padding: 10px 8px; color: #334155;">📍 ${safeLoc}</td>
        <td style="padding: 10px 8px; text-align: center;">
          <span style="background-color: ${priorityColor}15; color: ${priorityColor}; border: 1px solid ${priorityColor}40; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 11px;">
            ${escapeHtml(c.aiPriorityScore || 'MEDIUM')}
          </span>
        </td>
        <td style="padding: 10px 8px; color: #64748b; font-size: 12px; text-align: center;">${dateStr}</td>
        <td style="padding: 10px 8px; text-align: right;">
          <a href="${reportLink}" style="background-color: #0f172a; color: #ffffff; padding: 5px 10px; border-radius: 4px; text-decoration: none; font-size: 11px; font-weight: 600; white-space: nowrap;">Review →</a>
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>FixGH Monthly Citizen Grievance Digest</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <div style="max-width: 780px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header with Ghana Flag Colors Bar -->
    <div style="height: 6px; background: linear-gradient(to right, #ce1126 33.3%, #fcd116 33.3%, #fcd116 66.6%, #006b3f 66.6%);"></div>
    
    <div style="padding: 28px 32px; background-color: #0f172a; color: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="background-color: #fcd116; color: #000000; font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
            FixGH Intelligence
          </span>
          <h1 style="margin: 8px 0 4px 0; font-size: 24px; font-weight: 700; color: #ffffff;">
            Monthly Citizen Grievance Report
          </h1>
          <p style="margin: 0; color: #94a3b8; font-size: 14px;">
            Target Authority: <strong style="color: #f1f5f9;">${safeAuthName}</strong> (${safeDept})
          </p>
        </div>
      </div>
      <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid #334155; font-size: 13px; color: #cbd5e1; display: flex; gap: 20px;">
        <span>📅 Period: <strong>${escapeHtml(monthLabel)}</strong></span>
        <span>•</span>
        <span>📩 Recipient: <strong>${escapeHtml(authority.email)}</strong></span>
      </div>
    </div>

    <div style="padding: 28px 32px;">
      
      <!-- KPI Stats Grid -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 12px; margin: 0 -12px 20px -12px;">
        <tr>
          <td style="background-color: #f1f5f9; padding: 14px 16px; border-radius: 8px; width: 25%; text-align: center; border: 1px solid #e2e8f0;">
            <div style="font-size: 26px; font-weight: 800; color: #0f172a;">${totalReports}</div>
            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-top: 4px;">Total Reports</div>
          </td>
          <td style="background-color: #fef2f2; padding: 14px 16px; border-radius: 8px; width: 25%; text-align: center; border: 1px solid #fecaca;">
            <div style="font-size: 26px; font-weight: 800; color: #dc2626;">${emergencies + highs}</div>
            <div style="font-size: 11px; text-transform: uppercase; color: #991b1b; font-weight: 600; margin-top: 4px;">Urgent / High</div>
          </td>
          <td style="background-color: #fffbeb; padding: 14px 16px; border-radius: 8px; width: 25%; text-align: center; border: 1px solid #fde68a;">
            <div style="font-size: 26px; font-weight: 800; color: #d97706;">${mediums}</div>
            <div style="font-size: 11px; text-transform: uppercase; color: #92400e; font-weight: 600; margin-top: 4px;">Moderate</div>
          </td>
          <td style="background-color: #f0fdf4; padding: 14px 16px; border-radius: 8px; width: 25%; text-align: center; border: 1px solid #bbf7d0;">
            <div style="font-size: 26px; font-weight: 800; color: #16a34a;">${filteredSpamCount}</div>
            <div style="font-size: 11px; text-transform: uppercase; color: #166534; font-weight: 600; margin-top: 4px;">Spam Screened</div>
          </td>
        </tr>
      </table>

      <!-- AI Executive Briefing -->
      <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 16px 20px; border-radius: 6px; margin-bottom: 24px; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #0369a1; display: flex; align-items: center; gap: 8px;">
          🤖 AI Monthly Triage & Executive Summary
        </h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #334155;">
          ${escapeHtml(aiSummary.executiveSummary)}
        </p>
      </div>

      ${aiSummary.criticalHighlights && aiSummary.criticalHighlights.length > 0 ? `
      <!-- Critical Urgent Concerns -->
      <div style="margin-bottom: 28px;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #dc2626;">
          ⚠️ Critical High-Urgency Incidents Requiring Intervention:
        </h4>
        <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.6;">
          ${aiSummary.criticalHighlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      <!-- Itemized Complaints Table -->
      <div style="margin-top: 24px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #0f172a;">
          📋 Itemized Citizen Complaints Log (${totalReports})
        </h3>
        
        ${totalReports === 0 ? `
          <div style="padding: 24px; text-align: center; background-color: #f8fafc; border-radius: 8px; color: #64748b; font-size: 14px;">
            No unaddressed complaints logged for this period under ${safeAuthName}.
          </div>
        ` : `
          <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background-color: #f1f5f9; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
                  <th style="padding: 10px 8px; width: 36px;">#</th>
                  <th style="padding: 10px 8px;">Issue & Citizen Report</th>
                  <th style="padding: 10px 8px; width: 140px;">Location</th>
                  <th style="padding: 10px 8px; width: 85px; text-align: center;">Urgency</th>
                  <th style="padding: 10px 8px; width: 75px; text-align: center;">Date</th>
                  <th style="padding: 10px 8px; width: 80px; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${complaintRowsHtml}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- Action Button -->
      <div style="margin-top: 32px; text-align: center; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">
          Authority officers can view full interactive GPS coordinates, citizen media, and change issue status in the Web Portal:
        </p>
        <a href="${dashboardBaseUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 14px;">
          Access FixGH Authority Dashboard →
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5;">
      <p style="margin: 0 0 4px 0;">
        <strong>FixGH Platform</strong> • Republic of Ghana Civic Infrastructure & Public Grievance Dispatch System.
      </p>
      <p style="margin: 0;">
        This monthly digest was curated, filtered against spam, and categorized automatically by the FixGH AI Engine.
      </p>
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * Executes the monthly report compilation, filtering, and emailing across all 40 authorities.
 *
 * @param {object} options
 * @param {string} [options.targetMonth] - e.g. "October 2026"
 * @param {string} [options.testRecipient] - if provided, sends all digests to this test email
 * @param {boolean} [options.dryRun] - if true, compiles digests and statistics without dispatching
 * @param {string} [options.singleAuthorityId] - if specified, processes only this authority (1..40)
 */
async function runMonthlyDigest(options = {}) {
  const db = getDb();
  if (!db) {
    throw new Error('Database is not initialized.');
  }

  const defaultMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const targetMonth = (options && options.targetMonth) || defaultMonth;
  const testRecipient = (options && options.testRecipient) || process.env.MONTHLY_DIGEST_TEST_RECIPIENT || process.env.TEST_AUTHORITY_EMAIL;
  const dryRun = Boolean(options && options.dryRun);
  const singleAuthorityId = options && options.singleAuthorityId;

  console.log(`\n======================================================`);
  console.log(`[MONTHLY DIGEST] Commencing run for: ${targetMonth}`);
  console.log(`[MONTHLY DIGEST] Dry run: ${dryRun ? 'YES (Simulated)' : 'NO (Live)'}`);
  if (testRecipient) {
    console.log(`[MONTHLY DIGEST] Test recipient mode: routing to <${testRecipient}>`);
  }
  console.log(`======================================================\n`);

  // 1. Fetch all reports from the database
  const reportsSnapshot = await db.collection('reports').get();
  const allReports = reportsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  console.log(`[MONTHLY DIGEST] Retrieved ${allReports.length} total reports from database.`);

  // 2. Filter out spam and separate by authority
  const validReports = [];
  let totalSpamFiltered = 0;

  for (const report of allReports) {
    if (report.filterStatus === 'SPAM' || report.filterStatus === 'REJECTED') {
      totalSpamFiltered++;
    } else {
      validReports.push(report);
    }
  }

  // Group valid reports by authority ID / email
  const reportsByAuthEmail = {};
  for (const report of validReports) {
    const authEmail = (report.assignedAuthorityEmail || '').toLowerCase();
    if (authEmail) {
      if (!reportsByAuthEmail[authEmail]) reportsByAuthEmail[authEmail] = [];
      reportsByAuthEmail[authEmail].push(report);
    }
  }

  // Determine authorities to process
  let authoritiesToProcess = AUTHORITIES;
  if (singleAuthorityId) {
    authoritiesToProcess = AUTHORITIES.filter((a) => a.id === String(singleAuthorityId));
  }

  const results = {
    targetMonth,
    dryRun,
    totalAuthorities: authoritiesToProcess.length,
    sentCount: 0,
    skippedCount: 0,
    errors: [],
    details: [],
  };

  const dashboardBaseUrl = process.env.DASHBOARD_URL || 'https://fixgh.org';
  const fromAddress = process.env.EMAIL_FROM || 'FixGH Alerts <onboarding@resend.dev>';

  for (const authority of authoritiesToProcess) {
    const authEmailKey = authority.email.toLowerCase();
    const authorityComplaints = reportsByAuthEmail[authEmailKey] || [];

    console.log(`-> Processing Authority [${authority.id}/40]: ${authority.name}`);
    console.log(`   Assigned Complaints: ${authorityComplaints.length}`);

    // Generate AI monthly summary
    const aiSummary = await generateMonthlyDigestSummary(authority, targetMonth, authorityComplaints);

    // Build Email HTML
    const emailHtml = buildMonthlyDigestEmailHtml({
      authority,
      monthLabel: targetMonth,
      complaints: authorityComplaints,
      filteredSpamCount: Math.round(totalSpamFiltered / 40),
      aiSummary,
      dashboardBaseUrl,
    });

    const destinationEmail = testRecipient || authority.email;
    const subject = `[FixGH Intelligence] ${targetMonth} Citizen Grievance Digest: ${authority.name} (${authorityComplaints.length} Reports)`;

    const detailItem = {
      authorityId: authority.id,
      authorityName: authority.name,
      targetEmail: destinationEmail,
      actualAuthorityEmail: authority.email,
      complaintCount: authorityComplaints.length,
      highPriorityCount: aiSummary.urgencyBreakdown.EMERGENCY + aiSummary.urgencyBreakdown.HIGH,
      status: 'PENDING',
    };

    if (dryRun) {
      console.log(`   [DRY RUN] Would send email to: ${destinationEmail}`);
      detailItem.status = 'SIMULATED';
      results.sentCount++;
      results.details.push(detailItem);
      continue;
    }

    // Live dispatch via Resend or SMTP
    try {
      if (resend) {
        const { data, error } = await resend.emails.send({
          from: fromAddress,
          to: destinationEmail,
          subject,
          html: emailHtml,
        });

        if (error) {
          throw new Error(error.message);
        }

        console.log(`   ✓ Dispatched via Resend. Message ID: ${data?.id}`);
        detailItem.status = 'SENT';
        detailItem.messageId = data?.id;
        results.sentCount++;
      } else if (smtpTransporter) {
        const info = await smtpTransporter.sendMail({
          from: fromAddress,
          to: destinationEmail,
          subject,
          html: emailHtml,
        });

        console.log(`   ✓ Dispatched via SMTP. Message ID: ${info.messageId}`);
        detailItem.status = 'SENT';
        detailItem.messageId = info.messageId;
        results.sentCount++;
      } else {
        console.warn(`   [WARN] No Resend API key or SMTP config found. Marked simulated.`);
        detailItem.status = 'NO_EMAIL_CONFIGURED';
        results.skippedCount++;
      }
    } catch (err) {
      console.error(`   ✗ Dispatch failed for ${authority.name}:`, err.message);
      detailItem.status = 'FAILED';
      detailItem.error = err.message;
      results.errors.push({ authority: authority.name, error: err.message });
    }

    results.details.push(detailItem);
  }

  // 3. Record digest dispatch log into database
  try {
    await db.collection('monthly_digest_logs').add({
      targetMonth,
      runTimestamp: new Date().toISOString(),
      dryRun,
      totalAuthorities: results.totalAuthorities,
      sentCount: results.sentCount,
      errorsCount: results.errors.length,
    });
  } catch (logErr) {
    console.warn('[MONTHLY DIGEST] Failed to persist log:', logErr.message);
  }

  console.log(`\n======================================================`);
  console.log(`[MONTHLY DIGEST] Run completed! Sent/Processed: ${results.sentCount}, Errors: ${results.errors.length}`);
  console.log(`======================================================\n`);

  return results;
}

module.exports = {
  runMonthlyDigest,
  buildMonthlyDigestEmailHtml,
};

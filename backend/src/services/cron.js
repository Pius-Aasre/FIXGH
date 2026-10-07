'use strict';

const cron = require('node-cron');
const { runMonthlyDigest } = require('./monthly-digest');

/**
 * Initializes scheduled background jobs for FixGH.
 * Runs on the 1st day of every month at 08:00 AM UTC by default (cron: 0 8 1 * *).
 */
function initScheduledJobs() {
  const isEnabled = process.env.ENABLE_MONTHLY_CRON !== 'false';
  const cronExpression = process.env.MONTHLY_DIGEST_CRON || '0 8 1 * *';

  if (!isEnabled) {
    console.log('[CRON] Automated monthly digest cron is disabled by configuration.');
    return;
  }

  console.log(`[CRON] Initializing Monthly Authority Digest schedule (${cronExpression})...`);

  cron.schedule(cronExpression, async () => {
    console.log('[CRON] Triggering scheduled monthly citizen grievance digest...');
    try {
      const monthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
      await runMonthlyDigest({ targetMonth: monthLabel });
      console.log('[CRON] Scheduled monthly digest cycle finished successfully.');
    } catch (err) {
      console.error('[CRON ERROR] Scheduled monthly digest run failed:', err.message);
    }
  });

  console.log('[CRON] Monthly authority digest scheduler is active.');
}

module.exports = { initScheduledJobs };

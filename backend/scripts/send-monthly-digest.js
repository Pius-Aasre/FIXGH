'use strict';

require('dotenv').config();
const { runMonthlyDigest } = require('../src/services/monthly-digest');

async function main() {
  const args = process.argv.slice(2);

  const dryRun = args.includes('--dry-run') || args.includes('-d');
  
  let testRecipient = null;
  const toIdx = args.findIndex((a) => a === '--to' || a === '--test-recipient');
  if (toIdx !== -1 && args[toIdx + 1]) {
    testRecipient = args[toIdx + 1];
  } else if (process.env.MONTHLY_DIGEST_TEST_RECIPIENT || process.env.TEST_AUTHORITY_EMAIL) {
    testRecipient = process.env.MONTHLY_DIGEST_TEST_RECIPIENT || process.env.TEST_AUTHORITY_EMAIL;
  }

  let singleAuthorityId = null;
  const authIdx = args.findIndex((a) => a === '--authority' || a === '-a');
  if (authIdx !== -1 && args[authIdx + 1]) {
    singleAuthorityId = args[authIdx + 1];
  }

  let targetMonth = null;
  const monthIdx = args.findIndex((a) => a === '--month' || a === '-m');
  if (monthIdx !== -1 && args[monthIdx + 1]) {
    targetMonth = args[monthIdx + 1];
  }

  console.log('--- FixGH Monthly Digest Dispatcher CLI ---');
  console.log(`Dry Run: ${dryRun}`);
  console.log(`Test Recipient: ${testRecipient || 'None (Using live authority emails)'}`);
  console.log(`Single Authority ID: ${singleAuthorityId || 'All 40 Authorities'}`);

  const results = await runMonthlyDigest({
    dryRun,
    testRecipient,
    singleAuthorityId,
    targetMonth,
  });

  console.log('\n--- Final Summary ---');
  console.log(`Authorities Processed: ${results.totalAuthorities}`);
  console.log(`Successful: ${results.sentCount}`);
  console.log(`Skipped: ${results.skippedCount}`);
  console.log(`Errors: ${results.errors.length}`);

  process.exit(results.errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});

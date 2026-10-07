'use strict';

require('dotenv').config();
const { getDb } = require('../src/lib/firebase');
const { AUTHORITIES } = require('../src/constants/authorities');

async function main() {
  const db = getDb();
  if (!db) {
    console.error('Database is not initialized. Please ensure Firebase or local-db is configured.');
    process.exit(1);
  }

  console.log(`Seeding ${AUTHORITIES.length} official Ghanaian authorities into database...`);

  for (const auth of AUTHORITIES) {
    const docId = `auth_${auth.id}`;
    const payload = {
      id: auth.id,
      departmentName: auth.name,
      emailAddress: auth.email,
      category: auth.category,
      reportTypes: auth.reportTypes,
      updatedAt: new Date().toISOString(),
    };

    await db.collection('authorities').doc(docId).set(payload, { merge: true });
    console.log(`✓ [${auth.id}/40] Seeded: ${auth.name} <${auth.email}>`);
  }

  console.log(`\nSuccessfully seeded all ${AUTHORITIES.length} authorities!`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

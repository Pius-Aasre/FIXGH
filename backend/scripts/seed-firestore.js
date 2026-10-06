'use strict';

require('dotenv').config();
const { getDb } = require('../src/lib/firebase');

async function main() {
  const db = getDb();
  if (!db) {
    console.error('Firebase is not initialized. Please ensure serviceAccountKey.json or FIREBASE_* variables are set in .env');
    process.exit(1);
  }

  console.log('Seeding initial authority contacts into Cloud Firestore...');

  const authorities = [
    {
      departmentName: 'Ministry of Roads and Highways',
      emailAddress: process.env.TEST_AUTHORITY_EMAIL || 'roads@fixgh.org',
    },
    {
      departmentName: 'Ghana Water Company Limited (GWCL)',
      emailAddress: 'water@fixgh.org',
    },
    {
      departmentName: 'Electricity Company of Ghana (ECG)',
      emailAddress: 'power@fixgh.org',
    },
    {
      departmentName: 'Ministry of Sanitation',
      emailAddress: 'sanitation@fixgh.org',
    },
  ];

  for (const auth of authorities) {
    // Upsert by checking if document with email exists or using email as doc ID
    const docId = auth.emailAddress.replace(/[^a-zA-Z0-9]/g, '_');
    await db.collection('authorities').doc(docId).set(auth, { merge: true });
    console.log(`✓ Seeded authority: ${auth.departmentName} (${auth.emailAddress})`);
  }

  console.log('Firestore seeding completed successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Firestore seeding failed:', err);
  process.exit(1);
});

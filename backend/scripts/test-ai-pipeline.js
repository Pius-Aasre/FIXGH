'use strict';

require('dotenv').config();
const { classifyAndRoute } = require('../src/services/ai');
const { runMonthlyDigest } = require('../src/services/monthly-digest');
const prisma = require('../src/lib/prisma');
const bcrypt = require('bcrypt');

async function testPipeline() {
  console.log('==================================================');
  console.log('FixGH AI Complaint Organization & Routing Test');
  console.log('==================================================\n');

  // Reports require a valid author (foreign key), so make sure the test
  // citizen account exists before inserting anything.
  const testEmail = 'test_citizen_001@fixgh.test';
  const testUser = await prisma.user.upsert({
    where: { email: testEmail },
    update: {},
    create: {
      name: 'Test Citizen',
      email: testEmail,
      passwordHash: await bcrypt.hash('TestPass123!', 12),
      role: 'CITIZEN',
    },
  });
  const testUserId = testUser.id;

  const testComplaints = [
    {
      title: 'Armed robbery incident near Circle Overpass',
      description: 'Two armed robbers on a motorbike snatched bags and threatened pedestrians at gunpoint late last night.',
      locationText: 'Kwame Nkrumah Circle, Accra',
      expectedAuthority: 'Ghana Police Service',
    },
    {
      title: 'Fallen electric transformer with sparking wires in Madina',
      description: 'The high-voltage ECG transformer pole collapsed after heavy rain, leaving exposed live wires on the ground and total blackout.',
      locationText: 'Madina Old Road, Accra',
      expectedAuthority: 'Electricity Company of Ghana',
    },
    {
      title: 'Major water pipe burst flooding street in Adenta',
      description: 'A large GWCL main pipe has burst open, wasting gallons of clean drinking water and cutting off tap supply to the entire community.',
      locationText: 'Adenta Barrier, Accra',
      expectedAuthority: 'Ghana Water Company',
    },
    {
      title: 'Pharmacy selling expired antibiotics without prescription',
      description: 'A local drug store is selling expired amoxicillin with falsified expiry labels and counterfeit cosmetics causing skin burns.',
      locationText: 'Kasoa New Market',
      expectedAuthority: 'Food and Drugs Authority',
    },
    {
      title: 'Illegal galamsey chemicals polluting Pra river',
      description: 'Illegal gold miners are discharging toxic mercury and cyanide directly into the river causing heavy chemical pollution.',
      locationText: 'Pra River basin',
      expectedAuthority: 'Environmental Protection Authority',
    },
    {
      title: 'Massive uncollected garbage dump in Makola market',
      description: 'Heaps of rotting refuse and choked gutters have blocked access to shops in Central Accra for three weeks, creating terrible stench.',
      locationText: 'Makola Market, Central Accra',
      expectedAuthority: 'Accra Metropolitan Assembly',
    },
    {
      title: 'Catastrophic flash flood submerging houses in Weija',
      description: 'The Weija dam spillage and heavy rainstorm have submerged dozens of homes, requiring emergency disaster relief boats.',
      locationText: 'Weija, Ga South',
      expectedAuthority: 'National Disaster Management Organisation',
    },
    {
      title: 'Deep crater pothole causing vehicle axle damage',
      description: 'Deep road potholes on the main inner city street are breaking car suspensions and causing severe traffic gridlock.',
      locationText: 'Ring Road Central',
      expectedAuthority: 'Department of Urban Roads',
    },
    {
      title: 'asdfghjkl',
      description: 'aaaaaaa',
      locationText: 'test',
      expectedSpam: true,
    },
  ];

  for (const item of testComplaints) {
    const aiResult = await classifyAndRoute(item.title, item.description, item.locationText);
    
    if (item.expectedSpam) {
      console.log(`[SPAM FILTER] "${item.title}": Filtered = ${!aiResult.isValid} (Reason: ${aiResult.filterReason})`);
      continue;
    }

    console.log(`[AI ROUTED] "${item.title}"`);
    console.log(`   -> Target Authority: ${aiResult.authority?.name} <${aiResult.authority?.email}>`);
    console.log(`   -> Category: ${aiResult.category}`);
    console.log(`   -> Urgency: ${aiResult.priority}`);
    console.log(`   -> Validated: ${aiResult.isValid}`);

    // Insert sample complaint into database for the test
    if (aiResult.isValid) {
      try {
        await prisma.report.create({
          data: {
            title: item.title,
            description: item.description,
            locationText: item.locationText,
            category: aiResult.category,
            aiPriorityScore: aiResult.priority,
            assignedAuthorityId: aiResult.authority.id,
            assignedAuthorityName: aiResult.authority.name,
            assignedAuthorityEmail: aiResult.authority.email,
            filterStatus: 'APPROVED',
            userId: testUserId,
          },
        });
      } catch (err) {
        console.warn(`   [WARN] Could not persist sample report: ${err.message}`);
      }
    }
  }

  console.log('\n--- Running Dry-Run Monthly Digest with Populated Complaints ---');
  const digestResult = await runMonthlyDigest({
    dryRun: true,
    targetMonth: 'October 2026',
  });

  const activeWithReports = digestResult.details.filter((d) => d.complaintCount > 0);
  console.log(`\nActive Authorities with complaints compiled in this month: ${activeWithReports.length}`);
  for (const auth of activeWithReports) {
    console.log(`   ★ ${auth.authorityName}: ${auth.complaintCount} reports organized (High/Emergency: ${auth.highPriorityCount}) -> Email to: ${auth.actualAuthorityEmail}`);
  }

  console.log('\nAI pipeline test completed successfully!');
  await prisma.$disconnect();
  process.exit(0);
}

testPipeline()
  .catch(async (err) => {
    console.error('Test pipeline error:', err);
    await prisma.$disconnect();
    process.exit(1);
  });

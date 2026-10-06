'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial authority contacts...');

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
    await prisma.authority.upsert({
      where: { emailAddress: auth.emailAddress },
      update: { departmentName: auth.departmentName },
      create: auth,
    });
  }

  console.log(`Seeded ${authorities.length} department authorities successfully!`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

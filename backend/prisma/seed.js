'use strict';

const { PrismaClient } = require('@prisma/client');
const { AUTHORITIES } = require('../src/constants/authorities');

const prisma = new PrismaClient();

async function main() {
  console.log(`Seeding all ${AUTHORITIES.length} official Ghanaian authorities into Supabase Postgres...`);

  for (const auth of AUTHORITIES) {
    await prisma.authority.upsert({
      where: { emailAddress: auth.email },
      update: {
        departmentName: auth.name,
        category: auth.category || null,
        reportTypes: auth.reportTypes || null,
      },
      create: {
        id: `auth_${auth.id}`,
        departmentName: auth.name,
        emailAddress: auth.email,
        category: auth.category || null,
        reportTypes: auth.reportTypes || null,
      },
    });
  }

  const total = await prisma.authority.count();
  console.log(`Successfully seeded ${AUTHORITIES.length} department authorities into Supabase Postgres! (rows in table: ${total})`);
}

main()
  .catch((e) => {
    console.error('Prisma seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

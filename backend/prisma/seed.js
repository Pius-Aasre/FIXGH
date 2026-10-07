'use strict';

const { PrismaClient } = require('@prisma/client');
const { AUTHORITIES } = require('../src/constants/authorities');
const prisma = new PrismaClient();

async function main() {
  console.log(`Seeding all ${AUTHORITIES.length} official Ghanaian authorities into Prisma...`);

  for (const auth of AUTHORITIES) {
    await prisma.authority.upsert({
      where: { emailAddress: auth.email },
      update: {
        departmentName: auth.name,
      },
      create: {
        id: `auth_${auth.id}`,
        departmentName: auth.name,
        emailAddress: auth.email,
      },
    });
  }

  console.log(`Successfully seeded ${AUTHORITIES.length} department authorities into Prisma!`);
}

main()
  .catch((e) => {
    console.error('Prisma seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

'use strict';
const prisma = require('../src/lib/prisma');

(async () => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, _count: { select: { reports: true } } },
  });
  console.log('USERS');
  for (const u of users) console.log(`  ${u.id}  ${u.email}  reports=${u._count.reports}`);

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: {
      id: true, title: true, userId: true, status: true, createdAt: true,
      assignedAuthorityName: true,
    },
  });
  console.log('\nLATEST REPORTS');
  for (const r of reports) {
    console.log(`  ${r.createdAt.toISOString()}  user=${r.userId}  ${r.status}  "${r.title}" -> ${r.assignedAuthorityName}`);
  }

  await prisma.$disconnect();
})();

'use strict';

const { PrismaClient } = require('@prisma/client');

/**
 * Single shared Prisma client bound to Supabase Postgres.
 *
 * Prisma instances hold a connection pool, so exactly one must exist per
 * process — creating a new PrismaClient per request exhausts the pool.
 */
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

prisma
  .$connect()
  .then(() => console.log('[DATABASE] Connected to Supabase Postgres.'))
  .catch((err) => console.error('[DATABASE] Failed to connect to Supabase Postgres:', err.message));

module.exports = prisma;

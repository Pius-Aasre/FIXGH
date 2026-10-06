'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

// Startup Environment Validation
const { getDb } = require('./lib/firebase');
const db = getDb();
if (!db) {
  console.warn('[FIREBASE WARNING] Firestore is not connected yet. Please provide serviceAccountKey.json or set FIREBASE_* variables in .env');
}

if (!process.env.JWT_SECRET) {
  console.warn('[SECURITY WARNING] Required environment variable "JWT_SECRET" is NOT defined.');
} else if (process.env.JWT_SECRET.length < 32) {
  console.warn('[SECURITY WARNING] JWT_SECRET should be at least 32 characters long for cryptographic security.');
}

const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const newsRoutes = require('./routes/news');
const { apiLimiter, authLimiter, reportLimiter } = require('./middleware/rate-limit');

const app = express();

// 1. Security Headers via Helmet
app.use(helmet());

// 2. CORS configuration
// For mobile applications and authorized web dashboard
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 3. Request payload size limits (prevents payload exhaustion attacks)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 4. Global API Rate Limiter
app.use('/api', apiLimiter);

// 5. Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 6. Routes with specific rate limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', reportLimiter, reportRoutes);
app.use('/api', newsRoutes);

// 7. 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// 8. Centralized Error Handler (never leaks internal stack traces to users)
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err.message, err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message || 'Internal server error.',
  });
});

const PORT = parseInt(process.env.PORT || '3000', 10);
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`FixGH Backend running securely on port ${PORT} (0.0.0.0)`);
});

// Configure keep-alive timeouts to prevent mobile connection drops
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

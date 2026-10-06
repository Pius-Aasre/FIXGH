'use strict';

const jwt = require('jsonwebtoken');

/**
 * JWT authentication middleware.
 * Validates Authorization: Bearer <token>
 * Protects routes and attaches user metadata.
 */
function authMiddleware(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('FATAL: JWT_SECRET environment variable is not configured.');
    return res.status(500).json({ error: 'Server authentication configuration error.' });
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Authorization token is empty.' });
  }

  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (!payload.id || !payload.email) {
      return res.status(401).json({ error: 'Invalid token claims.' });
    }
    req.user = { id: payload.id, email: payload.email, role: payload.role || 'CITIZEN' };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
    return res.status(401).json({ error: 'Invalid or forged authentication token.' });
  }
}

module.exports = authMiddleware;

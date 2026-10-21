'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const router = express.Router();

// RFC-compliant email regex pattern
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validate registration input parameters
 */
function validateRegistration({ name, email, password }) {
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    return 'Full name must be between 2 and 100 characters.';
  }
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
    return 'Please provide a valid email address.';
  }
  if (!password || typeof password !== 'string') {
    return 'Password is required.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (password.length > 72) {
    return 'Password cannot exceed 72 characters.';
  }
  return null;
}

/**
 * POST /api/auth/register
 * Body: { name, email, password }
 */
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  const validationError = validateRegistration({ name, email, password });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // 12 rounds of bcrypt
    const passwordHash = await bcrypt.hash(password, 12);

    const createdUser = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        role: 'CITIZEN',
      },
    });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured on server.');
    }

    const token = jwt.sign(
      { id: createdUser.id, email: cleanEmail, role: 'CITIZEN' },
      secret,
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    return res.status(201).json({
      token,
      user: {
        id: createdUser.id,
        name: cleanName,
        email: cleanEmail,
        role: 'CITIZEN',
      },
    });
  } catch (err) {
    console.error('Registration failure:', err.message);
    return res.status(500).json({ error: 'Unable to complete registration. Please try again.' });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const userData = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // Constant-time comparison defense
    if (!userData) {
      await bcrypt.compare(password, '$2b$12$e80x6kLd3XbYdO1V6s0k5.qF7J9qZ2z0W0x2e0w6qZ2z0W0x2e0w6');
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatch = await bcrypt.compare(password, userData.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured on server.');
    }

    const token = jwt.sign(
      { id: userData.id, email: userData.email, role: userData.role || 'CITIZEN' },
      secret,
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    return res.json({
      token,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role || 'CITIZEN',
      },
    });
  } catch (err) {
    console.error('Login failure:', err.message);
    return res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
});

module.exports = router;

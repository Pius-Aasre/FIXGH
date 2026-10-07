'use strict';

const express = require('express');
const { AUTHORITIES } = require('../constants/authorities');
const { runMonthlyDigest } = require('../services/monthly-digest');
const { classifyAndRoute } = require('../services/ai');

const router = express.Router();

/**
 * GET /api/admin/authorities
 * Returns the list of all 40 registered Ghanaian authorities
 */
router.get('/authorities', (req, res) => {
  res.json({
    total: AUTHORITIES.length,
    authorities: AUTHORITIES,
  });
});

/**
 * POST /api/admin/test-ai-categorize
 * Test how AI categorizes, filters spam, and routes any complaint
 */
router.post('/test-ai-categorize', async (req, res) => {
  const { title, description, locationText } = req.body || {};
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }

  try {
    const result = await classifyAndRoute(title, description, locationText || '');
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/trigger-monthly-digest
 * Trigger monthly compilation and dispatch on-demand
 */
router.post('/trigger-monthly-digest', async (req, res) => {
  const { dryRun, testRecipient, targetMonth, singleAuthorityId } = req.body || {};

  try {
    const result = await runMonthlyDigest({
      dryRun: Boolean(dryRun),
      testRecipient: testRecipient || undefined,
      targetMonth: targetMonth || undefined,
      singleAuthorityId: singleAuthorityId || undefined,
    });

    return res.json({
      success: true,
      message: 'Monthly digest processing completed.',
      result,
    });
  } catch (err) {
    console.error('Trigger monthly digest error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

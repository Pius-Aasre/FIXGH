'use strict';

const express = require('express');
const multer = require('multer');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');
const { reportLimiter } = require('../middleware/rate-limit');
const { uploadImage } = require('../services/cloudinary');
const { classifyAndRoute } = require('../services/ai');
const { sendAuthorityEmail } = require('../services/email');

const router = express.Router();

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Secure multer configuration: 5MB max, strictly image MIME types
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB maximum
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      const err = new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
      err.status = 400;
      return cb(err, false);
    }
    cb(null, true);
  },
});

/**
 * Handle multer errors gracefully
 */
function uploadMiddleware(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Image size exceeds maximum limit of 5MB.' });
      }
      return res.status(err.status || 400).json({ error: err.message || 'Image upload error.' });
    }
    next();
  });
}

/**
 * POST /api/reports
 * Protected by JWT auth
 * Multipart form: title, description, locationText, latitude, longitude, image (optional)
 * AI organizes, filters spam, categorizes, and assigns to the right authority among all 40 public bodies.
 */
router.post('/reports', authMiddleware, reportLimiter, uploadMiddleware, async (req, res) => {
  const { title, description, locationText, latitude, longitude } = req.body || {};

  // 1. Validate required text fields
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required.' });
  }
  if (title.trim().length > 150) {
    return res.status(400).json({ error: 'Title must not exceed 150 characters.' });
  }

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({ error: 'Description is required.' });
  }
  if (description.trim().length > 2500) {
    return res.status(400).json({ error: 'Description must not exceed 2500 characters.' });
  }

  // 2. Validate coordinates if provided
  let lat = null;
  let lng = null;
  if (latitude !== undefined && latitude !== null && latitude !== '') {
    const parsedLat = parseFloat(latitude);
    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      return res.status(400).json({ error: 'Latitude must be a valid number between -90 and 90.' });
    }
    lat = parsedLat;
  }
  if (longitude !== undefined && longitude !== null && longitude !== '') {
    const parsedLng = parseFloat(longitude);
    if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      return res.status(400).json({ error: 'Longitude must be a valid number between -180 and 180.' });
    }
    lng = parsedLng;
  }

  try {
    // 3. AI Complaint Filter, Categorization, and Authority Routing.
    //    Runs BEFORE the upload so that spam never consumes storage quota.
    const aiResult = await classifyAndRoute(
      title.trim(),
      description.trim(),
      (locationText || '').trim()
    );

    const filterStatus = aiResult.isValid ? 'APPROVED' : 'SPAM';
    const assignedAuthority = aiResult.authority;

    // 4. Persist the report FIRST.
    //    A storage outage must never destroy a citizen's report, so the row is
    //    written before the photo is uploaded and the upload can fail safely.
    const created = await prisma.report.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        category: aiResult.category || 'General',
        locationText: (locationText || '').trim() || null,
        latitude: lat,
        longitude: lng,
        imageUrl: null,
        imageUploadFailed: false,
        aiPriorityScore: aiResult.priority || 'MEDIUM',
        confidence: aiResult.confidence ?? 0.8,
        status: 'PENDING',
        filterStatus,
        filterReason: aiResult.filterReason || null,
        assignedAuthorityId: assignedAuthority ? assignedAuthority.id : null,
        assignedAuthorityName: assignedAuthority ? assignedAuthority.name : null,
        assignedAuthorityEmail: assignedAuthority ? assignedAuthority.email : null,
        monthlyDigestSentAt: null,
        userId: req.user.id,
      },
    });

    // 5. Upload the photo. The report already exists, so a failure here only
    //    costs the image — never the report.
    let imageUrl = null;
    let imageUploadFailed = false;

    if (req.file) {
      try {
        const extension = MIME_EXTENSIONS[req.file.mimetype.toLowerCase()] || 'jpg';
        const safeFilename = `report-${Date.now()}.${extension}`;
        imageUrl = await uploadImage(req.file.buffer, safeFilename);
      } catch (uploadErr) {
        imageUploadFailed = true;
        console.error('[REPORTS] Photo upload failed — report saved without image:', uploadErr.message);
        await prisma.report.update({
          where: { id: created.id },
          data: { imageUploadFailed: true },
        });
      }
    }

    const report = { ...created, imageUrl, imageUploadFailed };

    // 6. Optional instant notification for EMERGENCY level reports
    let authorityNotified = false;
    let authorityEmailError = null;

    if (aiResult.isValid && aiResult.priority === 'EMERGENCY' && assignedAuthority) {
      try {
        const citizen = await prisma.user.findUnique({ where: { id: req.user.id } });
        const delivery = await sendAuthorityEmail(
          { emailAddress: assignedAuthority.email, departmentName: assignedAuthority.name },
          report,
          citizen
            ? { name: citizen.name, email: citizen.email }
            : { name: 'Citizen', email: req.user.email }
        );
        authorityNotified = delivery.sent;
        if (!delivery.sent) {
          authorityEmailError = delivery.error;
          console.warn('[REPORTS] Emergency authority email was NOT delivered:', delivery.error);
        }
      } catch (emailErr) {
        authorityEmailError = emailErr.message;
        console.warn('[REPORTS] Instant emergency authority email skipped:', emailErr.message);
      }
    }

    // Persist the notification outcome so the authority dashboard can show
    // whether the assigned body was actually alerted.
    if (authorityNotified) {
      try {
        await prisma.report.update({
          where: { id: created.id },
          data: { authorityNotified: true, authorityNotifiedAt: new Date() },
        });
        report.authorityNotified = true;
        report.authorityNotifiedAt = new Date();
      } catch (notifyErr) {
        console.warn('[REPORTS] Could not persist notification flag:', notifyErr.message);
      }
    }

    return res.status(201).json({
      report,
      imageUploadFailed,
      authorityNotified,
      authorityEmailError,
    });
  } catch (err) {
    console.error('Error creating report:', err.message);
    return res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Unable to process report. Please try again.'
        : err.message || 'Unable to process report. Please try again.',
    });
  }
});

/**
 * GET /api/reports/me
 * Protected by JWT auth
 * Returns the reports submitted by the logged-in user
 */
router.get('/reports/me', authMiddleware, async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json(reports);
  } catch (err) {
    console.error('Error fetching user reports:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve reports.' });
  }
});

/**
 * GET /api/reports/:id
 * Public read used by the "Open in Web Dashboard" deep link in authority emails.
 * Deliberately unauthenticated, so the response is sanitized: the citizen's
 * account details and e-mail address are never exposed.
 */
router.get('/reports/:id', async (req, res) => {
  const { id } = req.params;
  if (!id || typeof id !== 'string' || id.length > 64) {
    return res.status(400).json({ error: 'Invalid report id.' });
  }

  try {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    return res.json({
      id: report.id,
      title: report.title,
      description: report.description,
      imageUrl: report.imageUrl,
      imageUploadFailed: report.imageUploadFailed,
      category: report.category,
      aiPriorityScore: report.aiPriorityScore,
      status: report.status,
      latitude: report.latitude,
      longitude: report.longitude,
      locationText: report.locationText,
      confidence: report.confidence,
      filterStatus: report.filterStatus,
      assignedAuthorityName: report.assignedAuthorityName,
      assignedAuthorityEmail: report.assignedAuthorityEmail,
      authorityNotified: report.authorityNotified,
      authorityNotifiedAt: report.authorityNotifiedAt,
      createdAt: report.createdAt,
    });
  } catch (err) {
    console.error('Error fetching report:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve report.' });
  }
});

module.exports = router;

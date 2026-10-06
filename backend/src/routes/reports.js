'use strict';

const express = require('express');
const multer = require('multer');
const { getDb } = require('../lib/firebase');
const authMiddleware = require('../middleware/auth');
const { uploadImage } = require('../services/cloudinary');
const { scorePriority, categorizeReport } = require('../services/ai');
const { sendAuthorityEmail } = require('../services/email');

const router = express.Router();

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

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
 * Category is now assigned automatically by the AI — no user input needed.
 */
router.post('/reports', authMiddleware, uploadMiddleware, async (req, res) => {
  const { title, description, locationText, latitude, longitude } = req.body || {};
  const db = getDb();

  if (!db) {
    return res.status(500).json({ error: 'Database service is temporarily unavailable.' });
  }

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
    // 3. Secure upload to Cloudinary if image is attached
    let imageUrl = null;
    if (req.file) {
      const safeFilename = `report-${Date.now()}.${req.file.mimetype.split('/')[1] || 'jpg'}`;
      imageUrl = await uploadImage(req.file.buffer, safeFilename);
    }

    // 4. AI auto-categorise the complaint
    const aiCategory = await categorizeReport(title.trim(), description.trim());

    // 5. AI Priority score
    const aiPriorityScore = await scorePriority(
      aiCategory,
      description.trim(),
      lat,
      lng
    );

    // 6. Save report in Firestore
    const reportData = {
      title: title.trim(),
      description: description.trim(),
      category: aiCategory,
      locationText: (locationText || '').trim() || null,
      latitude: lat,
      longitude: lng,
      imageUrl,
      aiPriorityScore,
      status: 'PENDING',
      userId: req.user.id,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('reports').add(reportData);
    const report = { id: docRef.id, ...reportData };

    // 7. Authority notification email (non-blocking)
    try {
      const authSnapshot = await db.collection('authorities').limit(1).get();
      if (!authSnapshot.empty) {
        const authority = authSnapshot.docs[0].data();
        const userDoc = await db.collection('users').doc(req.user.id).get();
        const citizen = userDoc.exists
          ? userDoc.data()
          : { name: 'Citizen', email: req.user.email };
        await sendAuthorityEmail(authority, report, citizen);
      }
    } catch (emailErr) {
      console.warn('Authority email notification skipped:', emailErr.message);
    }

    return res.status(201).json({ report });
  } catch (err) {
    console.error('Error creating report:', err.message);
    return res.status(500).json({ error: 'Unable to process report. Please try again.' });
  }
});

/**
 * GET /api/reports/me
 * Protected by JWT auth
 * Returns the reports submitted by the logged-in user
 */
router.get('/reports/me', authMiddleware, async (req, res) => {
  const db = getDb();
  if (!db) {
    return res.status(500).json({ error: 'Database service is temporarily unavailable.' });
  }

  try {
    const snapshot = await db
      .collection('reports')
      .where('userId', '==', req.user.id)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const reports = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json(reports);
  } catch (err) {
    console.error('Error fetching user reports:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve reports.' });
  }
});

module.exports = router;

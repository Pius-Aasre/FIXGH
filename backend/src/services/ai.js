const axios = require('axios');

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Auto-categorise a complaint using the AI service.
 * Returns the category string, falling back to 'Other' on error.
 */
async function categorizeReport(title, description) {
  try {
    const res = await axios.post(`${AI_URL}/v1/categorize`, { title, description });
    return res.data.category || 'Other';
  } catch {
    // Simple keyword fallback if AI service is unreachable
    const text = `${title} ${description}`.toLowerCase();
    if (text.match(/pot\s*hole|pot\s*whole|crater|road\s*damage|bad\s*road|damaged\s*road|broken\s*road|asphalt/)) return 'Pothole';
    if (text.match(/drain|gutter|choked|flood|sewer|clogged|stagnant/)) return 'Blocked Drain';
    if (text.match(/pipe|burst|leak|water\s*main|water\s*leak|gwcl/)) return 'Burst Pipe';
    if (text.match(/street\s*light|street\s*ligt|lamp|darkness|blackout|dumsor/)) return 'Streetlight Out';
    if (text.match(/garbage|rubbish|trash|litter|dump|refuse|filth/)) return 'Garbage / Dumping';
    if (text.match(/traffic\s*light|traffic\s*signal|signal|semaphore/)) return 'Traffic Signal';
    if (text.match(/bridge|culvert|overpass|underpass/)) return 'Bridge / Culvert';
    if (text.match(/road\s*marking|zebra\s*crossing|lane\s*marking/)) return 'Road Marking';
    return 'Other';
  }
}

/**
 * Score the priority of an infrastructure report using the AI service.
 * Returns 'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW'.
 * Falls back to 'MEDIUM' on any error.
 */
async function scorePriority(category, description, latitude, longitude) {
  try {
    const res = await axios.post(`${AI_URL}/v1/score-priority`, {
      category,
      description,
      latitude,
      longitude,
    });
    return res.data.priority_score || 'MEDIUM';
  } catch {
    return 'MEDIUM';
  }
}

/**
 * Analyse an image by its URL via the AI service.
 */
async function analyzeImage(imageUrl) {
  try {
    const res = await axios.post(`${AI_URL}/v1/score-priority`, {
      description: 'image analysis',
      category: null,
    });
    return res.data;
  } catch {
    return { priority_score: 'MEDIUM' };
  }
}

module.exports = { analyzeImage, scorePriority, categorizeReport };

'use strict';

const axios = require('axios');
const { AUTHORITIES, AUTHORITIES_BY_ID } = require('../constants/authorities');
const { normalise, phraseMatches, determinePriority } = require('./classification-rules');

const AI_URL = process.env.AI_SERVICE_URL;
if (!AI_URL) {
  console.warn('[AI SERVICE] AI_SERVICE_URL is not set. Remote AI classification will be unavailable; local fallback will be used.');
}

/**
 * Local spam/gibberish filter fallback
 */
function localFilterSpam(title, description) {
  const text = `${title || ''} ${description || ''}`.trim();
  if (text.length < 10) {
    return { isValid: false, reason: 'Complaint text too short (minimum 10 characters required).' };
  }
  if (/(.)\1{5,}/.test(text)) {
    return { isValid: false, reason: 'Repetitive character sequence detected (Spam Filter).' };
  }
  const testPhrases = ['test', 'testing', 'asdf', 'hello world', 'sample', 'qwerty'];
  if (testPhrases.includes(text.toLowerCase())) {
    return { isValid: false, reason: 'Test submission filtered out.' };
  }
  return { isValid: true, reason: null };
}

/**
 * Local rule-based classification among all 40 Ghanaian authorities.
 *
 * Keyword evidence is primary; location evidence only breaks ties. Matching a
 * generic city name (e.g. "Accra") must not outrank an explicit domain
 * keyword, otherwise every report filed in Accra is routed to the Accra
 * Metropolitan Assembly instead of the responsible agency.
 */
function localClassifyAuthority(title, description, locationText = '') {
  const clean = normalise(`${title || ''} ${description || ''} ${locationText || ''}`);

  const keywordScores = {};
  const locationScores = {};

  for (const auth of AUTHORITIES) {
    let keywordScore = 0;
    let locationScore = 0;

    // Check authority name match
    if (phraseMatches(clean, auth.name)) {
      keywordScore += 15;
    }

    // Check local municipal boundaries (e.g. Accra, Sowutuom, Lapaz)
    if (auth.locations) {
      for (const loc of auth.locations) {
        if (phraseMatches(clean, loc)) {
          locationScore += 8;
        }
      }
    }

    // Check keywords
    for (const kw of auth.keywords) {
      if (phraseMatches(clean, kw)) {
        keywordScore += kw.includes(' ') ? 4 : 2;
      }
    }

    if (keywordScore > 0) keywordScores[auth.id] = keywordScore;
    if (locationScore > 0) locationScores[auth.id] = locationScore;
  }

  let bestAuth = null;

  if (Object.keys(keywordScores).length > 0) {
    const topScore = Math.max(...Object.values(keywordScores));
    const tied = Object.keys(keywordScores).filter((id) => keywordScores[id] === topScore);

    // Location only decides between equally-scored authorities
    const bestId = tied.reduce((best, id) =>
      (locationScores[id] || 0) > (locationScores[best] || 0) ? id : best
    );

    bestAuth = AUTHORITIES.find((a) => a.id === bestId) || null;
  } else if (Object.keys(locationScores).length > 0) {
    const topScore = Math.max(...Object.values(locationScores));
    const bestId = Object.keys(locationScores).find((id) => locationScores[id] === topScore);
    bestAuth = AUTHORITIES.find((a) => a.id === bestId) || null;
  }

  // Fallbacks if no specific keywords matched
  if (!bestAuth) {
    if (/(road|street|pothole|gutter|drain|traffic)/i.test(clean)) {
      bestAuth = AUTHORITIES.find((a) => a.id === '12') || AUTHORITIES[0]; // Dept of Urban Roads
    } else {
      bestAuth = AUTHORITIES.find((a) => a.id === '14') || AUTHORITIES[0]; // Accra Metro Assembly
    }
  }

  return bestAuth;
}

/**
 * Priority determination (title + description).
 */
function localDeterminePriority(category, title, description) {
  return determinePriority(category, title, description);
}

/**
 * AI Classify, Filter, and Route complaint to one of the 40 public authorities
 */
async function classifyAndRoute(title, description, locationText = '') {
  // Try remote AI service first (only when the binding is available)
  if (AI_URL) {
    try {
      const res = await axios.post(`${AI_URL}/v1/classify-and-route`, {
        title,
        description,
        location_text: locationText,
      }, { timeout: 3500 });

      if (res.data) {
        return {
          isValid: res.data.is_valid,
          filterReason: res.data.filter_reason,
          authority: res.data.authority ? AUTHORITIES_BY_ID[res.data.authority.id] || res.data.authority : null,
          category: res.data.category || 'General Civic Grievance',
          priority: res.data.priority || 'MEDIUM',
          confidence: res.data.confidence || 0.8,
        };
      }
    } catch (err) {
      // Graceful fallback to local AI engine — but say so, otherwise a
      // permanently broken AI service is invisible to operators.
      console.warn(
        `[AI SERVICE] ${AI_URL} unreachable (${err.message || err.code || 'unknown error'}) — using local fallback classifier.`
      );
    }
  }

  // Local fallback
  const filter = localFilterSpam(title, description);
  if (!filter.isValid) {
    return {
      isValid: false,
      filterReason: filter.reason,
      authority: null,
      category: 'Filtered / Spam',
      priority: 'LOW',
      confidence: 0.0,
    };
  }

  const matchedAuth = localClassifyAuthority(title, description, locationText);
  const priority = localDeterminePriority(matchedAuth.category, title, description);

  return {
    isValid: true,
    filterReason: null,
    authority: matchedAuth,
    category: matchedAuth.category,
    priority,
    confidence: 0.85,
  };
}

/**
 * Legacy wrapper for backward compatibility
 */
async function categorizeReport(title, description) {
  const result = await classifyAndRoute(title, description);
  return result.category || 'Other';
}

/**
 * Legacy wrapper for priority scoring
 */
async function scorePriority(category, title, description) {
  return localDeterminePriority(category, title, description);
}

/**
 * Generate monthly AI summary for a specific authority
 */
async function generateMonthlyDigestSummary(authority, monthLabel, complaints = []) {
  if (AI_URL) {
    try {
      const payload = {
        authority_name: authority.name,
        authority_email: authority.email,
        month_label: monthLabel,
        complaints: complaints.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          category: c.category,
          location_text: c.locationText,
          priority: c.aiPriorityScore,
          created_at: c.createdAt,
        })),
      };

      const res = await axios.post(`${AI_URL}/v1/generate-monthly-digest`, payload, { timeout: 5000 });
      if (res.data && res.data.executive_summary) {
        return {
          executiveSummary: res.data.executive_summary,
          criticalHighlights: res.data.critical_highlights || [],
          hotspots: res.data.hotspots || [],
          urgencyBreakdown: res.data.urgency_breakdown || {},
        };
      }
    } catch (err) {
      // Fallback to local synthesis
      console.warn(
        `[AI SERVICE] Monthly digest summary generation failed (${err.message || 'unknown error'}) — using local synthesis.`
      );
    }
  }

  const emergencies = complaints.filter((c) => c.aiPriorityScore === 'EMERGENCY');
  const highs = complaints.filter((c) => c.aiPriorityScore === 'HIGH');
  const mediums = complaints.filter((c) => c.aiPriorityScore === 'MEDIUM');
  const lows = complaints.filter((c) => c.aiPriorityScore === 'LOW');

  const locs = complaints.map((c) => c.locationText).filter(Boolean);
  const uniqueLocs = [...new Set(locs)].slice(0, 5);

  const executiveSummary = complaints.length === 0
    ? `No citizen grievances were registered under ${authority.name}'s jurisdiction during ${monthLabel}.`
    : `During ${monthLabel}, FixGH AI processed and organized ${complaints.length} verified citizen reports for ${authority.name}. ` +
      `A total of ${emergencies.length + highs.length} reports represent high-priority or urgent civic issues. ` +
      `Incident concentration was observed around: ${uniqueLocs.join(', ') || 'Metropolitan areas'}.`;

  const criticalHighlights = [...emergencies, ...highs].slice(0, 5).map((c) =>
    `[${c.aiPriorityScore || 'HIGH'}] ${c.title} — ${c.locationText || 'Location logged via GPS'}`
  );

  return {
    executiveSummary,
    criticalHighlights,
    hotspots: uniqueLocs,
    urgencyBreakdown: {
      EMERGENCY: emergencies.length,
      HIGH: highs.length,
      MEDIUM: mediums.length,
      LOW: lows.length,
    },
  };
}

module.exports = {
  classifyAndRoute,
  categorizeReport,
  scorePriority,
  generateMonthlyDigestSummary,
  // Exposed for the classifier parity check (scripts/check-classifier-sync.js).
  // These are the exact functions used by the offline fallback path.
  localFilterSpam,
  localClassifyAuthority,
  localDeterminePriority,
};

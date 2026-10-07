'use strict';

const axios = require('axios');
const { AUTHORITIES, AUTHORITIES_BY_ID } = require('../constants/authorities');

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

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
 * Local rule-based classification among all 40 Ghanaian authorities
 */
function localClassifyAuthority(title, description, locationText = '') {
  const clean = `${title || ''} ${description || ''} ${locationText || ''}`.toLowerCase().replace(/[^\w\s]/g, ' ');

  let bestAuth = null;
  let highestScore = 0;

  for (const auth of AUTHORITIES) {
    let score = 0;

    // Check authority name match
    if (clean.includes(auth.name.toLowerCase())) {
      score += 15;
    }

    // Check local municipal boundaries (e.g. Accra, Sowutuom, Lapaz)
    if (auth.locations) {
      for (const loc of auth.locations) {
        if (clean.includes(loc.toLowerCase())) {
          score += 8;
        }
      }
    }

    // Check keywords
    for (const kw of auth.keywords) {
      if (clean.includes(kw.toLowerCase())) {
        score += kw.includes(' ') ? 4 : 2;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestAuth = auth;
    }
  }

  // Fallbacks if no specific keywords matched
  if (!bestAuth || highestScore === 0) {
    if (/(road|street|pothole|gutter|drain|traffic)/i.test(clean)) {
      bestAuth = AUTHORITIES.find((a) => a.id === '12') || AUTHORITIES[0]; // Dept of Urban Roads
    } else {
      bestAuth = AUTHORITIES.find((a) => a.id === '14') || AUTHORITIES[0]; // Accra Metro Assembly
    }
  }

  return bestAuth;
}

/**
 * Priority determination
 */
function localDeterminePriority(category, description) {
  const desc = (description || '').toLowerCase();
  if (/(emergency|collapse|explosion|casualty|unconscious|dying|armed robber|fatal|live wire|active fire)/i.test(desc)) {
    return 'EMERGENCY';
  }
  if (/(hazard|flooding|blackout|transformer|burst main|contamination|expired medicine|open manhole|urgent)/i.test(desc)) {
    return 'HIGH';
  }
  if (/(unpaid|delay|pothole|choked|leak|faded|bad network)/i.test(desc)) {
    return 'MEDIUM';
  }
  return 'LOW';
}

/**
 * AI Classify, Filter, and Route complaint to one of the 40 public authorities
 */
async function classifyAndRoute(title, description, locationText = '') {
  // Try remote AI service first
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
  } catch {
    // Graceful fallback to local AI engine
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
  const priority = localDeterminePriority(matchedAuth.category, description);

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
async function scorePriority(category, description) {
  return localDeterminePriority(category, description);
}

/**
 * Generate monthly AI summary for a specific authority
 */
async function generateMonthlyDigestSummary(authority, monthLabel, complaints = []) {
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
  } catch {
    // Fallback to local synthesis
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
};

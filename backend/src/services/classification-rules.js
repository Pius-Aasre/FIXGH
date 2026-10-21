'use strict';

/**
 * Shared rule-based classification helpers.
 *
 * These MUST stay in sync with `ai-service/main.py` — the Python service is
 * the primary classifier and this module is the offline fallback used when the
 * service is unreachable. Divergence between the two means a report is routed
 * differently depending on whether the AI service happens to be up.
 */

/**
 * Normalise text for keyword matching:
 * lowercase, strip punctuation, collapse whitespace.
 */
function normalise(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Word-boundary aware phrase matcher that tolerates simple inflections.
 *
 * Plain `text.includes(phrase)` matches inside larger words ("gun" inside
 * "gunpoint") and misses inflections ("armed robber" vs "armed robbers").
 *
 * @param {string} text  already normalised text
 * @param {string} phrase  keyword phrase
 * @returns {boolean}
 */
function phraseMatches(text, phrase) {
  const words = String(phrase || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return false;

  const pattern = words
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:s|es|ed|d|ing)?')
    .join('\\s+');

  return new RegExp(`\\b${pattern}\\b`).test(text);
}

/**
 * Priority keyword tiers. Ordered from most to least urgent.
 */
const PRIORITY_KEYWORDS = {
  EMERGENCY: [
    'emergency',
    'collapse',
    'gas explosion',
    'explosion',
    'casualty',
    'unconscious',
    'dying',
    'armed robbery',
    'armed robber',
    'gunpoint',
    'fatal',
    'toxic spill',
    'electrocution',
    'active fire',
  ],
  HIGH: [
    'hazard',
    'deep crater',
    'flooding',
    'blackout',
    'live wire',
    'transformer',
    'burst main',
    'contamination',
    'expired medication',
    'expired medicine',
    'open manhole',
    'urgent',
  ],
  MEDIUM: ['unpaid', 'delay', 'pothole', 'choked', 'leak', 'faded', 'bad network'],
};

/**
 * Determine priority from the report title and description.
 *
 * The title MUST be scanned too — emergency keywords are frequently present
 * only in the headline ("Armed robbery near Circle Overpass").
 */
function determinePriority(category, title, description) {
  const text = normalise(`${title || ''} ${description || ''}`);

  for (const tier of ['EMERGENCY', 'HIGH', 'MEDIUM']) {
    for (const keyword of PRIORITY_KEYWORDS[tier]) {
      if (phraseMatches(text, keyword)) {
        return tier;
      }
    }
  }

  return 'LOW';
}

module.exports = {
  normalise,
  phraseMatches,
  determinePriority,
  PRIORITY_KEYWORDS,
};

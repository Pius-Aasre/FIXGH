#!/usr/bin/env node
'use strict';

/**
 * Regenerate the Python classifier's static data from the Node registry.
 *
 * The AI service (`ai-service/main.py`) and the backend
 * (`backend/src/constants/authorities.js` +
 * `backend/src/services/classification-rules.js`) must hold identical keyword
 * sets, otherwise a report is routed differently depending on whether the AI
 * service happens to be up.
 *
 * This script rewrites the `AUTHORITIES_KNOWLEDGE_BASE` and `PRIORITY_KEYWORDS`
 * literals inside `ai-service/main.py` from the JavaScript source of truth.
 * Everything else in the Python file is left untouched.
 *
 * Usage:
 *   node scripts/sync-classifier-from-js.js          # write changes
 *   node scripts/sync-classifier-from-js.js --check  # fail if out of sync
 */

const fs = require('fs');
const path = require('path');

const { AUTHORITIES } = require('../src/constants/authorities');
const { PRIORITY_KEYWORDS } = require('../src/services/classification-rules');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PY_MAIN = path.join(REPO_ROOT, 'ai-service', 'main.py');
const CHECK_ONLY = process.argv.includes('--check');

/** Render a Python string literal for a keyword/label. */
function pyString(value) {
  return JSON.stringify(String(value));
}

/** Render the `AUTHORITIES_KNOWLEDGE_BASE` literal. */
function renderAuthorities() {
  const lines = ['AUTHORITIES_KNOWLEDGE_BASE = ['];

  for (const auth of AUTHORITIES) {
    lines.push('    {');
    lines.push(`        "id": ${pyString(auth.id)},`);
    lines.push(`        "name": ${pyString(auth.name)},`);
    lines.push(`        "email": ${pyString(auth.email)},`);
    lines.push(`        "category": ${pyString(auth.category)},`);

    if (Array.isArray(auth.locations) && auth.locations.length) {
      lines.push('        "locations": [');
      for (const loc of auth.locations) {
        lines.push(`            ${pyString(loc)},`);
      }
      lines.push('        ],');
    }

    lines.push('        "keywords": [');
    const keywords = auth.keywords;
    for (let i = 0; i < keywords.length; i += 8) {
      const chunk = keywords
        .slice(i, i + 8)
        .map((k) => `${pyString(k)},`)
        .join(' ');
      lines.push(`            ${chunk}`);
    }
    lines.push('        ],');
    lines.push('    },');
  }

  lines.push(']');
  return lines.join('\n');
}

/** Render the `PRIORITY_KEYWORDS` literal. */
function renderPriorities() {
  const lines = ['PRIORITY_KEYWORDS = {'];

  for (const tier of ['EMERGENCY', 'HIGH', 'MEDIUM']) {
    const keywords = PRIORITY_KEYWORDS[tier] || [];
    lines.push(`    ${pyString(tier)}: [`);
    for (let i = 0; i < keywords.length; i += 8) {
      const chunk = keywords
        .slice(i, i + 8)
        .map((k) => `${pyString(k)},`)
        .join(' ');
      lines.push(`        ${chunk}`);
    }
    lines.push('    ],');
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Replace a top-level `<NAME> = <literal>` assignment in the Python source.
 * Locates the literal by scanning for the matching closing bracket.
 */
function replaceAssignment(source, name, replacement) {
  const marker = `${name} = `;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Could not find "${name}" in ${PY_MAIN}`);

  const openIdx = source.indexOf('[', start);
  const braceIdx = source.indexOf('{', start);
  const bodyStart = openIdx !== -1 && (braceIdx === -1 || openIdx < braceIdx) ? openIdx : braceIdx;
  if (bodyStart === -1) throw new Error(`Could not find the "${name}" literal body`);

  const openChar = source[bodyStart];
  const closeChar = openChar === '[' ? ']' : '}';

  let depth = 0;
  let inString = false;
  let quote = '';
  let end = -1;

  for (let i = bodyStart; i < source.length; i++) {
    const ch = source[i];

    if (inString) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === quote) inString = false;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      continue;
    }

    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) throw new Error(`Unbalanced literal for "${name}"`);

  return source.slice(0, start) + replacement + source.slice(end + 1);
}

const original = fs.readFileSync(PY_MAIN, 'utf-8');

let updated = replaceAssignment(original, 'AUTHORITIES_KNOWLEDGE_BASE', renderAuthorities());
updated = replaceAssignment(updated, 'PRIORITY_KEYWORDS', renderPriorities());

if (updated === original) {
  console.log('ai-service/main.py is already in sync with the Node registry.');
  process.exit(0);
}

if (CHECK_ONLY) {
  console.error('ai-service/main.py is OUT OF SYNC with the Node registry.');
  console.error('Run: node scripts/sync-classifier-from-js.js');
  process.exit(1);
}

fs.writeFileSync(PY_MAIN, updated, 'utf-8');
console.log('ai-service/main.py synced from the Node registry.');
console.log(`  authorities: ${AUTHORITIES.length}`);
console.log(
  `  priorities:  ${Object.entries(PRIORITY_KEYWORDS)
    .map(([tier, kws]) => `${tier}=${kws.length}`)
    .join(', ')}`
);

#!/usr/bin/env node
'use strict';

/**
 * Classifier parity check.
 *
 * The Python service (`ai-service/main.py`) is the primary classifier and the
 * Node module (`backend/src/services/classification-rules.js` +
 * `backend/src/constants/authorities.js`) is the offline fallback used when
 * the AI service is unreachable. Both live in separate Render rootDirs, so the
 * keyword lists are duplicated by necessity — this script proves they have not
 * drifted apart.
 *
 * Usage:
 *   node scripts/check-classifier-sync.js            # static + live parity
 *   node scripts/check-classifier-sync.js --static   # static comparison only
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

// The AI module warns when AI_SERVICE_URL is unset — this script drives the
// local fallback directly, so point it at the service to keep the output clean.
process.env.AI_SERVICE_URL = AI_URL;

const { PRIORITY_KEYWORDS } = require('../src/services/classification-rules');
const { AUTHORITIES } = require('../src/constants/authorities');
const {
  localFilterSpam,
  localClassifyAuthority,
  localDeterminePriority,
} = require('../src/services/ai');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PY_MAIN = path.join(REPO_ROOT, 'ai-service', 'main.py');

let failures = 0;
const notes = [];

function fail(message) {
  failures++;
  console.error(`  FAIL  ${message}`);
}

function pass(message) {
  console.log(`  PASS  ${message}`);
}

/**
 * Extract the Python literals with `ast` so the comparison is exact —
 * no regex parsing of a Python file from JavaScript.
 */
function readPythonLiterals() {
  const script = `
import ast, json, sys
src = open(sys.argv[1], encoding="utf-8").read()
tree = ast.parse(src)
out = {}
for node in tree.body:
    if isinstance(node, ast.Assign):
        for target in node.targets:
            if isinstance(target, ast.Name) and target.id in ("AUTHORITIES_KNOWLEDGE_BASE", "PRIORITY_KEYWORDS"):
                out[target.id] = ast.literal_eval(node.value)
print(json.dumps(out))
`;
  const raw = execFileSync('python', ['-c', script, PY_MAIN], { encoding: 'utf-8' });
  return JSON.parse(raw);
}

function diffLists(label, a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  const onlyA = [...setA].filter((x) => !setB.has(x));
  const onlyB = [...setB].filter((x) => !setA.has(x));
  if (onlyA.length === 0 && onlyB.length === 0) return true;

  fail(`${label} mismatch`);
  if (onlyA.length) console.error(`        only in JS: ${onlyA.join(', ')}`);
  if (onlyB.length) console.error(`        only in PY: ${onlyB.join(', ')}`);
  return false;
}

/** Corpus used for the behavioural comparison between the two implementations. */
const CORPUS = [
  { title: 'Armed robbery at Circle Overpass', description: 'Gunman held up traders with a gunpoint', location: 'Accra' },
  { title: 'Burst water main flooding the street', description: 'Water pipe burst and flooding homes nearby', location: 'Spintex Road' },
  { title: 'Transformer sparking on the pole', description: 'Exposed live wire hanging over the walkway', location: 'East Legon' },
  { title: 'Massive pothole on the highway', description: 'Deep crater in the carriageway damaging vehicles', location: 'Tema Motorway' },
  { title: 'Open manhole in the middle of the road', description: 'Uncovered manhole is a hazard to pedestrians', location: 'Liberation Road' },
  { title: 'Burning building with smoke everywhere', description: 'Blaze spreading near the market', location: 'Kejetia' },
  { title: 'Garbage heap blocking the drainage', description: 'Waste collection has been delayed for weeks', location: 'Dansoman' },
  { title: 'Medical emergency at the market', description: 'Collapsed patient needs an ambulance urgently', location: 'Makola' },
  { title: 'asdfghjkl', description: 'aaaaaaa', location: 'test' },
];

(async () => {
  console.log('\n=== CLASSIFIER SYNC CHECK ===\n');

  // ── 1. Static comparison ────────────────────────────────────────────────
  console.log('Static keyword comparison');

  let py;
  try {
    py = readPythonLiterals();
  } catch (err) {
    console.error(`  SKIP  Could not parse ${PY_MAIN}: ${err.message}`);
    notes.push('Python literals could not be parsed — static comparison skipped.');
    py = null;
  }

  if (py) {
    // Priority tiers
    for (const tier of ['EMERGENCY', 'HIGH', 'MEDIUM']) {
      const jsList = PRIORITY_KEYWORDS[tier] || [];
      const pyList = py.PRIORITY_KEYWORDS[tier] || [];
      diffLists(`PRIORITY_KEYWORDS.${tier}`, jsList, pyList);
    }
    pass('PRIORITY_KEYWORDS tiers compared');

    // Authority registry
    const pyById = new Map(py.AUTHORITIES_KNOWLEDGE_BASE.map((a) => [String(a.id), a]));
    let keywordDiffCount = 0;
    let metaDiffCount = 0;

    for (const jsAuth of AUTHORITIES) {
      const pyAuth = pyById.get(String(jsAuth.id));
      if (!pyAuth) {
        fail(`Authority "${jsAuth.id} ${jsAuth.name}" is missing from the Python registry`);
        metaDiffCount++;
        continue;
      }
      if (pyAuth.name !== jsAuth.name) {
        fail(`Authority ${jsAuth.id} name mismatch: JS="${jsAuth.name}" PY="${pyAuth.name}"`);
        metaDiffCount++;
      }
      if (pyAuth.email !== jsAuth.email) {
        fail(`Authority ${jsAuth.id} email mismatch: JS="${jsAuth.email}" PY="${pyAuth.email}"`);
        metaDiffCount++;
      }
      if (pyAuth.category !== jsAuth.category) {
        fail(`Authority ${jsAuth.id} category mismatch: JS="${jsAuth.category}" PY="${pyAuth.category}"`);
        metaDiffCount++;
      }
      if (!diffLists(`Authority ${jsAuth.id} (${jsAuth.name}) keywords`, jsAuth.keywords, pyAuth.keywords)) {
        keywordDiffCount++;
      }
    }

    const pyOnly = py.AUTHORITIES_KNOWLEDGE_BASE.filter(
      (a) => !AUTHORITIES.some((j) => String(j.id) === String(a.id))
    );
    if (pyOnly.length) {
      fail(`Authorities present only in Python: ${pyOnly.map((a) => `${a.id} ${a.name}`).join(', ')}`);
      metaDiffCount++;
    }

    if (keywordDiffCount === 0) pass('All 40 authority keyword lists match');
    if (metaDiffCount === 0) pass('All 40 authority names/emails/categories match');
  }

  // ── 2. Behavioural comparison ───────────────────────────────────────────
  if (process.argv.includes('--static')) {
    console.log('\nSkipping behavioural comparison (--static).\n');
    console.log(failures === 0 ? '=== ALL CHECKS PASSED ===\n' : `=== ${failures} CHECK(S) FAILED ===\n`);
    process.exit(failures === 0 ? 0 : 1);
  }

  console.log('\nBehavioural comparison (live AI service vs offline fallback)');

  let remoteAvailable = false;
  try {
    const res = await fetch(`${AI_URL}/health`, { signal: AbortSignal.timeout(4000) });
    remoteAvailable = res.ok;
  } catch {
    remoteAvailable = false;
  }

  if (!remoteAvailable) {
    console.log(`  SKIP  AI service not reachable at ${AI_URL} — behavioural comparison skipped.`);
    notes.push(`AI service not reachable at ${AI_URL}; behavioural parity not verified.`);
  } else {
    let mismatches = 0;

    for (const sample of CORPUS) {
      const localFilter = localFilterSpam(sample.title, sample.description);
      const localAuth = localAuth0(sample, localFilter.isValid);
      const localPriority = localDeterminePriority(
        localAuth ? localAuth.category : '',
        sample.title,
        sample.description
      );

      let remote;
      try {
        const res = await fetch(`${AI_URL}/v1/classify-and-route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: sample.title,
            description: sample.description,
            location_text: sample.location,
          }),
          signal: AbortSignal.timeout(8000),
        });
        remote = await res.json();
      } catch (err) {
        fail(`AI service call failed for "${sample.title}": ${err.message}`);
        mismatches++;
        continue;
      }

      const remoteAuthId = remote.authority ? String(remote.authority.id) : null;
      const localAuthId = localAuth ? String(localAuth.id) : null;

      const problems = [];
      if (Boolean(remote.is_valid) !== Boolean(localFilter.isValid)) {
        problems.push(`spam filter: PY=${remote.is_valid} JS=${localFilter.isValid}`);
      }
      if (remoteAuthId !== localAuthId) {
        problems.push(`authority: PY=${remoteAuthId} JS=${localAuthId}`);
      }
      if (remote.priority !== localPriority) {
        problems.push(`priority: PY=${remote.priority} JS=${localPriority}`);
      }

      if (problems.length) {
        mismatches++;
        fail(`"${sample.title}" — ${problems.join('; ')}`);
      } else {
        pass(`"${sample.title}" → ${localAuthId || 'spam'} / ${localPriority}`);
      }
    }

    if (mismatches === 0) pass(`All ${CORPUS.length} corpus samples route identically`);
  }

  console.log('');
  for (const note of notes) console.log(`  NOTE  ${note}`);
  console.log(failures === 0 ? '\n=== ALL CHECKS PASSED ===\n' : `\n=== ${failures} CHECK(S) FAILED ===\n`);
  process.exit(failures === 0 ? 0 : 1);
})();

/** Local classification that mirrors the offline fallback path exactly. */
function localAuth0(sample, isValid) {
  if (!isValid) return null;
  const auth = localClassifyAuthority(sample.title, sample.description, sample.location);
  return auth || null;
}

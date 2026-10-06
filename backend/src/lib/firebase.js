'use strict';

const fs = require('fs');
const path = require('path');

let db = null;

/**
 * Lightweight local development store that mimics Firestore's API
 * when Google Cloud credentials are not yet configured.
 * Data is safely persisted to backend/data/local-db.json.
 */
function createLocalStore() {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbFile = path.join(dataDir, 'local-db.json');

  function readDb() {
    if (!fs.existsSync(dbFile)) return {};
    try {
      return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    } catch {
      return {};
    }
  }

  function writeDb(data) {
    try {
      fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('[local-db] Failed to write to disk:', e.message);
    }
  }

  return {
    isLocal: true,
    collection(colName) {
      return {
        async add(docData) {
          const dbData = readDb();
          if (!dbData[colName]) dbData[colName] = {};
          const id = 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
          dbData[colName][id] = { ...docData, id };
          writeDb(dbData);
          return { id };
        },
        doc(id) {
          return {
            async get() {
              const dbData = readDb();
              const item = dbData[colName]?.[id];
              return {
                exists: !!item,
                id,
                data: () => (item ? { ...item } : null),
              };
            },
            async set(docData, options = {}) {
              const dbData = readDb();
              if (!dbData[colName]) dbData[colName] = {};
              const existing = dbData[colName][id] || {};
              dbData[colName][id] = options.merge
                ? { ...existing, ...docData, id }
                : { ...docData, id };
              writeDb(dbData);
              return { id };
            },
          };
        },
        where(field, op, val) {
          return this._buildQuery([{ field, op, val }], null, null);
        },
        orderBy(field, dir = 'asc') {
          return this._buildQuery([], { field, dir }, null);
        },
        limit(count) {
          return this._buildQuery([], null, count);
        },
        async get() {
          return this._buildQuery([], null, null).get();
        },
        _buildQuery(filters = [], order = null, limitCount = null) {
          const self = this;
          return {
            where(field, op, val) {
              return self._buildQuery([...filters, { field, op, val }], order, limitCount);
            },
            orderBy(field, dir = 'asc') {
              return self._buildQuery(filters, { field, dir }, limitCount);
            },
            limit(count) {
              return self._buildQuery(filters, order, count);
            },
            async get() {
              const dbData = readDb();
              let items = Object.values(dbData[colName] || {});
              for (const f of filters) {
                if (f.op === '==') {
                  items = items.filter((i) => i[f.field] === f.val);
                }
              }
              if (order) {
                items.sort((a, b) => {
                  const valA = a[order.field] ?? '';
                  const valB = b[order.field] ?? '';
                  if (order.dir === 'desc') return valB > valA ? 1 : -1;
                  return valA > valB ? 1 : -1;
                });
              }
              if (limitCount && typeof limitCount === 'number') {
                items = items.slice(0, limitCount);
              }
              return {
                empty: items.length === 0,
                docs: items.map((item) => ({
                  id: item.id,
                  data: () => ({ ...item }),
                })),
              };
            },
          };
        },
      };
    },
  };
}

function initFirebase() {
  let adminApp = null;
  let cert = null;
  let getApps = null;
  let initializeApp = null;
  let getFirestore = null;

  try {
    const appModule = require('firebase-admin/app');
    const firestoreModule = require('firebase-admin/firestore');
    getApps = appModule.getApps;
    initializeApp = appModule.initializeApp;
    cert = appModule.cert;
    getFirestore = firestoreModule.getFirestore;
  } catch (err) {
    console.warn('[firebase] firebase-admin package not found. Using local JSON store.');
    return createLocalStore();
  }

  const apps = getApps();
  if (apps.length > 0) {
    db = getFirestore();
    return db;
  }

  // 1. Check for serviceAccountKey.json
  const localKeyPaths = [
    path.join(__dirname, '../../serviceAccountKey.json'),
    path.join(__dirname, '../config/serviceAccountKey.json'),
    path.join(process.cwd(), 'serviceAccountKey.json'),
  ];

  for (const keyPath of localKeyPaths) {
    if (fs.existsSync(keyPath)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        initializeApp({
          credential: cert(serviceAccount),
        });
        console.log(`[firebase] Connected to Google Cloud Firestore via: ${path.basename(keyPath)}`);
        db = getFirestore();
        return db;
      } catch (e) {
        console.warn(`[firebase] Found ${keyPath} but failed to parse:`, e.message);
      }
    }
  }

  // 2. Check for individual environment variables in .env
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
      console.log(`[firebase] Connected to Google Cloud Firestore via .env (Project: ${process.env.FIREBASE_PROJECT_ID})`);
      db = getFirestore();
      return db;
    } catch (e) {
      console.error('[firebase] Failed to initialize from .env variables:', e.message);
    }
  }

  // 3. Check for single JSON string in FIREBASE_SERVICE_ACCOUNT
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log('[firebase] Connected to Google Cloud Firestore via FIREBASE_SERVICE_ACCOUNT JSON.');
      db = getFirestore();
      return db;
    } catch (e) {
      console.error('[firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', e.message);
    }
  }

  // 4. Default: No cloud credentials found yet. Use the local JSON development store!
  console.log('----------------------------------------------------------------------');
  console.log('[firebase] No serviceAccountKey.json or FIREBASE_* credentials detected.');
  console.log('[firebase] Using local development database (backend/data/local-db.json).');
  console.log('[firebase] All registrations, logins, and reports will work locally.');
  console.log('[firebase] To connect to Cloud Firestore, place serviceAccountKey.json in backend/');
  console.log('----------------------------------------------------------------------');

  db = createLocalStore();
  return db;
}

db = initFirebase();

module.exports = {
  getDb: () => db || initFirebase(),
};

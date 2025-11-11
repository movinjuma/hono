const {
  ASTRA_DB_ID,
  ASTRA_DB_REGION,
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_NAMESPACE = 'default_keyspace',
} = process.env;

const baseUrl = `https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com`;
const basePath = `${baseUrl}/api/rest/v2/namespaces/${ASTRA_DB_NAMESPACE}/collections`;

let setupError = null;
let setupPromise = null;
const collectionCache = new Map();

/**
 * Internal lazy initializer
 */
const ensureClientReady = async () => {
  if (setupError) throw setupError;
  if (setupPromise) return setupPromise;

  setupPromise = (async () => {
    if (!ASTRA_DB_ID || !ASTRA_DB_REGION || !ASTRA_DB_APPLICATION_TOKEN) {
      setupError = new Error('❌ Missing Astra DB credentials in environment.');
      return;
    }

    try {
      console.log('🔍 Verifying Astra DB connection...');
      const res = await fetch(basePath, {
        method: 'GET',
        headers: {
          'X-Cassandra-Token': ASTRA_DB_APPLICATION_TOKEN,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Unexpected status ${res.status}`);
      }

      console.log(`✅ Astra DB connection verified: ${res.status}`);
    } catch (err) {
      setupError = new Error(`❌ Astra DB setup failed: ${err.message || 'Unknown error'}`);
      console.error(setupError);
    }
  })();

  await setupPromise;
  if (setupError) throw setupError;
};

/**
 * Returns collection operations for a given name.
 * Ensures Astra client is ready before returning handlers.
 */
export const getCollection = async (collectionName) => {
  if (!collectionName) throw new Error('❌ Collection name must be provided.');
  await ensureClientReady();

  if (collectionCache.has(collectionName)) {
    return collectionCache.get(collectionName);
  }

  const collectionPath = `${basePath}/${collectionName}`;
  const headers = {
    'X-Cassandra-Token': ASTRA_DB_APPLICATION_TOKEN,
    'Content-Type': 'application/json',
  };

  const handlers = {
    get: async (docId) => fetch(`${collectionPath}/${docId}`, { method: 'GET', headers }).then(r => r.json()),
    post: async (data) => fetch(collectionPath, { method: 'POST', headers, body: JSON.stringify(data) }).then(r => r.json()),
    put: async (docId, data) => fetch(`${collectionPath}/${docId}`, { method: 'PUT', headers, body: JSON.stringify(data) }).then(r => r.json()),
    patch: async (docId, data) => fetch(`${collectionPath}/${docId}`, { method: 'PATCH', headers, body: JSON.stringify(data) }).then(r => r.json()),
    delete: async (docId) => fetch(`${collectionPath}/${docId}`, { method: 'DELETE', headers }).then(r => r.json()),
    find: async (query) => {
      const url = new URL(collectionPath);
      url.searchParams.append('where', JSON.stringify(query));
      return fetch(url.toString(), { method: 'GET', headers }).then(r => r.json());
    },
  };

  collectionCache.set(collectionName, handlers);
  return handlers;
};

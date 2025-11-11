import { getCollection } from '../../services/astra.js';

/**
 * GET /rooms
 * Fetches all rooms from the Astra DB "rooms" collection.
 */
export const getRooms = async (c) => {
  const timestamp = new Date().toISOString();
  const traceId = c.req.header('x-trace-id') || crypto.randomUUID();
  const start = Date.now();

  try {
    const roomsCollection = await getCollection('rooms');
    if (!roomsCollection?.find) {
      throw new Error('Collection "rooms" missing .find() method.');
    }

    const result = await roomsCollection.find({});
    const rooms = Object.values(result?.data || {});

    console.log(`✅ /rooms fetched ${rooms.length} items in ${Date.now() - start}ms`);
    return c.json({
      success: true,
      count: rooms.length,
      data: rooms,
      timestamp,
      traceId,
    });
  } catch (err) {
    const isConnectionError = err.message?.includes('Collection') || err.message?.includes('setup');
    const status = isConnectionError ? 503 : 500;
    const errorCode = isConnectionError ? 'DB_CONNECTION_FAILED' : 'DB_QUERY_FAILED';
    const message = isConnectionError ? 'Database connection failed.' : 'Failed to fetch rooms.';

    console.error(`❌ ${errorCode}:`, err.message || err);
    if (err.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(err.response.data, null, 2));
    }

    return c.json({
      success: false,
      error: errorCode,
      message,
      timestamp,
      traceId,
    }, status);
  }
};

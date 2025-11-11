import { getCollection } from '../../services/astra.js';

/**
 * POST /rooms/find
 * Dynamically filters rooms and properties based on frontend-provided criteria.
 * Supports search across both collections and merges results.
 */
const find = async (c) => {
  const timestamp = new Date().toISOString();
  let filters;

  try {
    filters = await c.req.json();
    if (!filters || typeof filters !== 'object') {
      throw new Error('Request body must be valid JSON.');
    }
  } catch (err) {
    console.error('❌ Filter parse error:', err.message || err);
    return c.json({
      success: false,
      error: 'INVALID_FILTERS',
      message: 'Request body must be valid JSON.',
      timestamp,
    }, 400);
  }

  let propertiesCol, roomsCol;
  try {
    [propertiesCol, roomsCol] = await Promise.all([
      getCollection('properties'),
      getCollection('rooms'),
    ]);
    console.log('📦 Connected to collections: properties, rooms');
  } catch (err) {
    console.error('❌ DB connection error:', err.message || err);
    return c.json({
      success: false,
      error: 'DB_CONNECTION_FAILED',
      message: 'Database connection failed.',
      timestamp,
    }, 503);
  }

  const propertyQuery = {};
  const roomQuery = {};

  // Property-level filters
  if (filters.location) propertyQuery.location = { $eq: filters.location };
  if (filters.exact_location) propertyQuery.exact_location = { $eq: filters.exact_location };
  if (filters.description) propertyQuery.description = { $contains: filters.description };
  if (filters.country) propertyQuery.country = { $eq: filters.country };
  if (filters.latitude) propertyQuery.latitude = { $eq: filters.latitude };
  if (filters.longitude) propertyQuery.longitude = { $eq: filters.longitude };
  if (filters.property_name) propertyQuery.title = { $contains: filters.property_name };

  // Room-level filters
  if (filters.currency) roomQuery.currency = { $eq: filters.currency };
  if (filters.amount) roomQuery.amount = { $lte: filters.amount };
  if (filters.period) roomQuery.period = { $eq: filters.period };
  if (filters.category) roomQuery.category = { $eq: filters.category };

  const linkByPropertyId = filters.linked === true;
  let matchedProperties = [];
  let matchedRooms = [];

  try {
    const [propertyResult, roomResult] = await Promise.all([
      propertiesCol.find(propertyQuery),
      roomsCol.find(roomQuery),
    ]);
    matchedProperties = Object.values(propertyResult?.data || {});
    matchedRooms = Object.values(roomResult?.data || {});
  } catch (queryErr) {
    console.error('❌ Query execution failed:', queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json({
      success: false,
      error: 'QUERY_FAILED',
      message: 'Failed to execute search queries.',
      timestamp,
    }, 500);
  }

  let enrichedRooms = matchedRooms;
  if (linkByPropertyId) {
    const propertyMap = Object.fromEntries(
      matchedProperties.map((p) => [p.property_id, p])
    );
    enrichedRooms = matchedRooms.map((room) => ({
      ...room,
      property: propertyMap[room.propertyId] || null,
    }));
  }

  return c.json({
    success: true,
    filters,
    matched: {
      properties: matchedProperties.length,
      rooms: matchedRooms.length,
    },
    data: {
      properties: matchedProperties,
      rooms: enrichedRooms,
    },
    timestamp,
  });
};

export default find;

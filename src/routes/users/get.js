import { getCollection } from '../../services/astra.js';
import { checkToken } from '../../utils/auth.js';

const hierarchy = ['real estate company', 'landlord', 'dual', 'customer care', 'admin', 'ceo'];

export const getUsers = async (c) => {
  const start = Date.now();
  const traceId = c.req.header('x-trace-id') || crypto.randomUUID();
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  const timestamp = new Date().toISOString();
  if (!token) {
    return c.json({
      success: false,
      error: 'MISSING_TOKEN',
      message: 'Missing authentication token.',
      timestamp,
      traceId,
    }, 401);
  }

  const actor = await checkToken(token);
  if (!actor?.role) {
    return c.json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Invalid or expired token.',
      timestamp,
      traceId,
    }, 401);
  }

  const actorRank = hierarchy.indexOf(actor.role);
  if (actorRank === -1) {
    return c.json({
      success: false,
      error: 'ROLE_UNKNOWN',
      message: 'Your role is not recognized in the hierarchy.',
      timestamp,
      traceId,
    }, 400);
  }

  let usersCollection;
  try {
    usersCollection = await getCollection('users');
  } catch (err) {
    console.error('❌ DB connection error:', err.message || err);
    return c.json({
      success: false,
      error: 'DB_CONNECTION_FAILED',
      message: 'Database connection failed.',
      timestamp,
      traceId,
    }, 503);
  }

  const visibleRoles = actor.role === 'ceo'
    ? hierarchy
    : hierarchy.slice(0, actorRank + 1);

  try {
    const result = await usersCollection.find({ role: { $in: visibleRoles } });
    const users = Object.values(result?.data || {});

    return c.json({
      success: true,
      count: users.length,
      visibleRoles,
      data: users,
      timestamp,
      traceId,
      duration: `${Date.now() - start}ms`,
    });
  } catch (err) {
    console.error('❌ User query failed:', err.message || err);
    if (err.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(err.response.data, null, 2));
    }

    return c.json({
      success: false,
      error: 'DB_QUERY_FAILED',
      message: 'Failed to fetch users.',
      timestamp,
      traceId,
    }, 500);
  }
};

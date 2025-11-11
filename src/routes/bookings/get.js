import { getCollection } from '../../services/astra.js';
import { checkToken } from '../../utils/auth.js';

const bookings = async (c) => {
  const timestamp = new Date().toISOString();
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ success: false, error: 'UNAUTHORIZED', message: 'Missing token.', timestamp }, 401);
  }

  const user = await checkToken(token);
  if (!user?.userId) {
    return c.json({ success: false, error: 'INVALID_TOKEN', message: 'Invalid or expired token.', timestamp }, 401);
  }

  let bookingsCol;
  try {
    bookingsCol = await getCollection('bookings');
  } catch {
    return c.json({ success: false, error: 'DB_CONNECTION_FAILED', message: 'Database connection failed.', timestamp }, 503);
  }

  try {
    const result = await bookingsCol.find({ tenant_id: { $eq: user.userId } });
    const data = result?.data;
    return c.json({
      success: true,
      count: data ? Object.keys(data).length : 0,
      data: data ? Object.values(data) : [],
      timestamp,
    });
  } catch {
    return c.json({ success: false, error: 'DB_QUERY_FAILED', message: 'Failed to fetch bookings.', timestamp }, 500);
  }
};

export default bookings;

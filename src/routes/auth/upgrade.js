import { getCollection } from '../../services/astra.js';
import { checkToken, deleteToken, assignToken } from '../../utils/auth.js';

const USERS_COLLECTION = 'users';

// Define allowed transitions per role
const ROLE_TRANSITIONS = {
  user: ['landlord', 'dual', 'real_estate_company', 'agent'],
  tenant: ['landlord', 'dual', 'real_estate_company', 'agent'],
  landlord: ['real_estate_company', 'agent'],
  real_estate_company: ['landlord', 'agent', 'user'],
};


const upgrade = async (c) => {
  const timestamp = new Date().toISOString();
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Missing or invalid token.',
      timestamp,
    }, 401);
  }

  const oldToken = authHeader.split(' ')[1];
  const decoded = await checkToken(oldToken);

  if (!decoded) {
    return c.json({
      success: false,
      error: 'TOKEN_INVALID',
      message: 'Invalid or expired token.',
      timestamp,
    }, 401);
  }

  const { userId, role: currentRole, email } = decoded;
  const { newRole } = await c.req.json();

  // Validate new role
  const allowed = ROLE_TRANSITIONS[currentRole];
  if (!allowed || !allowed.includes(newRole)) {
    return c.json({
      success: false,
      error: 'ROLE_NOT_ELIGIBLE',
      message: `Role "${currentRole}" cannot transition to "${newRole}".`,
      timestamp,
    }, 403);
  }

  let usersCollection;
  try {
    usersCollection = await getCollection(USERS_COLLECTION);
    if (!usersCollection?.patch) {
      throw new Error('Collection object missing .patch() method.');
    }
  } catch (err) {
    console.error('❌ DB connection error:', err.message || err);
    return c.json({
      success: false,
      error: 'DB_CONNECTION_FAILED',
      message: 'Database connection failed.',
      timestamp,
    }, 503);
  }

  try {
    await usersCollection.patch(userId, {
      role: newRole,
      updatedat: new Date(),
    });
  } catch (err) {
    console.error('❌ Role update failed:', err.message || err);
    return c.json({
      success: false,
      error: 'ROLE_UPDATE_FAILED',
      message: 'Failed to upgrade role.',
      timestamp,
    }, 500);
  }

  try {
    await deleteToken(userId, oldToken);
  } catch (err) {
    console.warn('⚠️ Token deletion warning:', err.message || err);
  }

  let newToken;
  try {
    newToken = await assignToken({ userId, email, role: newRole });
  } catch (tokenError) {
    console.error('❌ Token generation failed:', tokenError.message || tokenError);
    return c.json({
      success: false,
      error: 'TOKEN_GENERATION_FAILED',
      message: 'Failed to generate new token.',
      timestamp,
    }, 500);
  }

  c.header(
    'Set-Cookie',
    `token=${newToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`
  );

  return c.json({
    success: true,
    message: `Role changed from ${currentRole} to ${newRole}.`,
    newRole,
    token: newToken,
    timestamp,
  });
};

export default upgrade;

import { getCollection } from '../../services/astra.js';
import { checkToken } from '../../utils/auth.js';

/**
 * DELETE /users/:id
 * Deletes a user document from the Astra DB "users" collection by ID.
 * Only superior roles can delete junior roles.
 */
export const deleteUser = async (c) => {
  const timestamp = new Date().toISOString();
  const targetId = c.req.param('id');
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  const actor = token ? await checkToken(token) : null;

  if (!actor) {
    return c.json(
      {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Missing or invalid token.',
        timestamp,
      },
      401
    );
  }

  if (!targetId || typeof targetId !== 'string') {
    return c.json(
      {
        success: false,
        error: 'INVALID_USER_ID',
        message: 'User ID is required and must be a string.',
        timestamp,
      },
      400
    );
  }

  let usersCollection;
  try {
    usersCollection = await getCollection('users');
    if (!usersCollection?.find || !usersCollection?.delete) {
      throw new Error('Collection "users" missing required methods.');
    }
    console.log('📦 Connected to collection: users');
  } catch (err) {
    console.error('❌ DB connection error:', err.message || err);
    return c.json(
      {
        success: false,
        error: 'DB_CONNECTION_FAILED',
        message: 'Database connection failed.',
        timestamp,
      },
      503
    );
  }

  let targetUser, docId;
  try {
    const result = await usersCollection.find({ _id: targetId });
    const entries = Object.entries(result?.data || {});
    if (entries.length === 0) {
      return c.json(
        {
          success: false,
          error: 'USER_NOT_FOUND',
          message: `No user found with ID "${targetId}".`,
          timestamp,
        },
        404
      );
    }
    [docId, targetUser] = entries[0];
  } catch (queryErr) {
    console.error('❌ User lookup failed:', queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'DB_QUERY_FAILED',
        message: 'Failed to retrieve target user.',
        timestamp,
      },
      500
    );
  }

  // 🧠 Role hierarchy enforcement
  const hierarchy = ['landlord', 'dual', 'customer care', 'admin', 'ceo'];
  const actorRank = hierarchy.indexOf(actor.role);
  const targetRank = hierarchy.indexOf(targetUser.role);

  if (actorRank === -1 || targetRank === -1) {
    return c.json(
      {
        success: false,
        error: 'ROLE_UNKNOWN',
        message: 'One or both roles are unrecognized.',
        timestamp,
      },
      400
    );
  }

  if (actorRank <= targetRank) {
    return c.json(
      {
        success: false,
        error: 'FORBIDDEN',
        message: 'You cannot delete a user with equal or higher role.',
        timestamp,
      },
      403
    );
  }

  try {
    await usersCollection.delete(docId);
    return c.json({
      success: true,
      message: 'User deleted successfully.',
      deletedBy: actor.userId,
      timestamp,
    });
  } catch (deleteErr) {
    console.error('❌ User deletion failed:', deleteErr.message || deleteErr);
    if (deleteErr.response?.data) {
      console.error('📄 Astra delete error:', JSON.stringify(deleteErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'DELETE_FAILED',
        message: 'Failed to delete user.',
        timestamp,
      },
      500
    );
  }
};

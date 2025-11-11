import { getCollection } from '../../services/astra.js';
import { checkToken } from '../../utils/auth.js';

/**
 * PUT /users/:id
 * Updates a user document in the Astra DB "users" collection by ID.
 * Role updates are restricted:
 * - Only admin and ceo can update any role
 * - Customer care can only upgrade to: dual, landlord, real estate company
 * - No one can upgrade to ceo
 */
export const updateUser = async (c) => {
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

  let updateData;
  try {
    updateData = await c.req.json();
    if (!updateData || typeof updateData !== 'object') {
      throw new Error('Request body must be valid JSON.');
    }
  } catch (err) {
    console.error('❌ Body parse error:', err.message || err);
    return c.json(
      {
        success: false,
        error: 'INVALID_BODY',
        message: 'Request body must be valid JSON.',
        timestamp,
      },
      400
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
    if (!usersCollection?.find || !usersCollection?.patch) {
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

  // 🧠 Role update enforcement
  const actorRole = actor.role;
  const isRoleUpdate = Object.prototype.hasOwnProperty.call(updateData, 'role');

  if (isRoleUpdate) {
    const newRole = updateData.role;

    if (newRole === 'ceo') {
      return c.json(
        {
          success: false,
          error: 'ROLE_NOT_ALLOWED',
          message: 'Cannot upgrade any user to role "ceo".',
          timestamp,
        },
        403
      );
    }

    const allowedByCustomerCare = ['dual', 'landlord', 'real estate company'];
    const isCustomerCare = actorRole === 'customer care';

    if (isCustomerCare && !allowedByCustomerCare.includes(newRole)) {
      return c.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Customer care can only upgrade to: dual, landlord, or real estate company.',
          timestamp,
        },
        403
      );
    }

    if (!['admin', 'ceo', 'customer care'].includes(actorRole)) {
      return c.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Only admin, ceo, or customer care can update user roles.',
          timestamp,
        },
        403
      );
    }
  }

  try {
    await usersCollection.patch(docId, {
      ...updateData,
      updated_by: actor.userId,
      updated_at: timestamp,
    });

    return c.json({
      success: true,
      message: 'User updated successfully.',
      updatedBy: actor.userId,
      timestamp,
    });
  } catch (updateErr) {
    console.error('❌ User update failed:', updateErr.message || updateErr);
    if (updateErr.response?.data) {
      console.error('📄 Astra update error:', JSON.stringify(updateErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'UPDATE_FAILED',
        message: 'Failed to update user.',
        timestamp,
      },
      500
    );
  }
};

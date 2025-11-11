import { getCollection } from '../../services/astra.js';
import { checkToken, roleCheck } from '../../utils/auth.js';

/**
 * DELETE /properties/:id
 * Deletes a property if the requester is the owner or has elevated role.
 */
export const deleteProperty = async (c) => {
  const timestamp = new Date().toISOString();
  const propertyId = c.req.param('id');
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  const payload = await checkToken(token);

  if (!payload) {
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

  const elevatedRoles = ['ceo', 'admin', 'customercare'];

  let propertiesCollection;
  try {
    propertiesCollection = await getCollection('properties');
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

  let property, docId;
  try {
    const result = await propertiesCollection.find({ property_id: propertyId });
    const entries = Object.entries(result?.data || {});
    if (entries.length === 0) {
      return c.json(
        {
          success: false,
          error: 'PROPERTY_NOT_FOUND',
          message: `No property found with ID "${propertyId}".`,
          timestamp,
        },
        404
      );
    }
    [docId, property] = entries[0];
  } catch (queryErr) {
    console.error('❌ Property lookup failed:', queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'DB_QUERY_FAILED',
        message: 'Failed to retrieve property.',
        timestamp,
      },
      500
    );
  }

  const isOwner = property.landlordId === payload.userId;
  const isElevated = roleCheck(payload, elevatedRoles);

  if (!isOwner && !isElevated) {
    return c.json(
      {
        success: false,
        error: 'FORBIDDEN',
        message: 'Only the property owner or elevated roles can delete this property.',
        timestamp,
      },
      403
    );
  }

  try {
    await propertiesCollection.delete(docId);
  } catch (deleteErr) {
    console.error('❌ Property deletion failed:', deleteErr.message || deleteErr);
    if (deleteErr.response?.data) {
      console.error('📄 Astra delete error:', JSON.stringify(deleteErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'DELETE_FAILED',
        message: 'Failed to delete property.',
        timestamp,
      },
      500
    );
  }

  return c.json({
    success: true,
    message: 'Property deleted successfully.',
    propertyId,
    timestamp,
  });
};

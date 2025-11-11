import { getCollection } from '../../services/astra.js';
import { checkToken, roleCheck } from '../../utils/auth.js';

/**
 * DELETE /rooms/:id
 * Deletes a room if the requester is the owner or has elevated role.
 */
export const deleteRoom = async (c) => {
  const timestamp = new Date().toISOString();
  const roomId = c.req.param('id');
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

  let roomsCollection;
  try {
    roomsCollection = await getCollection('rooms');
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

  let room, docId;
  try {
    const result = await roomsCollection.find({ room_id: roomId });
    const entries = Object.entries(result?.data || {});
    if (entries.length === 0) {
      return c.json(
        {
          success: false,
          error: 'ROOM_NOT_FOUND',
          message: `No room found with ID "${roomId}".`,
          timestamp,
        },
        404
      );
    }
    [docId, room] = entries[0];
  } catch (queryErr) {
    console.error('❌ Room lookup failed:', queryErr.message || queryErr);
    if (queryErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(queryErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'DB_QUERY_FAILED',
        message: 'Failed to retrieve room.',
        timestamp,
      },
      500
    );
  }

  const isOwner = room.landlordId === payload.userId;
  const isElevated = roleCheck(payload, elevatedRoles);

  if (!isOwner && !isElevated) {
    return c.json(
      {
        success: false,
        error: 'FORBIDDEN',
        message: 'Only the room owner or elevated roles can delete this room.',
        timestamp,
      },
      403
    );
  }

  try {
    await roomsCollection.delete(docId);
  } catch (deleteErr) {
    console.error('❌ Room deletion failed:', deleteErr.message || deleteErr);
    if (deleteErr.response?.data) {
      console.error('📄 Astra delete error:', JSON.stringify(deleteErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'DELETE_FAILED',
        message: 'Failed to delete room.',
        timestamp,
      },
      500
    );
  }

  return c.json({
    success: true,
    message: 'Room deleted successfully.',
    roomId,
    timestamp,
  });
};

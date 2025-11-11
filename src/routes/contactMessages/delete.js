import { getCollection } from '../../services/astra.js';
import { checkToken } from '../../utils/auth.js';

/**
 * DELETE /contactMessages
 * Deletes all contact replies older than 1 month.
 * Only accessible by ceo or admin.
 */
export const deleteOldReplies = async (c) => {
  const timestamp = new Date().toISOString();
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  const actor = token ? await checkToken(token) : null;

  if (!actor || !['ceo', 'admin'].includes(actor.role)) {
    return c.json(
      {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Only ceo or admin can delete old replies.',
        timestamp,
      },
      403
    );
  }

  let repliesCollection;
  try {
    repliesCollection = await getCollection('contact_replies');
    if (!repliesCollection?.deleteMany || typeof repliesCollection.deleteMany !== 'function') {
      throw new Error('Collection "contact_replies" missing .deleteMany() method.');
    }
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

  // Calculate cutoff date (1 month ago)
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 1);

  try {
    const result = await repliesCollection.deleteMany({
      replied_at: { $lt: cutoffDate.toISOString() },
    });

    return c.json({
      success: true,
      message: 'Old replies deleted successfully.',
      deletedCount: result?.deletedCount || 0,
      timestamp,
    });
  } catch (deleteErr) {
    console.error('❌ Delete failed:', deleteErr.message || deleteErr);
    return c.json(
      {
        success: false,
        error: 'DELETE_FAILED',
        message: 'Failed to delete old replies.',
        timestamp,
      },
      500
    );
  }
};

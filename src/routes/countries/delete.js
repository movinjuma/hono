import { getCollection } from '../../services/astra.js';
import { checkToken } from '../../utils/auth.js';

/**
 * DELETE /countries/:id
 * Deletes a country document. Only CEO can perform this action.
 */
export const deleteCountry = async (c) => {
  const timestamp = new Date().toISOString();
  const countryId = c.req.param('id');
  const rawToken = c.req.header('Authorization')?.replace('Bearer ', '');
  const user = rawToken ? await checkToken(rawToken) : null;

  if (!user || user.role !== 'ceo') {
    return c.json(
      {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Only CEO can delete countries.',
        timestamp,
      },
      403
    );
  }

  let countriesCollection;
  try {
    countriesCollection = await getCollection('countries');
    if (!countriesCollection?.deleteOne) {
      throw new Error('Collection object missing .deleteOne() method.');
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

  try {
    await countriesCollection.deleteOne({ _id: countryId });
    return c.json({
      success: true,
      message: 'Country deleted successfully.',
      timestamp,
    });
  } catch (deleteErr) {
    console.error('❌ Country deletion failed:', deleteErr.message || deleteErr);
    if (deleteErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(deleteErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'DELETE_FAILED',
        message: 'Failed to delete country.',
        timestamp,
      },
      500
    );
  }
};

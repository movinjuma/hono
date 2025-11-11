import { getCollection } from '../../services/astra.js';
import { checkToken } from '../../utils/auth.js';

/**
 * PUT /countries/:id
 * Updates a country document. Only CEO can perform this action.
 */
export const updateCountry = async (c) => {
  const timestamp = new Date().toISOString();
  const countryId = c.req.param('id');
  const rawToken = c.req.header('Authorization')?.replace('Bearer ', '');
  const user = rawToken ? await checkToken(rawToken) : null;

  if (!user || user.role !== 'ceo') {
    return c.json(
      {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Only CEO can update countries.',
        timestamp,
      },
      403
    );
  }

  let body;
  try {
    body = await c.req.json();
  } catch (parseErr) {
    console.error('❌ Failed to parse request body:', parseErr.message || parseErr);
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

  let countriesCollection;
  try {
    countriesCollection = await getCollection('countries');
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
    await countriesCollection.patch(countryId, body);
    return c.json({
      success: true,
      message: 'Country updated successfully.',
      timestamp,
    });
  } catch (updateErr) {
    console.error('❌ Country update failed:', updateErr.message || updateErr);
    if (updateErr.response?.data) {
      console.error('📄 Astra error response:', JSON.stringify(updateErr.response.data, null, 2));
    }
    return c.json(
      {
        success: false,
        error: 'UPDATE_FAILED',
        message: 'Failed to update country.',
        timestamp,
      },
      500
    );
  }
};

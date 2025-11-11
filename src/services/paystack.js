const BASE_URL = 'https://api.paystack.co';

let PAYSTACK_SECRET_KEY = null;
let setupError = null;
let setupPromise = null;

// Internal lazy initializer
const ensureReady = async () => {
  if (setupError) throw setupError;
  if (PAYSTACK_SECRET_KEY) return;

  if (!setupPromise) {
    setupPromise = (async () => {
      PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
      if (!PAYSTACK_SECRET_KEY) {
        setupError = new Error('❌ Missing Paystack secret key in environment.');
      }
    })();
  }

  await setupPromise;
  if (setupError) throw setupError;
};

/**
 * Shared fetch wrapper for Paystack API
 * @param {string} endpoint - API endpoint (e.g., /transaction/verify/:ref)
 * @param {string} method - HTTP method (GET, POST)
 * @param {object|null} body - Request payload
 * @returns {Promise<object>} - Parsed response data
 */
const paystackFetch = async (endpoint, method = 'GET', body = null) => {
  await ensureReady();

  const headers = {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.message || `Paystack API error: ${endpoint}`;
    throw new Error(errorMsg);
  }

  return data;
};

/**
 * Initializes a payment transaction
 * @param {object} payload - { email, amount, reference, callback_url }
 * @returns {Promise<object>}
 */
const initializePayment = async (payload) => {
  const { email, amount } = payload || {};
  if (!email || !amount) {
    throw new Error('Missing email or amount for payment initialization.');
  }

  return await paystackFetch('/transaction/initialize', 'POST', payload);
};

/**
 * Verifies a transaction by reference
 * @param {string} reference
 * @returns {Promise<object>}
 */
const verifyPayment = async (reference) => {
  if (!reference || typeof reference !== 'string') {
    throw new Error('Transaction reference is required and must be a string.');
  }

  return await paystackFetch(`/transaction/verify/${reference}`);
};

/**
 * Withdraws funds to a recipient
 * @param {object} payload - { amount, recipient, reason }
 * @returns {Promise<object>}
 */
const withdrawFunds = async (payload) => {
  const { amount, recipient } = payload || {};
  if (!amount || !recipient) {
    throw new Error('Missing amount or recipient for withdrawal.');
  }

  return await paystackFetch('/transfer', 'POST', payload);
};

export { initializePayment, verifyPayment, withdrawFunds };

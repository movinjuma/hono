import { Hono } from 'hono';
import postReceipt from './post.js';
import verifyReceipt from './verify.js';
import listReceipts from './list.js';
import getReceiptById from './mine/[receipt_id].js';

const receiptRoutes = new Hono();

/**
 * Public route to verify a receipt by ID
 */
receiptRoutes.get('/verify/:receipt_id', verifyReceipt);

/**
 * Protected route to create a custom receipt (landlord or dual only)
 */
receiptRoutes.post('/', postReceipt);

/**
 * Protected route to list all receipts created by the authenticated landlord
 */
receiptRoutes.get('/mine', listReceipts);

/**
 * Protected route to fetch a specific receipt created by the authenticated landlord
 */
receiptRoutes.get('/mine/:receipt_id', getReceiptById);

export default receiptRoutes;

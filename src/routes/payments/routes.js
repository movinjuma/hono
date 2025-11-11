import { Hono } from 'hono';
import post from './post.js';
import verify from './verify.js';
import withdraw from './withdraw.js';

const paymentsRoutes = new Hono();

// Public access
paymentsRoutes.post('/initiate', post);

// Admin, CEO, customer care
paymentsRoutes.post('/verify', verify);

// CEO only
paymentsRoutes.post('/withdraw', withdraw);

export default paymentsRoutes;

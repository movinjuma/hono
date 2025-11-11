import { Hono } from 'hono';
import authRoutes from './auth/routes.js';
import roomsRoutes from './rooms/routes.js';
import propertiesRoutes from './properties/routes.js';
import countriesRoutes from './countries/routes.js';
import bannersRoutes from './banners/routes.js';
import contactMessagesRoutes from './contactMessages/routes.js';
import chatsRoutes from './chats/routes.js';
import uploadRoutes from './upload/routes.js';
import usersRoutes from './users/routes.js';
import emailRoutes from './emails/routes.js';
import bookingsRoutes from './bookings/routes.js';
import paymentsRoutes from './payments/routes.js';
import receiptRoutes from './receipts/routes.js'; // ✅ Import receipt routes

const appRouter = new Hono();

// --- Public Routes ---
appRouter.route('/contactMessages', contactMessagesRoutes);
appRouter.route('/banners', bannersRoutes);
appRouter.route('/countries', countriesRoutes);
appRouter.route('/upload', uploadRoutes);
appRouter.route('/emails', emailRoutes);
appRouter.route('/payments', paymentsRoutes);
appRouter.route('/receipts', receiptRoutes); // ✅ Mount receipt routes

// --- API Router Groups ---
appRouter.route('/properties', propertiesRoutes);
appRouter.route('/auth', authRoutes);
appRouter.route('/rooms', roomsRoutes);
appRouter.route('/chats', chatsRoutes);
appRouter.route('/users', usersRoutes);
appRouter.route('/bookings', bookingsRoutes);

appRouter.get('/', (c) => {
  return c.text('Hono API is running!');
});

export default appRouter;

import { Hono } from 'hono';
import postBooking from './post.js';
import getBookings from './get.js';
import {updateBooking} from './update.js';

const bookingsRoutes = new Hono();

bookingsRoutes.post('/', postBooking);         // Create a new booking
bookingsRoutes.get('/', getBookings);          // Get all bookings
bookingsRoutes.put('/:id', updateBooking);     // Update booking by ID (landlord only)

export default bookingsRoutes;

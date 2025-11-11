import { Hono } from 'hono';
import { getRooms } from './get.js';
import { getRoomById } from './id.js';
import { updateRoom } from './update.js';
import { deleteRoom } from './delete.js';
import find  from './find.js'; // dynamic search endpoint

const rooms = new Hono();

rooms.get('/', getRooms);             // List all rooms
rooms.get('/:id', getRoomById);       // Get room by ID
rooms.put('/:id', updateRoom);        // Update room (owner or elevated roles)
rooms.delete('/:id', deleteRoom);     // Delete room (owner or elevated roles)
rooms.post('/find', find);            // Dynamic search across rooms + properties

export default rooms;

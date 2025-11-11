import { Hono } from 'hono';
import { getProperties } from './get.js';
import { getPropertyById } from './id.js';
import { postProperty } from './post.js';
import { updateProperty } from './update.js';
import { deleteProperty } from './delete.js';

const properties = new Hono();

properties.get('/', getProperties);             // List all properties
properties.get('/:id', getPropertyById);        // Get a specific property
properties.post('/', postProperty);             // Create property + rooms (with payment)
properties.put('/:id', updateProperty);         // Update property (owner or elevated roles)
properties.delete('/:id', deleteProperty);      // Delete property (owner or elevated roles)

export default properties;

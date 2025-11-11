import { Hono } from 'hono';

import { postContactMessage } from './post.js';
import { getContactMessages } from './get.js';
import { replyToContactMessage } from './reply.js';
import { deleteOldReplies } from './delete.js';

const contactMessages = new Hono();

// Public message submission
contactMessages.post('/', postContactMessage);

// Admin/customer care inbox
contactMessages.get('/', getContactMessages);

// Reply to a message
contactMessages.post('/reply', replyToContactMessage);

// Cleanup old replies (admin/ceo only)
contactMessages.delete('/', deleteOldReplies);

export default contactMessages;

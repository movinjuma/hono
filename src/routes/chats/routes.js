import { Hono } from 'hono';
import { createChat } from './create.js';
import { getChats } from './get.js';
import { getMessagesForChat } from './id.js';

const chats = new Hono();

// Create a new chat
chats.post('/', createChat);

// Get all chats (for chat listing screen)
chats.get('/', getChats);

// Get messages for a specific chat (for chatroom screen)
chats.get('/:id', getMessagesForChat);


const chatsRoutes = chats;
export default chatsRoutes;

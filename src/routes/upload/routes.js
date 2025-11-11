import { Hono } from 'hono';
import { generateUploadUrls } from './post.js';
import { deleteFile, getPublicUrl } from './delete.js';

const uploadRoutes = new Hono();

uploadRoutes.post('/', generateUploadUrls);
uploadRoutes.post('/delete', deleteFile);
uploadRoutes.get('/url/:key', getPublicUrl);

export default uploadRoutes;

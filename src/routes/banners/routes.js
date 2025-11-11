import { Hono } from 'hono';
import { createBanner } from './create.js';
import { deleteBanner } from './delete.js';
import { updateBanner } from './update.js';
import { getBanners } from './get.js'; // ✅ Import GET handler

const bannersRoutes = new Hono({ strict: false }); // optional: strict mode off for flexible routing

// ✅ GET all banners
bannersRoutes.get('/', async (c) => {
  console.log('📥 GET /banners request received');
  return await getBanners(c);
});

// ✅ Create new banner
bannersRoutes.post('/', async (c) => {
  console.log('📤 POST /banners request received');
  return await createBanner(c);
});

// ✅ Update banner by ID
bannersRoutes.put('/:id', async (c) => {
  console.log(`✏️ PUT /banners/${c.req.param('id')} request received`);
  return await updateBanner(c);
});

// ✅ Delete banner by ID
bannersRoutes.delete('/:id', async (c) => {
  console.log(`🗑 DELETE /banners/${c.req.param('id')} request received`);
  return await deleteBanner(c);
});

export default bannersRoutes;

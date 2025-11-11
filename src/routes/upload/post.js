import { initR2 } from '../../services/r2.js';

/**
 * POST /upload
 * Generates preassigned R2 upload URLs and public access URLs for multiple files
 */
export async function generateUploadUrls(c) {
  try {
    const r2 = await initR2(c.env); // Ensure R2 is ready

    const files = await c.req.json();
    if (!Array.isArray(files)) {
      return c.json({ error: 'Expected an array of file descriptors.' }, 400);
    }

    const results = await Promise.all(
      files.map(({ extension = 'jpg', prefix = 'uploads', contentType = 'image/jpeg' }) => {
        const key = r2.generateFilename(extension, prefix);
        return {
          key,
          uploadUrl: r2.generateUploadUrl(key, contentType),
          publicUrl: r2.generatePublicUrl(key),
        };
      })
    );

    return c.json({ files: results });
  } catch (err) {
    console.error('❌ Upload URL generation failed:', err);
    return c.json({ error: 'Failed to generate upload URLs.' }, 500);
  }
}

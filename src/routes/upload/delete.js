import { initR2 } from '../../services/r2.js';
import { HeadObjectCommand } from '@aws-sdk/client-s3';

/**
 * Checks if a file exists in R2
 * @param {object} r2 - Initialized R2 client
 * @param {string} key - File key to check
 * @returns {boolean}
 */
async function fileExists(r2, key) {
  try {
    await r2.s3.send(new HeadObjectCommand({ Bucket: r2.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * POST /upload/delete
 * Deletes a file from R2 by key
 */
export async function deleteFile(c) {
  const { key } = await c.req.json();
  if (!key) {
    return c.json(
      {
        status: 'fail',
        message: 'Missing required field: key',
      },
      400
    );
  }

  const r2 = initR2(c.env);
  const exists = await fileExists(r2, key);

  if (!exists) {
    return c.json(
      {
        status: 'fail',
        message: 'File not found',
        data: { key },
      },
      404
    );
  }

  await r2.deleteFile(key);

  return c.json(
    {
      status: 'success',
      message: 'File deleted successfully',
      data: { key },
    },
    200
  );
}

/**
 * POST /upload/delete-multiple
 * Deletes multiple files from R2 by keys
 */
export async function deleteFiles(c) {
  const { keys } = await c.req.json();
  if (!Array.isArray(keys) || keys.length === 0) {
    return c.json(
      {
        status: 'fail',
        message: 'Missing or invalid field: keys (must be a non-empty array)',
      },
      400
    );
  }

  const r2 = initR2(c.env);

  const results = await Promise.all(
    keys.map(async key => {
      const exists = await fileExists(r2, key);
      if (!exists) {
        return {
          key,
          status: 'not_found',
          message: 'File does not exist',
        };
      }

      try {
        await r2.deleteFile(key);
        return {
          key,
          status: 'deleted',
          message: 'File deleted successfully',
        };
      } catch (err) {
        return {
          key,
          status: 'error',
          message: 'Deletion failed',
          error: err.message,
        };
      }
    })
  );

  return c.json(
    {
      status: 'success',
      message: 'Batch deletion completed',
      data: results,
    },
    207
  );
}

/**
 * GET /upload/url/:key
 * Returns public URL for a file
 */
export async function getPublicUrl(c) {
  const key = c.req.param('key');
  const r2 = initR2(c.env);
  const url = r2.generatePublicUrl(key);
  return c.json({
    status: 'success',
    message: 'Public URL generated',
    data: { key, url },
  });
}

/**
 * POST /upload/url
 * Returns public URLs for multiple file keys
 */
export async function getPublicUrls(c) {
  const { keys } = await c.req.json();
  if (!Array.isArray(keys) || keys.length === 0) {
    return c.json(
      {
        status: 'fail',
        message: 'Missing or invalid field: keys (must be a non-empty array)',
      },
      400
    );
  }

  const r2 = initR2(c.env);
  const urls = keys.map(key => ({
    key,
    url: r2.generatePublicUrl(key),
  }));

  return c.json({
    status: 'success',
    message: 'Public URLs generated',
    data: urls,
  });
}

/**
 * Explicit exports for route binding
 */

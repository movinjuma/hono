import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'node:crypto';

let s3 = null;
let setupError = null;
let setupPromise = null;

let R2_BUCKET = null;
let R2_ENDPOINT = null;

/**
 * Internal lazy initializer
 */
const ensureReady = async () => {
  if (setupError) throw setupError;
  if (s3) return;

  if (!setupPromise) {
    setupPromise = (async () => {
      const {
        R2_BUCKET: bucket = 'tubnixcloud',
        R2_ACCESS_KEY = '',
        R2_SECRET_KEY,
        R2_ENDPOINT: endpoint,
      } = process.env;

      if (!R2_SECRET_KEY || !endpoint) {
        setupError = new Error('❌ Missing R2_SECRET_KEY or R2_ENDPOINT in environment variables.');
        return;
      }

      R2_BUCKET = bucket;
      R2_ENDPOINT = endpoint;

      s3 = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId: R2_ACCESS_KEY,
          secretAccessKey: R2_SECRET_KEY,
        },
      });
    })();
  }

  await setupPromise;
  if (setupError) throw setupError;
};

/**
 * R2 utility methods
 */
export async function initR2() {
  await ensureReady();

  function generateFilename(extension = 'jpg', prefix = 'uploads') {
    const id = crypto.randomUUID();
    return `${prefix}/${id}.${extension}`;
  }

  function generatePublicUrl(key) {
    return `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;
  }

  async function generateUploadUrl(key, contentType = 'image/jpeg') {
    return `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;
  }

  async function uploadFile(key, buffer, contentType = 'image/jpeg') {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });
    await s3.send(command);
  }

  async function deleteFile(key) {
    if (!key) throw new Error('File key is required for deletion.');
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });
    await s3.send(command);
    return true;
  }

  return {
    generateFilename,
    generatePublicUrl,
    generateUploadUrl,
    uploadFile,
    deleteFile,
  };
}

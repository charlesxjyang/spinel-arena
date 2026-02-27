/**
 * S3-compatible file storage helper.
 *
 * Uploads files to an S3 bucket (or S3-compatible service like Tigris, R2, MinIO).
 * Configured via environment variables.
 */

import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

function getS3Client(): S3Client | null {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: region || "us-east-1",
    credentials: { accessKeyId, secretAccessKey },
    ...(process.env.S3_ENDPOINT
      ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
      : {}),
  });
}

/**
 * Upload a file to S3. Returns the S3 object key.
 * Returns null if S3 is not configured.
 */
export async function uploadFile(
  sessionId: string,
  filename: string,
  buffer: Buffer
): Promise<string | null> {
  const client = getS3Client();
  if (!client) {
    console.warn("[storage] S3 not configured, skipping upload");
    return null;
  }

  const key = `uploads/${sessionId}/${Date.now()}-${filename}`;

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Body: buffer,
    })
  );

  return key;
}

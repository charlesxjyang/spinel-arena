/**
 * Fire-and-forget persistence helpers.
 *
 * All functions are designed to never throw — they log warnings on failure
 * so that persistence issues never block or crash the streaming response.
 */

import { prisma } from "./db";
import { uploadFile } from "./storage";

/**
 * Upsert a session record (creates if new, touches updatedAt if existing).
 */
export function ensureSession(sessionId: string): void {
  prisma.session
    .upsert({
      where: { id: sessionId },
      create: { id: sessionId },
      update: {},
    })
    .catch((err) =>
      console.warn("[persistence] ensureSession failed:", err.message)
    );
}

/**
 * Save a user message to the database.
 */
export function saveUserMessage(
  sessionId: string,
  mode: string,
  content: string
): void {
  prisma.message
    .create({
      data: { sessionId, role: "user", mode, content },
    })
    .catch((err) =>
      console.warn("[persistence] saveUserMessage failed:", err.message)
    );
}

/**
 * Save an assistant message with its structured blocks.
 */
export function saveAssistantMessage(
  sessionId: string,
  mode: string,
  textContent: string,
  blocks: unknown[]
): void {
  prisma.message
    .create({
      data: {
        sessionId,
        role: "assistant",
        mode,
        content: textContent,
        blocks: blocks as any,
      },
    })
    .catch((err) =>
      console.warn("[persistence] saveAssistantMessage failed:", err.message)
    );
}

/**
 * Upload a file to S3 and save metadata to the database.
 */
export function saveUploadedFile(
  sessionId: string,
  filename: string,
  base64Content: string
): void {
  const buffer = Buffer.from(base64Content, "base64");

  uploadFile(sessionId, filename, buffer)
    .then((s3Key) => {
      if (!s3Key) return; // S3 not configured
      return prisma.upload.create({
        data: {
          sessionId,
          filename,
          originalName: filename,
          size: buffer.length,
          s3Key,
        },
      });
    })
    .catch((err) =>
      console.warn("[persistence] saveUploadedFile failed:", err.message)
    );
}

import { PayloadTooLargeException } from '@nestjs/common';
import type { Request } from 'express';

/**
 * The raw request body, refusing more than `limit` bytes. Used for image uploads:
 * Nest only parses JSON and forms, so an image/* body is still an unread stream.
 */
export async function readBody(req: Request, limit: number): Promise<Buffer> {
  if (Number(req.headers['content-length'] ?? 0) > limit) {
    throw new PayloadTooLargeException(`Must be ${limit / 1024} KB or smaller`);
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > limit)
      throw new PayloadTooLargeException(
        `Must be ${limit / 1024} KB or smaller`,
      );
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

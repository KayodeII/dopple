export type ImageType = 'image/png' | 'image/jpeg' | 'image/webp';

/**
 * What the bytes actually are, whatever the upload claimed. Only raster formats:
 * an SVG can carry script, and logos are served from the school's own origin.
 */
export function sniffImage(bytes: Buffer): ImageType | null {
  if (
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
    return 'image/jpeg';
  if (
    bytes.subarray(0, 4).toString('latin1') === 'RIFF' &&
    bytes.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

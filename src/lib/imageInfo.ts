/**
 * Helper to determine image metadata (dimensions, type) from a raw Buffer
 * without relying on external dependencies like sharp or image-size.
 */
export interface ImageInfo {
  width: number;
  height: number;
  type: string;
}

export function getImageInfo(buffer: Buffer): ImageInfo | null {
  if (buffer.length < 8) return null;

  // 1. Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    // Width is at 16-19, Height is at 20-23 (Big Endian)
    if (buffer.length >= 24) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height, type: 'png' };
    }
  }

  // 2. Check JPEG signature: FF D8
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length - 8) {
      const marker = buffer.readUInt16BE(offset);
      offset += 2;
      
      // SOF0 (0xFFC0) to SOF3 (0xFFC3), or SOF5 (0xFFC5) to SOF15 (0xFFCF), except SOF4, SOF8, SOF12
      const isSOF = (marker >= 0xffc0 && marker <= 0xffc3) || (marker >= 0xffc5 && marker <= 0xffcf) && marker !== 0xffc4 && marker !== 0xffc8 && marker !== 0xffcc;
      
      const length = buffer.readUInt16BE(offset);
      if (isSOF && offset + length <= buffer.length) {
        // Height is at offset + 3 (2 bytes), Width is at offset + 5 (2 bytes)
        const height = buffer.readUInt16BE(offset + 3);
        const width = buffer.readUInt16BE(offset + 5);
        return { width, height, type: 'jpeg' };
      }
      
      offset += length;
      if (length === 0) break; // Safe breakout
    }
  }

  // 3. Check GIF signature: GIF87a or GIF89a (47 49 46 38 37/39 61)
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    if (buffer.length >= 10) {
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);
      return { width, height, type: 'gif' };
    }
  }

  // 4. Check WebP signature: RIFF ... WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50 // WEBP
  ) {
    // Determine VP8 chunk format
    const format = buffer.toString('ascii', 12, 16);
    if (format === 'VP8 ' && buffer.length >= 30) {
      // Lossy WebP keyframe
      // Width is at 26-27 (14 bits), Height is at 28-29 (14 bits)
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      return { width, height, type: 'webp' };
    } else if (format === 'VP8L' && buffer.length >= 25) {
      // Lossless WebP
      // Width/Height are bit fields starting at byte 21
      const val = buffer.readUInt32LE(20);
      const width = (val & 0x3fff) + 1;
      const height = ((val >> 14) & 0x3fff) + 1;
      return { width, height, type: 'webp' };
    } else if (format === 'VP8X' && buffer.length >= 30) {
      // Extended WebP
      // Width is 24 bits at byte 24, Height is 24 bits at byte 27
      const width = (buffer.readUInt32BE(24) & 0xffffff) + 1;
      const height = (buffer.readUInt32BE(27) & 0xffffff) + 1;
      return { width, height, type: 'webp' };
    }
  }

  return null;
}

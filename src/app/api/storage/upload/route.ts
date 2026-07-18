import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getImageInfo } from '@/lib/imageInfo';

const STORAGE_DIR = path.join(process.cwd(), 'data', 'cloud-storage');
const HASH_MAP_FILE = path.join(STORAGE_DIR, 'hash_map.json');

// Ensure storage directory exists
function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

// Read hash map to prevent duplicate uploads
interface HashMap {
  [fileHash: string]: {
    high: string;
    medium: string;
    thumbnail: string;
  };
}

function readHashMap(): HashMap {
  ensureStorageDir();
  if (fs.existsSync(HASH_MAP_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(HASH_MAP_FILE, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

function writeHashMap(map: HashMap) {
  ensureStorageDir();
  fs.writeFileSync(HASH_MAP_FILE, JSON.stringify(map, null, 2), 'utf-8');
}

export async function POST(req: Request) {
  try {
    // 1. Authorize seller
    const session = await getSession();
    if (!session || session.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized. Only sellers can upload product images.' }, { status: 401 });
    }

    const { high, medium, thumbnail } = await req.json();

    if (!high || !medium || !thumbnail) {
      return NextResponse.json({ error: 'Missing image versions (high, medium, thumbnail).' }, { status: 400 });
    }

    ensureStorageDir();

    // Helper to process base64 upload
    const processBase64 = (dataUrl: string) => {
      const matches = dataUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid image data URL format.');
      }
      return {
        type: matches[1],
        buffer: Buffer.from(matches[2], 'base64')
      };
    };

    let highData, medData, thumbData;
    try {
      highData = processBase64(high);
      medData = processBase64(medium);
      thumbData = processBase64(thumbnail);
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Failed to process base64 image data.' }, { status: 400 });
    }

    // 2. Server-side validations
    // Max size: 5 MB (5 * 1024 * 1024)
    if (highData.buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image size exceeds maximum limit of 5 MB.' }, { status: 400 });
    }

    // Format validation
    const allowedFormats = ['webp', 'png', 'jpeg', 'jpg'];
    if (!allowedFormats.includes(highData.type.toLowerCase())) {
      return NextResponse.json({ error: `Unsupported format: ${highData.type}. Supported formats: WebP, PNG, JPEG, JPG.` }, { status: 400 });
    }

    // Dimensions validation using our metadata parser
    const info = getImageInfo(highData.buffer);
    if (!info) {
      return NextResponse.json({ error: 'Unable to parse image dimensions. File might be corrupted.' }, { status: 400 });
    }

    if (info.width < 500 || info.height < 500) {
      return NextResponse.json({ error: `Image resolution is too low (${info.width}x${info.height}). Minimum resolution: 500x500.` }, { status: 400 });
    }

    if (info.width > 4000 || info.height > 4000) {
      return NextResponse.json({ error: `Image resolution is too high (${info.width}x${info.height}). Maximum resolution: 4000x4000.` }, { status: 400 });
    }

    // 3. Deduplication via SHA-256 file hashing
    const fileHash = crypto.createHash('sha256').update(highData.buffer).digest('hex');
    const hashMap = readHashMap();

    if (hashMap[fileHash]) {
      console.log(`[DEDUPLICATION] Duplicate detected. Reusing existing URLs for hash: ${fileHash}`);
      return NextResponse.json({
        success: true,
        image_url: hashMap[fileHash].high,
        medium_url: hashMap[fileHash].medium,
        thumbnail_url: hashMap[fileHash].thumbnail,
        cached: true
      });
    }

    // 4. Save to storage with UUID
    const fileUuid = crypto.randomUUID();
    const highFilename = `${fileUuid}_high.webp`;
    const medFilename = `${fileUuid}_med.webp`;
    const thumbFilename = `${fileUuid}_thumb.webp`;

    fs.writeFileSync(path.join(STORAGE_DIR, highFilename), highData.buffer);
    fs.writeFileSync(path.join(STORAGE_DIR, medFilename), medData.buffer);
    fs.writeFileSync(path.join(STORAGE_DIR, thumbFilename), thumbData.buffer);

    // Build paths
    const imageUrl = `/api/storage/files/${highFilename}`;
    const mediumUrl = `/api/storage/files/${medFilename}`;
    const thumbnailStaticUrl = `/api/storage/files/${thumbFilename}`;

    // Update deduplication hash map
    hashMap[fileHash] = {
      high: imageUrl,
      medium: mediumUrl,
      thumbnail: thumbnailStaticUrl
    };
    writeHashMap(hashMap);

    return NextResponse.json({
      success: true,
      image_url: imageUrl,
      medium_url: mediumUrl,
      thumbnail_url: thumbnailStaticUrl,
      cached: false
    });
  } catch (error: any) {
    console.error('[STORAGE UPLOAD ERROR]', error);
    return NextResponse.json({ error: 'Internal server error during upload.' }, { status: 500 });
  }
}

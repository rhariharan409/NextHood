import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), 'data', 'cloud-storage');

export async function GET(
  req: Request,
  props: { params: Promise<{ filename: string }> }
) {
  const params = await props.params;
  const filename = params.filename;

  if (!filename) {
    return new NextResponse('Filename is required', { status: 400 });
  }

  // Security check: prevent directory traversal
  const cleanFilename = path.basename(filename);
  const filePath = path.join(STORAGE_DIR, cleanFilename);

  try {
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  } catch (e) {
    console.error('[STORAGE SERVING ERROR]', e);
  }

  return new NextResponse('File not found', { status: 404 });
}

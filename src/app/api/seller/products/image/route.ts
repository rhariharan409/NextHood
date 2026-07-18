import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get('path');

  if (!filePath) {
    return new NextResponse('Path parameter is required', { status: 400 });
  }

  // Security check: only allow files from kagglehub/cache folders
  const cleanPath = filePath.toLowerCase();
  if (!cleanPath.includes('kagglehub') && !cleanPath.includes('product-images-dataset') && !cleanPath.includes('.cache')) {
    return new NextResponse('Access denied', { status: 403 });
  }

  try {
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      let contentType = 'image/jpeg';
      if (ext === '.png') contentType = 'image/png';
      if (ext === '.webp') contentType = 'image/webp';
      if (ext === '.gif') contentType = 'image/gif';

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    }
  } catch (e) {
    console.error('[IMAGE SERVING] Error serving file:', e);
  }

  return new NextResponse('File not found', { status: 404 });
}

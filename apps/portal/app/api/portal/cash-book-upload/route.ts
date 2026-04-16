import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

export const runtime = 'nodejs';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

function extensionFor(fileName: string, mimeType: string): string {
  const raw = path.extname(fileName || '').toLowerCase();
  if (raw) return raw;
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/gif') return '.gif';
  if (mimeType === 'application/pdf') return '.pdf';
  return '.jpg';
}

function resolvePublicDir(): string {
  const direct = path.join(process.cwd(), 'public');
  if (existsSync(direct)) return direct;
  return path.join(process.cwd(), 'apps', 'portal', 'public');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'Attachment file is required.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { message: 'Only JPG, PNG, WEBP, GIF, and PDF files are allowed.' },
        { status: 400 },
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'Attachment must be 8MB or smaller.' },
        { status: 400 },
      );
    }

    const uploadDir = path.join(resolvePublicDir(), 'uploads', 'cash-book');
    await mkdir(uploadDir, { recursive: true });

    const ext = extensionFor(file.name, file.type);
    const fileName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, fileName);
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(arrayBuffer));

    return NextResponse.json({
      url: `/uploads/cash-book/${fileName}`,
      fileName: file.name || fileName,
      storedFileName: fileName,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('[portal-cash-book-upload] Failed:', error);
    return NextResponse.json(
      { message: 'Failed to upload attachment.' },
      { status: 500 },
    );
  }
}

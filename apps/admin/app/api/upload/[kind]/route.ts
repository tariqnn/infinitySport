import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type UploadKind = 'image' | 'video' | 'media';

type RouteContext = {
  params: Promise<{ kind: string }>;
};

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 150 * 1024 * 1024;

const IMAGE_MIME_PREFIX = 'image/';
const VIDEO_MIME_PREFIX = 'video/';

function isUploadKind(value: string): value is UploadKind {
  return value === 'image' || value === 'video' || value === 'media';
}

function resolveRepoRoot(): string {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '../..'),
  ];

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, 'prisma', 'schema.prisma'))) {
      return candidate;
    }
  }

  return process.cwd();
}

function getPublicUploadTargets(kind: UploadKind): string[] {
  const repoRoot = resolveRepoRoot();
  return [
    path.join(repoRoot, 'apps', 'admin', 'public', 'uploads', kind),
    path.join(repoRoot, 'apps', 'web', 'public', 'uploads', kind),
  ];
}

function getFileExtension(fileName: string, mimeType: string): string {
  const extension = path.extname(fileName || '').toLowerCase();
  if (extension) return extension;
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'video/mp4') return '.mp4';
  if (mimeType === 'video/webm') return '.webm';
  return '';
}

function validateMimeType(kind: UploadKind, mimeType: string): boolean {
  if (kind === 'image') return mimeType.startsWith(IMAGE_MIME_PREFIX);
  if (kind === 'video') return mimeType.startsWith(VIDEO_MIME_PREFIX);
  return mimeType.startsWith(IMAGE_MIME_PREFIX) || mimeType.startsWith(VIDEO_MIME_PREFIX);
}

function getMaxSize(kind: UploadKind, mimeType: string): number {
  if (kind === 'image') return MAX_IMAGE_SIZE_BYTES;
  if (kind === 'video') return MAX_VIDEO_SIZE_BYTES;
  return mimeType.startsWith(VIDEO_MIME_PREFIX) ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { kind: rawKind } = await context.params;
    if (!isUploadKind(rawKind)) {
      return NextResponse.json({ message: 'Unsupported upload type' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'File is required' }, { status: 400 });
    }

    if (!validateMimeType(rawKind, file.type || '')) {
      return NextResponse.json({ message: 'Invalid file type' }, { status: 400 });
    }

    const maxSize = getMaxSize(rawKind, file.type || '');
    if (file.size > maxSize) {
      return NextResponse.json({ message: `File is too large. Max size is ${Math.round(maxSize / (1024 * 1024))} MB.` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = getFileExtension(file.name, file.type || '');
    const fileName = `${Date.now()}-${randomUUID()}${extension}`;
    const uploadTargets = getPublicUploadTargets(rawKind);

    await Promise.all(
      uploadTargets.map(async (targetDirectory) => {
        await mkdir(targetDirectory, { recursive: true });
        await writeFile(path.join(targetDirectory, fileName), buffer);
      })
    );

    return NextResponse.json({
      url: `/uploads/${rawKind}/${fileName}`,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error('[upload] failed:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ message }, { status: 500 });
  }
}

# File Upload Setup Guide

## ✅ What's Been Added

File upload functionality has been added to:
- ✅ **Hero Section** - Background images and videos
- ✅ **Programs** - Program images/videos
- ✅ **Announcements** - Announcement images/videos
- ✅ **Facilities** - Facility images/videos

## 📋 Setup Steps

### 1. Run Database Migration

The `Announcement` model now has an `imageUrl` field. Run this migration:

```bash
npx prisma migrate dev --schema=./prisma/schema.prisma --name add_announcement_image
```

When prompted, press Enter to accept the migration name.

### 2. Install Dependencies (if not done)

```bash
npm install
```

### 3. Start the API Server

```bash
npm run dev:api
```

The API will automatically create the `uploads/` directory structure:
- `uploads/images/` - For image files
- `uploads/videos/` - For video files

## 🎯 How to Use

### In Admin Forms

1. **Hero Section** (`/hero`):
   - Click "Choose file" under "Background Image"
   - Or "Choose file" under "Background Video"
   - Files will upload automatically
   - Preview will show immediately

2. **Programs** (`/programs`):
   - When creating/editing a program
   - Use "Program Image/Video" upload
   - Supports both images and videos

3. **Announcements** (`/announcements`):
   - When creating/editing an announcement
   - Use "Announcement Image/Video" upload (optional)

4. **Facilities** (`/facilities`):
   - When creating/editing a facility
   - Use "Facility Image/Video" upload

## 📁 File Storage

- **Location**: Files are stored in `apps/api/uploads/`
- **Access**: Files are served at `http://localhost:4000/uploads/images/` or `/uploads/videos/`
- **Naming**: Files are automatically renamed with UUIDs to prevent conflicts

## 🔒 File Limits

- **Images**: Max 10MB
- **Videos**: Max 100MB
- **Allowed formats**:
  - Images: JPEG, JPG, PNG, GIF, WebP
  - Videos: MP4, WebM, OGG, QuickTime

## 🚀 API Endpoints

- `POST /api/upload/image` - Upload image only
- `POST /api/upload/video` - Upload video only
- `POST /api/upload/media` - Upload image or video (auto-detects)

## 📝 Notes

- Uploaded files are stored locally in the `uploads/` directory
- For production, consider using cloud storage (AWS S3, Cloudinary, etc.)
- The `uploads/` directory is in `.gitignore` - files won't be committed
- Files are accessible via the API server at `/uploads/` path

## 🔧 Troubleshooting

### "Cannot find module 'multer'"
Run: `npm install` in the `apps/api` directory

### "Upload failed"
- Make sure API server is running
- Check file size (must be under limits)
- Check file type (must be allowed format)

### "Preview not showing"
- Check browser console for errors
- Verify API server is running
- Check that file uploaded successfully (see Network tab)


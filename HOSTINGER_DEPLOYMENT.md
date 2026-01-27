# Hostinger Deployment Guide

## Problem
Hostinger doesn't recognize the monorepo structure because it expects a single Next.js app at the root, but this project has multiple apps in subdirectories. Additionally, the web app depends on shared packages from the monorepo.

## ✅ Solution Applied
We've added Next.js detection files at the root (`next.config.js` and `next` in root `package.json`) so Hostinger can auto-detect the framework. The build still runs from root to access monorepo packages.

## Solution Options

### Option 1: Configure Build Settings in Hostinger Panel (Recommended)

**IMPORTANT:** Since `apps/web` depends on packages from the monorepo (`packages/*`), you MUST build from the root directory, not from `apps/web`.

1. **In Hostinger Control Panel:**
   - Go to your domain/hosting → **Deploy** or **Git** section
   - Connect your GitHub repository
   - **DO NOT set a root directory** - keep it at the repository root
   - Set the following build settings:

   **Build Command:**
   ```bash
   npm install && npm run build:hostinger
   ```
   OR (if Hostinger auto-detects Next.js, it might use):
   ```bash
   npm install && npm run build
   ```
   
   **Start Command:**
   ```bash
   npm run start:hostinger
   ```
   OR (if auto-detected):
   ```bash
   npm run start
   ```
   
   **Output Directory:** `apps/web/.next`
   
   **Node Version:** 18.18.0 or higher

2. **Environment Variables:**
   Add these in Hostinger's environment variables section:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_BASE_URL=https://your-api-url.com
   ```

### Option 2: Manual Configuration Steps

If Hostinger's auto-detection fails, manually configure:

1. **Framework Detection:**
   - In Hostinger, look for "Framework" or "Application Type" settings
   - Select "Node.js" or "Custom"
   - **Do NOT select "Next.js"** if it tries to auto-detect (it will fail)

2. **Build Settings:**
   - **Install Command:** `npm install`
   - **Build Command:** `npm run build:hostinger`
   - **Start Command:** `npm run start:hostinger`
   - **Working Directory:** (leave empty or set to root `/`)

### Option 3: Deploy Only the Web App (Alternative)

If the above doesn't work, you can create a standalone deployment:

1. Copy the `apps/web` directory to a separate repository
2. Copy necessary packages from `packages/` 
3. Update import paths
4. Deploy that repository instead

## Important Notes

- **API Backend:** Your NestJS API (`apps/api`) needs to be deployed separately (e.g., Render, Railway, or a VPS)
- **Database:** Ensure your `DATABASE_URL` environment variable is set correctly
- **Static Files:** Next.js will handle static file serving automatically
- **Port:** Hostinger will assign a port automatically - Next.js will use `process.env.PORT`

## Troubleshooting

If you still get "Unsupported framework" error:

1. **Check Hostinger Settings:**
   - Make sure you're NOT setting a root directory to `apps/web`
   - The build must run from the repository root to access `packages/` dependencies
   - Verify the build command is: `npm run build:hostinger`

2. **Verify Files:**
   - Check that `package.json` exists at root with the `build:hostinger` script
   - Check that `apps/web/package.json` exists and has Next.js as a dependency
   - Verify `apps/web/next.config.ts` exists

3. **Check Build Logs:**
   - Look at Hostinger's build logs for specific error messages
   - Common issues:
     - Missing dependencies (should be fixed by `npm install` at root)
     - Cannot find module errors (means packages aren't being linked correctly)
     - Port binding errors (check that Hostinger assigns a port automatically)

4. **If Build Fails:**
   - Try running `npm run build:hostinger` locally to verify it works
   - Check that all workspace dependencies are properly installed
   - Ensure Prisma client is generated (the build script includes this)

## Recommended: Use Vercel or Netlify Instead

For monorepo Next.js apps, **Vercel** or **Netlify** have better monorepo support:
- Automatic detection of Next.js apps in subdirectories
- Better build optimization
- Easier environment variable management
- Free tier available

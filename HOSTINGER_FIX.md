# Fix for Hostinger 403 Error - Files in public_html

## Problem
Hostinger is copying `.next` build output to `public_html` as static files, but Next.js needs to run as a Node.js process.

## Solution

### Step 1: Remove .hostinger.json
I've removed `apps/web/.hostinger.json` because it was telling Hostinger to copy files to `public_html`.

### Step 2: Configure Hostinger Correctly

In Hostinger's deployment settings:

1. **Framework/Type:** Select "Node.js" or "Custom" (NOT "Next.js" if it tries to auto-detect)

2. **Build Command:** 
   ```
   npm install && npm run build
   ```
   (from dropdown, or type if allowed)

3. **Start Command:**
   ```
   npm run start
   ```
   (from dropdown - this runs `node start-combined.js`)

4. **Output Directory:** 
   - **LEAVE EMPTY** or set to `/` (root)
   - **DO NOT** set to `.next` or `apps/web/.next`
   - **DO NOT** set to `public_html`

5. **Working Directory:**
   - **LEAVE EMPTY** or set to `/` (root of repo)

### Step 3: Verify Settings

After deployment:
- ✅ `public_html` should NOT contain `.next` files
- ✅ The app should run as a Node.js process
- ✅ Check Runtime Logs for startup messages
- ✅ Application Status should be "Running"

### Step 4: Clean Up public_html (if needed)

If `public_html` still has `.next` files after fixing the config:

1. Go to Hostinger File Manager
2. Delete everything in `public_html` (or move it to a backup folder)
3. Redeploy

The Node.js app should run from the repo root, NOT from `public_html`.

## Why This Happens

- `.hostinger.json` with `"outputDirectory": ".next"` tells Hostinger to copy build output to `public_html`
- This works for static sites (Vue, React static export) but NOT for Next.js server-side apps
- Next.js needs to run `next start` as a Node.js process, not be served as static files

## Verification

After fixing, check Runtime Logs. You should see:
```
🚀 Starting Infinity Sports (API + Web)...
📡 API will run on port...
🌐 Web will run on port...
✅ Build outputs verified
```

If you see these messages, the app is running correctly as Node.js.

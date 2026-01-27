# Hostinger Node.js Deployment - Correct Setup

## ⚠️ CRITICAL: This is a Next.js App, NOT a Static Site

Your app **CANNOT** be deployed to `public_html` as static files because:
- ✅ It has Next.js API routes (`/api/booking`, `/api/contact`, etc.)
- ✅ It uses server-side rendering (async server components)
- ✅ It needs to run as a Node.js process

## ✅ Correct Hostinger Configuration

### Step 1: Use Node.js Hosting (NOT Apache/Shared Hosting)

1. In Hostinger, go to your domain/hosting panel
2. Look for **"Node.js"** or **"Application"** section (NOT "File Manager" or "public_html")
3. If you only see `public_html`, you're on the wrong hosting plan
4. You need **Node.js Hosting** or **VPS** with Node.js support

### Step 2: Configure Build & Start Commands

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm run start
```

**Working Directory:** (leave empty - root of repo)

**Node Version:** 18.x or higher

### Step 3: Environment Variables

Set these in Hostinger's environment variables:

```
NODE_ENV=production
PORT=3000
API_PORT=4000
API_RUNNING_LOCALLY=true
NEXT_PUBLIC_API_SAME_DOMAIN=true
DATABASE_URL=your_database_url
LANDING_ORIGIN=https://yourdomain.com
```

### Step 4: Verify Deployment

After deployment, check:
1. **Runtime Logs** (not build logs) should show:
   - "🚀 Starting Infinity Sports (API + Web)..."
   - "📡 API will run on port..."
   - "🌐 Web will run on port..."
   - "Ready on http://localhost:..."

2. **Application Status** should show "Running"

3. Your website should load (not 403)

## ❌ If You're on Apache/Shared Hosting

If Hostinger only gives you `public_html` (Apache hosting), you have two options:

### Option A: Upgrade to Node.js Hosting
- Contact Hostinger support to upgrade
- Or switch to a VPS plan

### Option B: Use a Different Hosting Provider
Recommended providers for Next.js:
- **Vercel** (best for Next.js, free tier)
- **Netlify** (good for Next.js, free tier)
- **Railway** (easy Node.js deployment)
- **Render** (free tier available)

## 🔍 Troubleshooting 403 Error

If you still get 403 after following the above:

1. **Check Runtime Logs:**
   - Look for error messages
   - Verify the app is starting

2. **Verify Start Command:**
   - Should be `npm run start` (not `npm start` or anything else)
   - Should be from dropdown, not typed

3. **Check Application Status:**
   - Should be "Running", not "Stopped" or "Error"

4. **Verify Port:**
   - Hostinger should assign `PORT` automatically
   - Don't hardcode it

## 📝 Current Setup

Your current setup is correct for Node.js hosting:
- ✅ `start-combined.js` runs both API and Web
- ✅ Build command builds both API and Web
- ✅ Environment variables configured for same-domain deployment

The issue is likely that Hostinger is configured for Apache instead of Node.js.

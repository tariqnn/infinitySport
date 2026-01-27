# Deploy to Hostinger from Scratch - Step by Step

## ✅ Pre-Deployment Checklist

Before deploying, make sure:
- ✅ All code is pushed to GitHub (`main` branch)
- ✅ You have your database connection string ready
- ✅ You have your domain name ready

---

## 📋 Step 1: Create New Deployment in Hostinger

1. Go to Hostinger Control Panel
2. Navigate to **"Deploy"** or **"Git"** section
3. Click **"New Deployment"** or **"Connect Repository"**
4. Connect your GitHub repository:
   - Repository: `tariqnn/infinitySport` (or your repo name)
   - Branch: `main`

**⚠️ IMPORTANT:** You'll see a warning:
```
Unsupported framework or invalid project structure
```

**This is NORMAL for monorepos!** Click on your repository anyway and proceed. We'll configure it manually in the next step.

---

## ⚙️ Step 2: Configure Build Settings

In Hostinger's deployment settings, set:

### Framework Preset:
```
Node.js
```
**OR** if available:
```
Custom
```

**⚠️ IMPORTANT:** Do NOT select "Next.js" - it will fail because the app is in `apps/web`, not at root.

### Branch:
```
main
```

### Node Version:
```
18.x
```

### Root Directory:
```
./
```
(Or leave empty if allowed)

### Build Command:
```
npm install && npm run build
```

### Start Command:
```
npm run start
```

### Output Directory:
```
(LEAVE EMPTY - blank field)
```
**⚠️ CRITICAL:** Do NOT set this to `/`, `.next`, or any path. Leave it empty.

If Hostinger won't let you leave it empty, use:
```
.
```
(single dot)

### Package Manager:
```
npm
```

---

## 🔐 Step 3: Set Environment Variables

In Hostinger's **Environment Variables** section, add:

```env
NODE_ENV=production
```

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```
*(Replace with your actual Neon/Postgres connection string)*

```env
API_PORT=4000
```

```env
API_RUNNING_LOCALLY=true
```

```env
NEXT_PUBLIC_API_SAME_DOMAIN=true
```

```env
LANDING_ORIGIN=https://yourdomain.com
```
*(Replace `yourdomain.com` with your actual domain, e.g., `https://infinitysports.jo`)*

**Optional (if deploying admin/portal later):**
```env
ADMIN_ORIGIN=https://admin.yourdomain.com
PORTAL_ORIGIN=https://portal.yourdomain.com
```

**DO NOT SET:**
- ❌ `PORT` (Hostinger sets this automatically)
- ❌ `NEXT_PUBLIC_API_BASE_URL` (leave empty/unset)

---

## 🚀 Step 4: Deploy

1. **Save** all settings
2. Click **"Deploy"** or **"Redeploy"**
3. Wait for build to complete (check Build Logs)

---

## ✅ Step 5: Verify Deployment

### Check Build Logs:
You should see:
```
✔ Compiled successfully
✔ Generating static pages
✓ Generating static pages (22/22)
```

### Check Runtime Logs:
After build completes, check **Runtime/Application Logs** (not build logs). You should see:
```
🚀 Starting Infinity Sports (API + Web)...
📡 API will run on port 4000 (internal)
🌐 Web will run on port [Hostinger assigned port]
📁 Working directory: /path/to/repo
✅ Build outputs verified
📡 Starting API...
🌐 Starting Web App...
   Using PORT: [port]
   API_RUNNING_LOCALLY: true
   API_PORT: 4000
```

### Check Application Status:
- Should show **"Running"** (not "Stopped" or "Error")

### Test Website:
- Visit your domain
- Should load (not 403 Forbidden)
- Check browser console for errors

---

## 🔍 Troubleshooting

### If you get "Unsupported framework" error:
1. Try changing Framework Preset to "Node.js" or "Custom"
2. Make sure Output Directory is **empty** (not `/` or any path)
3. Verify Root Directory is `./` or empty

### If you get 403 Forbidden:
1. Check Runtime Logs - is the app starting?
2. Verify Output Directory is **empty** (not `/`)
3. Check Application Status - should be "Running"
4. Verify Start Command is `npm run start`

### If build fails:
1. Check Build Logs for specific errors
2. Verify all environment variables are set
3. Make sure `DATABASE_URL` is correct
4. Try running `npm run build` locally to test

### If app doesn't start:
1. Check Runtime Logs for error messages
2. Verify `start-combined.js` exists in repo
3. Check that build outputs exist:
   - `apps/api/dist/main.js`
   - `apps/web/.next`

---

## 📝 Important Notes

1. **Output Directory MUST be empty** - This tells Hostinger to run Node.js, not copy static files
2. **Start Command** runs `node start-combined.js` which starts both API and Web
3. **API runs on internal port** (4000) - not accessible from outside
4. **Web runs on Hostinger's assigned port** - this is what serves your website
5. **API is proxied** through Next.js rewrites at `/api/*`

---

## 🎯 Quick Reference

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start` |
| Output Directory | **(EMPTY)** |
| Root Directory | `./` |
| Node Version | `18.x` |

**Required Env Vars:**
- `NODE_ENV=production`
- `DATABASE_URL=...`
- `API_PORT=4000`
- `API_RUNNING_LOCALLY=true`
- `NEXT_PUBLIC_API_SAME_DOMAIN=true`
- `LANDING_ORIGIN=https://yourdomain.com`

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ Build completes successfully
- ✅ Runtime Logs show startup messages
- ✅ Application Status is "Running"
- ✅ Website loads (not 403)
- ✅ No errors in browser console

Good luck! 🚀

# Hostinger Environment Variables & Settings

## 📋 Environment Variables

Add these in Hostinger's **Environment Variables** section:

```env
# Required - Node Environment
NODE_ENV=production

# Required - Database Connection
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Required - API Port (internal, for NestJS)
API_PORT=4000

# Required - API Running Locally (enables Next.js rewrites)
API_RUNNING_LOCALLY=true

# Required - Same Domain (enables relative URLs)
NEXT_PUBLIC_API_SAME_DOMAIN=true

# Required - Landing Page Origin (for CORS)
LANDING_ORIGIN=https://yourdomain.com

# Optional - Admin Origin (if you deploy admin later)
ADMIN_ORIGIN=https://admin.yourdomain.com

# Optional - Portal Origin (if you deploy portal later)
PORTAL_ORIGIN=https://portal.yourdomain.com

# DO NOT SET - PORT (Hostinger sets this automatically)
# DO NOT SET - NEXT_PUBLIC_API_BASE_URL (leave empty/unset for relative URLs)
```

## ⚙️ Hostinger Deployment Settings

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
(LEAVE EMPTY)
```
**OR** if Hostinger requires a value:
```
/
```

**DO NOT SET:**
- ❌ `.next`
- ❌ `apps/web/.next`
- ❌ `public_html`
- ❌ Any path to build output

### Working Directory:
```
(LEAVE EMPTY)
```
**OR** if Hostinger requires a value:
```
/
```

### Node Version:
```
18.x
```
or
```
20.x
```

## 🔍 Important Notes

1. **PORT**: Do NOT set `PORT` manually. Hostinger assigns it automatically. The start script uses `process.env.PORT`.

2. **NEXT_PUBLIC_API_BASE_URL**: Leave this **UNSET** (empty). The code will use relative URLs when `NEXT_PUBLIC_API_SAME_DOMAIN=true`.

3. **API_PORT**: This is the internal port for the NestJS API. It defaults to `PORT + 1000` if not set.

4. **DATABASE_URL**: Replace with your actual Neon/Postgres connection string.

5. **LANDING_ORIGIN**: Replace `yourdomain.com` with your actual domain (e.g., `https://infinitysports.jo`).

## ✅ Verification

After setting these, redeploy and check Runtime Logs. You should see:
```
🚀 Starting Infinity Sports (API + Web)...
📡 API will run on port 4000 (internal)
🌐 Web will run on port [Hostinger assigned port]
✅ Build outputs verified
📡 Starting API...
🌐 Starting Web App...
```

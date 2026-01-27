# Hostinger Settings - Exact Configuration

## ⚠️ Important: Output Directory

**DO NOT set Output Directory to `/` or any path.**

For Node.js applications (like Next.js), the Output Directory should be:
- **LEAVE EMPTY** (blank/empty field)
- **OR** if Hostinger requires a value, use: `.` (single dot)

Setting it to `/` tells Hostinger to copy files to `public_html`, which is wrong for Node.js apps.

---

## ✅ Correct Hostinger Settings

### Framework Preset:
```
Next.js
```
(Or "Node.js" / "Custom" if Next.js option causes issues)

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
**OR** if Hostinger won't let you leave it empty:
```
.
```
(single dot - means current directory, but Hostinger won't copy files)

**DO NOT USE:**
- ❌ `/`
- ❌ `.next`
- ❌ `apps/web/.next`
- ❌ `public_html`
- ❌ Any path

### Package Manager:
```
npm
```

---

## 📋 Environment Variables

Set these in Hostinger's Environment Variables section:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
API_PORT=4000
API_RUNNING_LOCALLY=true
NEXT_PUBLIC_API_SAME_DOMAIN=true
LANDING_ORIGIN=https://yourdomain.com
```

**DO NOT SET:**
- `PORT` (Hostinger sets this automatically)
- `NEXT_PUBLIC_API_BASE_URL` (leave empty/unset)

---

## 🔧 Why Output Directory Matters

- **Empty/Blank**: Hostinger runs Node.js process (correct for Next.js)
- **`/` or any path**: Hostinger copies files to `public_html` (wrong for Next.js)
- **`.next` path**: Hostinger tries to copy build output (wrong for Next.js)

Next.js needs to **run** as a Node.js process, not be **copied** as static files.

---

## ✅ After Setting These

1. Save the settings
2. Redeploy
3. Check Runtime Logs - you should see:
   ```
   🚀 Starting Infinity Sports (API + Web)...
   ✅ Build outputs verified
   📡 Starting API...
   🌐 Starting Web App...
   ```

4. Application Status should be "Running"
5. Website should load (not 403)

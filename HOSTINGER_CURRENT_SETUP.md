# Fix Current Hostinger Configuration

## ⚠️ Critical Issues to Fix

### 1. Output Directory (MUST FIX)
Currently set to: `.next` ❌
Should be: **(EMPTY/BLANK)** ✅

### 2. Build Command (SHOULD FIX)
Currently set to: `npm run build`
Should be: `npm install && npm run build`

---

## ✅ Step-by-Step Fix

### Step 1: Fix Build and Output Settings

1. Click the **"Change"** button next to "Build and output settings"
2. In the dialog that opens:

   **Build command:**
   ```
   npm install && npm run build
   ```

   **Output directory:**
   ```
   (DELETE .next and leave EMPTY)
   ```
   ⚠️ **CRITICAL:** Clear the `.next` field completely - leave it blank!

   **Package manager:**
   ```
   npm
   ```
   (This is already correct)

3. Click **"Finish"**

---

### Step 2: (Optional) Change Framework Preset

If you see the option, try changing:
- **Framework preset:** From "Next.js" to **"Node.js"** or **"Custom"**

This helps avoid auto-detection issues with monorepos.

---

### Step 3: Add Environment Variables

Click **"Add"** next to "Environment variables" and add:

```env
NODE_ENV=production
```

```env
DATABASE_URL=your_database_connection_string
```

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
LANDING_ORIGIN=https://infinitysportsjo.com
```

---

### Step 4: Verify Settings

Before deploying, make sure:
- ✅ Output directory is **EMPTY** (not `.next`)
- ✅ Build command is `npm install && npm run build`
- ✅ Root directory is `./`
- ✅ Node version is `18.x`
- ✅ Environment variables are added

---

## 🚀 Then Deploy

Once all settings are correct, proceed with deployment!

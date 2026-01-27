# Hostinger Production Environment Variables

## ✅ Required Environment Variables (Production)

For production, use the **external API** (infinitysport.onrender.com), not local API.

### 1. NODE_ENV
- **Variable Name:** `NODE_ENV`
- **Value:** `production`

### 2. DATABASE_URL
- **Variable Name:** `DATABASE_URL`
- **Value:** `postgresql://neondb_owner:npg_nZdJDv0WuIx7@ep-calm-mountain-ahustq8p-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require`

### 3. LANDING_ORIGIN
- **Variable Name:** `LANDING_ORIGIN`
- **Value:** `https://infinitysportsjo.com`

---

## ❌ DO NOT SET These (Production)

- **`API_RUNNING_LOCALLY`** - Not needed, using external API
- **`API_PORT`** - Not needed, using external API
- **`NEXT_PUBLIC_API_SAME_DOMAIN`** - Not needed, using external API
- **`NEXT_PUBLIC_API_BASE_URL`** - Not needed, defaults to infinitysport.onrender.com
- **`PORT`** - Hostinger sets this automatically

---

## 📋 Final Environment Variables List

Only set these 3:

```
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_nZdJDv0WuIx7@ep-calm-mountain-ahustq8p-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
LANDING_ORIGIN=https://infinitysportsjo.com
```

---

## ⚙️ Hostinger Settings

### Start Command:
```
npm run start
```
(This runs only the web app, which connects to the external API)

### Build Command:
```
npm run build
```

### Output Directory:
```
. (or whatever Hostinger requires)
```

---

## 🔍 How It Works

1. Web app runs on Hostinger
2. Web app connects to external API at `https://infinitysport.onrender.com`
3. No local API needed - simpler setup!

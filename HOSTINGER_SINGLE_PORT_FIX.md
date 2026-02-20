# Hostinger Single PORT Fix

## ⚠️ The Problem

Hostinger provides **ONLY ONE port** via `process.env.PORT`. The app must use this single port, not multiple ports.

## ✅ Solution

Since Hostinger only provides one port, we're running **ONLY the Next.js web app** which:
1. Uses `process.env.PORT` automatically (Next.js does this by default)
2. Connects to external API (set API_BASE_URL to your deployed API URL)
3. No local API needed

## 📋 Current Configuration

### Start Command:
```
npm run start
```
This runs: `npm --workspace apps/web run start`
- Next.js automatically uses `process.env.PORT`
- No port configuration needed

### Environment Variables (Production):
```
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_nZdJDv0WuIx7@ep-calm-mountain-ahustq8p-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
LANDING_ORIGIN=https://infinitysportsjo.com
```

**DO NOT SET:**
- `PORT` (Hostinger sets this automatically)
- `API_PORT` (not needed - using external API)
- `API_RUNNING_LOCALLY` (not needed - using external API)

## ✅ What Was Fixed

1. **NestJS main.ts** - Updated to use `process.env.PORT` correctly (for future use)
2. **Start command** - Runs only web app (uses single PORT)
3. **API connection** - Uses external API (no local API needed)

## 🔍 How It Works

1. Hostinger sets `process.env.PORT` (e.g., 3000)
2. Next.js automatically uses this PORT
3. Web app connects to external API (API_BASE_URL)
4. Everything works with single port!

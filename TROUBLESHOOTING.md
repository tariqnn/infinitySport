# Troubleshooting Guide

## "Failed to fetch" Error in Admin App

If you see `TypeError: Failed to fetch` in the admin app, it means the admin app cannot connect to the API server.

### Solution 1: Make sure API server is running

1. **Check if API is running:**
   - Open a terminal
   - Run: `npm run dev:api`
   - You should see: `🚀 API server running on http://localhost:4000`

2. **Test API connection:**
   - Open browser: http://localhost:4000/api/health
   - You should see JSON with `"database": "connected"`

### Solution 2: Restart Admin App

After starting the API:
1. Stop the admin app (Ctrl+C)
2. Restart it: `npm run dev:admin`
3. Refresh the browser

### Solution 3: Check Environment Variables

The admin app needs to know where the API is. Make sure:

1. **Root `.env` file exists** with:
   ```
   NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
   ```

2. **Or create `apps/admin/.env.local`** with:
   ```
   NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
   ```

### Solution 4: Check CORS

The API should allow requests from `http://localhost:3001` (admin app).

Check `apps/api/src/main.ts` - it should have:
```typescript
app.enableCors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: false,
});
```

### Quick Fix Checklist

- [ ] API server is running (`npm run dev:api`)
- [ ] API responds at http://localhost:4000/api/health
- [ ] Admin app restarted after API started
- [ ] Environment variable `NEXT_PUBLIC_API_BASE_URL` is set
- [ ] Browser console shows the actual error (check Network tab)

### Test API Manually

Open browser console and run:
```javascript
fetch('http://localhost:4000/api/admin/hero')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

If this works, the API is fine and it's a Next.js issue. If it fails, the API isn't running or there's a CORS issue.


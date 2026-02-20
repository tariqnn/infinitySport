# Deploying API + Landing Page Together on Hostinger

## Option 1: Combined Deployment (Recommended for Same Server)

This runs both the NestJS API and Next.js web app on the same Hostinger server.

### Setup Steps:

1. **Build Settings in Hostinger:**
   - **Build Command:** `npm install && npm run build:hostinger`
   - **Start Command:** `npm run start:hostinger`
   - **Output Directory:** `apps/web/.next`
   - **Node Version:** 18.18.0 or higher

2. **Environment Variables:**
   ```
   NODE_ENV=production
   API_PORT=4000
   PORT=3000
   DATABASE_URL=your_database_url
   LANDING_ORIGIN=https://yourdomain.com
   ADMIN_ORIGIN=https://admin.yourdomain.com
   PORTAL_ORIGIN=https://portal.yourdomain.com
   NEXT_PUBLIC_API_BASE_URL=
   NEXT_PUBLIC_API_SAME_DOMAIN=true
   API_RUNNING_LOCALLY=true
   ```
   
   **Note:** Setting `NEXT_PUBLIC_API_BASE_URL` to empty and `NEXT_PUBLIC_API_SAME_DOMAIN=true` makes the web app use relative URLs, which will be proxied to the local API via Next.js rewrites.

3. **How It Works:**
   - The `start-combined.js` script runs both processes:
     - NestJS API on port 4000 (internal)
     - Next.js web app on port 3000 (public)
   - Next.js rewrites proxy `/api/*` requests to the NestJS API
   - Both run in the same deployment

### Important Notes:

- **Port Configuration:** Hostinger will assign a port automatically. The script uses:
  - `PORT` environment variable for Next.js (Hostinger will set this)
  - `API_PORT` for the NestJS API (defaults to 4000)
- **API Access:** The API will be accessible at `https://yourdomain.com/api/*` (proxied through Next.js)
- **Direct API Access:** If you need direct API access, use Option 2 (subdomain)

---

## Option 2: Separate Deployments (Recommended for Production)

Deploy API and web app separately for better scalability and isolation.

### Step 1: Deploy API on Subdomain

1. **Create a new deployment in Hostinger:**
   - Subdomain: `api.yourdomain.com`
   - Framework: Node.js

2. **Build Settings:**
   - **Build Command:** `npm install && npm run prisma:generate && npm run build:api`
   - **Start Command:** `npm run start:api`
   - **Root Directory:** (keep at root)

3. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=your_database_url
   LANDING_ORIGIN=https://yourdomain.com
   ADMIN_ORIGIN=https://admin.yourdomain.com
   PORTAL_ORIGIN=https://portal.yourdomain.com
   ```

### Step 2: Deploy Web App on Main Domain

1. **Update Web App Environment Variables:**
   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
   ```

2. **Build Settings (already configured):**
   - **Build Command:** `npm install && npm run build:hostinger`
   - **Start Command:** `npm run start:hostinger:web-only`
   - **Output Directory:** `apps/web/.next`

### Step 3: Update CORS in API

The API already includes CORS configuration. Make sure your domain is in the allowed origins in `apps/api/src/main.ts`.

---

## Option 3: Use External API (Current Setup)

If your API is already deployed elsewhere (e.g., Render), just update the web app:

1. **Environment Variables in Hostinger (Web App):**
   ```
   NEXT_PUBLIC_API_BASE_URL=https://your-api-url.com
   ```

2. **No changes needed** - the web app already defaults to this.

---

## Troubleshooting

### Both Services Won't Start

- Check that both `apps/api/dist/main.js` and `apps/web/.next` exist after build
- Verify ports are not conflicting
- Check Hostinger logs for specific errors

### API Not Accessible

- If using Option 1: Check that Next.js rewrites are working
- If using Option 2: Verify subdomain DNS is configured correctly
- Check CORS settings in API

### Database Connection Issues

- Ensure `DATABASE_URL` is set correctly
- Verify database allows connections from Hostinger's IP
- Check Prisma client is generated (`npm run prisma:generate`)

---

## Recommended Approach

For production, **Option 2 (Separate Deployments)** is recommended because:
- Better scalability (scale API and web independently)
- Easier debugging and monitoring
- Better security isolation
- Can use different hosting for each (API on Render/Railway, Web on Hostinger)

For quick setup or testing, **Option 1 (Combined)** works well.

# Web app (landing) deployment

## Bookings and registrations: direct DB vs API

1. **When `DATABASE_URL` is set** → writes directly to the database (same as admin/portal).
2. **When `DATABASE_URL` is not set** → calls the external API (often fails in production if API URL is wrong).

## If DATABASE_URL is set but it still doesn’t work in production

### 1. Check production logs

After a failed booking or registration, check your **server/hosting logs**. You should see one of:

- `[booking] DB create failed: <message>` 
- `[package-registrations] DB create failed: <message>`

Use that message to fix the issue (see below).

### 2. Prisma client must be generated in the build

The web app uses the **root** Prisma schema (`prisma/schema.prisma`). The build that deploys the web app must run **Prisma generate** before building, so the client is available at runtime.

- From **repo root**: `npm run prisma:generate` then build the web app (e.g. `npm run build:web`), or use `npm run build:hostinger` which does both.
- If your host only runs `npm run build` inside `apps/web`, add a prebuild step that runs `npx prisma generate --schema=../prisma/schema.prisma` (or from root: `prisma:generate` then build). Otherwise the app may not have the correct Prisma client and DB calls can fail.

### 3. Database connection in production

- Use the **same** `DATABASE_URL` as your API (e.g. Neon).
- If the host uses **serverless** (e.g. Vercel), use the **pooled** connection string if Neon provides one (e.g. `...-pooler.xxx.neon.tech...`) to avoid too many connections.
- Some providers need SSL: add `?sslmode=require` to the URL if you see SSL-related errors in the logs.

### 4. Env available at runtime

`DATABASE_URL` must be set in the **runtime** environment of the web app (not only in the build). On Vercel/Hostinger/etc., set it in the project/host environment variables so it’s present when the API routes run.

### 5. Red slots (full/blocked) not showing in production

The booking form grays out or marks red the slots that are blocked or already booked. That data comes from:

- `GET /api/booking/blocked-slots`
- `GET /api/booking/booked-slots`

When `DATABASE_URL` is set, these routes read from the database. If they fail (e.g. Prisma not generated, connection error), they return empty data and **no red slots** will show.

**Check production logs** when red slots work locally but not in production. You may see:

- `[blocked-slots] DB read failed: <message>`
- `[booked-slots] DB read failed: <message>`

Fix the cause (same as above: ensure Prisma is generated in the build, `DATABASE_URL` is correct and available at runtime, and connection/SSL works).

# Infinity Sports API - Vercel Deployment

## Vercel Configuration

This API is configured for Vercel serverless deployment.

### Important: Vercel Project Settings

**CRITICAL: You must configure the following in your Vercel project settings:**

1. **Root Directory**: Set to `apps/api` ⚠️ **This is the most important setting!**
   - Go to your Vercel project → Settings → General
   - Under "Root Directory", enter: `apps/api`
   - This prevents Vercel from trying to install dependencies from the monorepo root

2. **Framework Preset**: Other
3. **Build Command**: `npm run build` (or leave default - vercel.json will handle it)
4. **Output Directory**: Leave empty (vercel.json handles this)
5. **Install Command**: Leave default (vercel.json uses `--no-workspaces` to prevent monorepo issues)

### Environment Variables

Make sure to set the following environment variables in Vercel:
- `DATABASE_URL` - Your Prisma database connection string
- `LANDING_ORIGIN` - Your landing page URL (optional)
- `ADMIN_ORIGIN` - Your admin URL (optional)
- `PORTAL_ORIGIN` - Your portal URL (optional)
- Any other environment variables your API needs

### How It Works

- The `api/index.ts` file is the serverless entry point that wraps the NestJS application
- The `vercel.json` configures Vercel to use the `@vercel/node` runtime
- All routes are proxied to the NestJS app through the serverless handler

### Local Development

For local development, use:
```bash
npm run dev
```

This uses the standard NestJS development server, not the Vercel serverless handler.

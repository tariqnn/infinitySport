# Infinity Sports API - Vercel Deployment

## Vercel Configuration

This API is configured for Vercel serverless deployment.

### Important: Vercel Project Settings

**You must configure the following in your Vercel project settings:**

1. **Root Directory**: Set to `apps/api`
2. **Framework Preset**: Other
3. **Build Command**: `npm run build` (or leave default)
4. **Output Directory**: `dist` (or leave empty)
5. **Install Command**: `npm install` (or leave default)

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

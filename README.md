## Infinity Sports Monorepo

- `apps/web` - Public website (landing)
- `apps/admin` - Admin dashboard
- `apps/portal` - Staff/operations portal
- `packages/ui` - Shared UI components
- `packages/types` - Shared types

All apps read/write directly to the same Neon Postgres database through Prisma.

## Prerequisites

- Node.js 20+
- npm 9+
- Neon Postgres `DATABASE_URL`

## Environment

Create `.env` in repo root:

```bash
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
```

## Install

```bash
npm install
npm run prisma:generate
```

## Development

Run all three apps:

```bash
npm run dev:web    # http://localhost:3000
npm run dev:admin  # http://localhost:3001
npm run dev:portal # http://localhost:3002
```

Or use:

```bash
./start-all.ps1
```

## Database

```bash
npm run prisma:migrate
npm run prisma:seed
```

## Build

```bash
npm run build:web
npm run build:admin
npm run build:portal
```

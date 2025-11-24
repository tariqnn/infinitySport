## Infinity Sports Monorepo

- apps/web — Public website (Landing)
- apps/admin — Admin dashboard (CMS)
- apps/api — NestJS backend API
- apps/portal — Employee portal
- packages/ui — Shared UI components
- packages/types — Shared types and zod schemas
- packages/config — Shared Tailwind/TS config
- packages/mock-api — Mock data and helpers (legacy, being replaced by API)

## Backend Setup

### Prerequisites
- Node.js 18.18+
- npm 9+
- Neon Postgres database (free tier)

### 1. Create Neon Postgres Database

1. Go to [Neon](https://neon.tech) and sign up/login
2. Create a new project
3. Copy the connection string (DATABASE_URL)
   - Format: `postgresql://user:password@host:5432/database?sslmode=require`

### 2. Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# API Configuration
PORT=4000
LANDING_ORIGIN=http://localhost:3000
ADMIN_ORIGIN=http://localhost:3001

# Frontend API Base URL (for landing and admin apps)
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Setup Database

```bash
# Generate Prisma Client
cd prisma
npm install
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed the database
npx prisma db seed
```

### 5. Development

Run all services:

```bash
# Terminal 1: API (http://localhost:4000)
npm run dev:api

# Terminal 2: Landing (http://localhost:3000)
npm run dev:web

# Terminal 3: Admin (http://localhost:3001)
npm run dev:admin

# Terminal 4: Portal (http://localhost:3002)
npm run dev:portal
```

Or use the root dev command for just the landing site:

```bash
npm run dev
```

## API Endpoints

### Public Endpoints (Landing Site)

- `GET /api/public/landing` - Get all landing content
- `GET /api/public/events/upcoming` - Get upcoming events
- `GET /api/public/offers` - Get all offers

### Admin Endpoints (CMS)

For each content type (hero, programs, offers, events, announcements, facilities, footer-links):

- `GET /api/admin/<type>` - List all
- `GET /api/admin/<type>/:id` - Get one
- `POST /api/admin/<type>` - Create
- `PATCH /api/admin/<type>/:id` - Update
- `DELETE /api/admin/<type>/:id` - Delete

Example:
- `GET /api/admin/programs`
- `POST /api/admin/programs`
- `PATCH /api/admin/programs/:id`
- `DELETE /api/admin/programs/:id`

## Database Schema

The database includes the following models:

- `HeroSection` - Hero content (title, subtitle, CTAs, background)
- `Program` - Training programs
- `Offer` - Membership offers/pricing
- `Event` - Upcoming events
- `Announcement` - Site announcements
- `FacilityHighlight` - Facility showcases
- `FooterLink` - Footer navigation links

## Build

```bash
npm run build
```

## Notes

- The landing site now reads all content from the backend API
- The admin CMS manages content via the API endpoints
- Admin auth is currently mocked (can be enhanced later)
- All landing content is stored in PostgreSQL via Prisma

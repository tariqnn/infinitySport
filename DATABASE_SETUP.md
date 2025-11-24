# Database Setup Guide

Follow these steps to get your database working:

## Step 1: Create a Neon Postgres Database

1. **Go to Neon**: Visit [https://neon.tech](https://neon.tech) and sign up/login (it's free)

2. **Create a new project**:
   - Click "Create Project"
   - Give it a name (e.g., "infinity-sports")
   - Select a region close to you
   - Click "Create Project"

3. **Get your connection string**:
   - After creating the project, you'll see a connection string
   - It looks like: `postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require`
   - **Copy this connection string** - you'll need it in the next step

## Step 2: Set Up Environment Variables

1. **Create a `.env` file** in the root directory of your project:
   ```
   C:\Users\tariq\OneDrive\Desktop\infinty sport(nino)\.env
   ```

2. **Add your environment variables** to the `.env` file:
   ```env
   # Database - Replace with your Neon connection string
   DATABASE_URL="postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require"

   # API Configuration
   PORT=4000
   LANDING_ORIGIN=http://localhost:3000
   ADMIN_ORIGIN=http://localhost:3001

   # Frontend API Base URL
   NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
   ```

   **Important**: Replace the `DATABASE_URL` with the actual connection string from Neon!

## Step 3: Install Dependencies

Open a terminal in your project root and run:

```bash
npm install
```

This will install all dependencies including Prisma and NestJS packages.

## Step 4: Generate Prisma Client

```bash
npm run prisma:generate
```

This generates the Prisma Client that your API will use to interact with the database.

## Step 5: Run Database Migrations

This creates all the tables in your database:

```bash
npm run prisma:migrate
```

When prompted, give it a migration name like `init` or just press Enter.

## Step 6: Seed the Database

This populates your database with example data:

```bash
npm run prisma:seed
```

You should see output like:
```
🌱 Seeding database...
✅ Created hero section
✅ Created 4 programs
✅ Created 3 offers
✅ Created 3 events
✅ Created 2 announcements
✅ Created 3 facility highlights
✅ Created 5 footer links
✨ Seeding completed!
```

## Step 7: Verify Everything Works

1. **Start the API server**:
   ```bash
   npm run dev:api
   ```
   You should see: `🚀 API server running on http://localhost:4000`

2. **Test the API** (in another terminal or browser):
   ```bash
   curl http://localhost:4000/api/public/landing
   ```
   Or open in browser: http://localhost:4000/api/public/landing

   You should see JSON data with hero, programs, offers, etc.

3. **Optional - Open Prisma Studio** (visual database browser):
   ```bash
   npm run prisma:studio
   ```
   This opens a web interface at http://localhost:5555 where you can view/edit your data.

## Troubleshooting

### Error: "Can't reach database server"
- Check your `DATABASE_URL` is correct
- Make sure you copied the full connection string from Neon
- Verify the connection string includes `?sslmode=require` at the end

### Error: "Prisma Client not generated"
- Run `npm run prisma:generate` again
- Make sure you ran `npm install` first

### Error: "Migration failed"
- Check your `DATABASE_URL` is correct
- Make sure the database exists in Neon
- Try running `npm run prisma:migrate` again

### Error: "Module not found: @prisma/client"
- Run `npm install` in the root directory
- Run `npm run prisma:generate`
- Make sure you're in the project root when running commands

## Quick Start (All Steps at Once)

If you want to do everything in one go:

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npm run prisma:generate

# 3. Run migrations and seed (this does both)
npm run db:setup
```

Then start your API:
```bash
npm run dev:api
```

## Next Steps

Once your database is working:

1. **Start the API**: `npm run dev:api` (runs on port 4000)
2. **Start the Landing site**: `npm run dev:web` (runs on port 3000)
3. **Start the Admin CMS**: `npm run dev:admin` (runs on port 3001)

The landing site will now read from your database, and you can manage content through the admin panel!


# How to Verify Database Connection

## Quick Test - Health Check Endpoint

After starting the API server, visit:

**http://localhost:4000/api/health**

This will show you:
- ✅ Database connection status
- 📊 Count of records in each table
- 🕐 Timestamp

### Expected Response (if connected):
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-11-21T...",
  "data": {
    "hero": 1,
    "programs": 4,
    "offers": 3,
    "events": 3,
    "announcements": 2,
    "facilities": 3,
    "footerLinks": 5
  },
  "message": "Database is connected and working! ✅"
}
```

### If Not Connected:
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "...",
  "message": "Database connection failed! ❌"
}
```

## Method 2: Check Seed Script Output

When you run the seed script, it will test the connection first:

```bash
npm run prisma:seed
```

You should see:
```
🌱 Seeding database...
📡 Testing database connection...
✅ Database connection successful!
✅ Created hero section
✅ Created 4 programs
...
✨ Seeding completed!
```

## Method 3: Test Landing Endpoint

Visit: **http://localhost:4000/api/public/landing**

If you see JSON data with hero, programs, offers, etc., the database is connected!

## Method 4: Prisma Studio (Visual)

```bash
npm run prisma:studio
```

Opens a web interface at http://localhost:5555 where you can browse your database tables visually.


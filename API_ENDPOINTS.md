# API Endpoints Reference

## Base URL
All endpoints are prefixed with `/api`

## Public Endpoints (for Landing Site)

### Get All Landing Content
```
GET http://localhost:4000/api/public/landing
```
Returns all content: hero, programs, offers, events, announcements, facilities, footer links

### Get Upcoming Events
```
GET http://localhost:4000/api/public/events/upcoming
```

### Get All Offers
```
GET http://localhost:4000/api/public/offers
```

## Admin Endpoints (for CMS)

### Hero Section
- `GET /api/admin/hero` - Get hero content
- `PATCH /api/admin/hero` - Update hero content

### Programs
- `GET /api/admin/programs` - List all programs
- `GET /api/admin/programs/:id` - Get one program
- `POST /api/admin/programs` - Create program
- `PATCH /api/admin/programs/:id` - Update program
- `DELETE /api/admin/programs/:id` - Delete program

### Offers
- `GET /api/admin/offers` - List all offers
- `GET /api/admin/offers/:id` - Get one offer
- `POST /api/admin/offers` - Create offer
- `PATCH /api/admin/offers/:id` - Update offer
- `DELETE /api/admin/offers/:id` - Delete offer

### Events
- `GET /api/admin/events` - List all events
- `GET /api/admin/events/:id` - Get one event
- `POST /api/admin/events` - Create event
- `PATCH /api/admin/events/:id` - Update event
- `DELETE /api/admin/events/:id` - Delete event

### Announcements
- `GET /api/admin/announcements` - List all announcements
- `GET /api/admin/announcements/:id` - Get one announcement
- `POST /api/admin/announcements` - Create announcement
- `PATCH /api/admin/announcements/:id` - Update announcement
- `DELETE /api/admin/announcements/:id` - Delete announcement

### Facilities
- `GET /api/admin/facilities` - List all facilities
- `GET /api/admin/facilities/:id` - Get one facility
- `POST /api/admin/facilities` - Create facility
- `PATCH /api/admin/facilities/:id` - Update facility
- `DELETE /api/admin/facilities/:id` - Delete facility

### Footer Links
- `GET /api/admin/footer-links` - List all footer links
- `GET /api/admin/footer-links/:id` - Get one footer link
- `POST /api/admin/footer-links` - Create footer link
- `PATCH /api/admin/footer-links/:id` - Update footer link
- `DELETE /api/admin/footer-links/:id` - Delete footer link

## Quick Test

1. **Start API**: `npm run dev:api`
2. **Visit**: http://localhost:4000/api (shows API info)
3. **Visit**: http://localhost:4000/api/public/landing (shows all data)


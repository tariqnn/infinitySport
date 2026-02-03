# Mobile App Booking – What to Copy

Give this doc to the other Cursor so the mobile app matches the landing booking flow and shows “From mobile app” in the admin.

---

## 1. Copy: Config (mobile app only)

**Put only this in the mobile app:**

```
API_BASE_URL = http://localhost:4000
```


**Do not put in the app:** database URL, DATABASE_URL, API keys, MongoDB/Mongoose. The app only calls the API over HTTP.

---

## 2. Copy: API endpoints (path prefix `/api/portal`)

| What | Method | URL |
|------|--------|-----|
| Company ID for booking | GET | `{API_BASE_URL}/api/portal/booking-defaults` |
| Blocked slots | GET | `{API_BASE_URL}/api/portal/blocked-slots` |
| Bookings (list / booked slots) | GET | `{API_BASE_URL}/api/portal/bookings?startDate=ISO&endDate=ISO` |
| Create booking | POST | `{API_BASE_URL}/api/portal/bookings` |

No API keys or auth headers. Use `Content-Type: application/json` on POST.

---

## 3. Copy: Courts (same as landing)

| Court ID | facilityArea (send this in POST) |
|----------|-----------------------------------|
| `basketball-ac` | `Basketball AC` |
| `basketball-3x3` | `Basketball 3x3` |
| `padel` | `Padel` |
| `volleyball` | `Volleyball` |

---

## 4. Copy: Notes for “from mobile app” in admin

When creating a booking from the app, set in the POST body:

```
"notes": "Booking from mobile app"
```

Exactly that string so the admin shows the “Mobile app” badge.

---

## 5. Copy: POST body to create a booking

**POST** `{API_BASE_URL}/api/portal/bookings`  
**Header:** `Content-Type: application/json`

**Body (replace placeholders):**

```json
{
  "company": { "connect": { "id": "<companyId from GET booking-defaults>" } },
  "startTime": "<ISO 8601, e.g. 2025-01-28T15:00:00.000Z>",
  "endTime": "<startTime + 1 hour, ISO 8601>",
  "status": "PENDING",
  "isPaid": false,
  "facilityArea": "Basketball AC",
  "customerName": "<user name>",
  "customerPhone": "<user phone>",
  "customerEmail": "<user email or null>",
  "notes": "Booking from mobile app"
}
```

`facilityArea` = one of: `Basketball AC`, `Basketball 3x3`, `Padel`, `Volleyball`.

---

## 6. Flow (what to implement)

1. **Company ID** – GET `booking-defaults` once; cache `companyId`; use in every POST.
2. **Blocked slots** – GET `blocked-slots`. For each row with `isBlocked === true`, add `time` to blocked set for that `dayOfWeek` + `courtType`. Disable those slots in the UI (dayOfWeek from selected date, e.g. `MONDAY`).
3. **Booked slots** – GET `bookings?startDate=&endDate=` (e.g. today to today+30 in ISO). For each non-CANCELLED booking, get date + time from `startTime`, court from `facilityArea`; build booked map; disable those slots.
4. **Courts** – Same four as in section 3. User picks one.
5. **Time slots** – 07:00–23:00 + 00:00. Sun–Thu: only 15:00 onwards. Fri–Sat: all. Today: disable past times. Date range: today → today+30.
6. **Form** – Name, phone (required), email (optional), court, date, time. Validate: required, valid phone, date ≥ today, slot not blocked and not booked.
7. **Submit** – POST body as in section 5. On 201 show success; on 4xx/5xx show response `message` or `error`.

---

## 7. Landing page colors (use in the app)

Copy these hex values so the app matches the landing page:

| Use | Hex |
|-----|-----|
| **Primary blue** (buttons, links, accents) | `#141AFF` |
| **Primary button / CTA** (main buttons on landing) | `#003DA5` |
| **Light blue** (borders, subtle bg) | `#6BA5E8` |
| **Green primary** (success, highlights) | `#60D066` |
| **Green dark** (labels, muted text) | `#1A4D3A` |
| **Black** (text) | `#000000` |
| **White / background** | `#FFFFFF` |
| **Background light** | `#F8F9FA` |

Optional: blue light `#4A7FFF`, blue dark `#0A1F8C`, green light `#7FE885`, teal `#4DD4C4`.

---

## 8. Backend (not for the app)

This project uses **PostgreSQL + Prisma**, env `DATABASE_URL`. The mobile app does not use the database or DATABASE_URL; it only uses the API base URL above.

# Bookings API – Mobile App Reference

Use this API so the mobile app shows the **same bookings** as the admin dashboard. All data is stored in the database; admin and mobile share one source of truth.

**Important:** The **mobile app and admin must use the same API base URL**. If the mobile creates bookings on one server (e.g. production) and the admin points to another (e.g. localhost), the admin won’t see those bookings. If they use the same URL, list/delete in the admin will work for mobile-created bookings.

---

## 1. Base URL & Path

| Environment | Base URL |
|-------------|----------|
| **Local**   | `http://localhost:4000` |
| **Production** | Your deployed API URL (e.g. `https://your-api.onrender.com`) |

**Path prefix:** `/api/portal`

Example: list bookings → `GET {baseUrl}/api/portal/bookings`

---

## 2. List Bookings (same list as admin)

**GET** `/api/portal/bookings`

**Query parameters (optional):**

| Param       | Type   | Description |
|------------|--------|-------------|
| `companyId` | string | Filter by company ID |
| `startDate` | string | ISO 8601 start (e.g. `2025-01-28T00:00:00.000Z`) |
| `endDate`   | string | ISO 8601 end (e.g. `2025-01-28T23:59:59.999Z`) |

**Examples:**
- All bookings: `GET /api/portal/bookings`
- One day: `GET /api/portal/bookings?startDate=2025-01-28T00:00:00.000Z&endDate=2025-01-28T23:59:59.999Z`
- Date range: same pattern with your start/end

**Response:** `200 OK` – JSON array of booking objects (see shape below).

---

## 3. Get One Booking

**GET** `/api/portal/bookings/:id`

**Response:** `200 OK` – single booking object (same shape as list items, with full relations).

---

## 4. Response shape (list & single booking)

Each booking in the list (and from GET by id) looks like:

```json
{
  "id": "clxx...",
  "companyId": "clxx...",
  "classId": null,
  "coachId": null,
  "programId": null,
  "facilityId": null,
  "memberId": null,
  "facilityArea": "Basketball AC",
  "startTime": "2025-01-28T10:00:00.000Z",
  "endTime": "2025-01-28T11:00:00.000Z",
  "status": "PENDING",
  "isPaid": false,
  "customerName": "John Doe",
  "customerPhone": "+962 7 9000 1234",
  "customerEmail": "john@example.com",
  "notes": null,
  "createdAt": "2025-01-27T12:00:00.000Z",
  "updatedAt": "2025-01-27T12:00:00.000Z",
  "company": { "id": "...", "name": "Infinity Sports" },
  "program": null,
  "facility": null,
  "member": { "id": "...", "firstName": "John", "lastName": "Doe" },
  "class": null,
  "coach": null
}
```

**Fields you’ll use most:**

| Field           | Type    | Description |
|-----------------|---------|-------------|
| `id`            | string  | Booking ID |
| `startTime`     | string  | ISO 8601 start |
| `endTime`       | string  | ISO 8601 end |
| `facilityArea`  | string? | Court/facility (e.g. "Basketball AC", "Padel") |
| `status`        | string  | `PENDING` \| `CONFIRMED` \| `CANCELLED` \| `COMPLETED` |
| `isPaid`        | boolean | Payment flag |
| `customerName`  | string? | Public booking name |
| `customerPhone` | string? | Public booking phone |
| `customerEmail` | string? | Public booking email |
| `notes`         | string? | Free text |
| `company`       | object  | `{ id, name }` |
| `member`        | object? | `{ id, firstName, lastName }` when linked to a member |

---

## 5. Create Booking – what to change in the app

**Why booking from the app doesn’t work:**  
The API **requires a company ID** for every booking. If the app doesn’t send `company` (or `companyId`), the request fails.

**Do this in the app:**

### Step 1: Get the company ID (once, then cache it)

**GET** `{baseUrl}/api/portal/booking-defaults`

**Response:** `200 OK`
```json
{ "companyId": "clxxxxxxxxxxxxxxxxx" }
```

Use this `companyId` in every **POST** create-booking request. You can call this once at app startup and store the value.

If you get **404** or “No company found”, create a company in the admin (or via POST `/api/portal/companies`) first.

### Step 2: Create the booking

**POST** `{baseUrl}/api/portal/bookings`  
**Headers:** `Content-Type: application/json`  
**Body:** JSON. **Required:** `company` (using the id from step 1), `startTime`, `endTime`. All times must be **ISO 8601** (e.g. `2025-01-28T10:00:00.000Z`).

**Example body (use this shape in the app):**
```json
{
  "company": { "connect": { "id": "PASTE_COMPANY_ID_FROM_STEP_1" } },
  "startTime": "2025-01-28T10:00:00.000Z",
  "endTime": "2025-01-28T11:00:00.000Z",
  "status": "PENDING",
  "facilityArea": "Basketball AC",
  "customerName": "Jane Doe",
  "customerPhone": "+962 7 9000 5678",
  "customerEmail": "jane@example.com",
  "notes": null
}
```

**Optional relations:**  
`member: { connect: { id: "memberId" } }`, `class: { connect: { id: "classId" } }`, `coach: { connect: { id: "coachId" } }`, `program: { connect: { id: "programId" } }`, `facility: { connect: { id: "facilityId" } }`.

**Response:** `201` – created booking (same shape as list/single booking).

### Checklist in the app

| Check | What to do |
|-------|------------|
| Base URL | Same as admin, e.g. `http://localhost:4000` or your production API URL. No trailing slash. |
| Path | Exactly `/api/portal/bookings` (with `/api` prefix). |
| Headers | `Content-Type: application/json` on POST. |
| Company | Always include `"company": { "connect": { "id": "<companyId>" } }` using the id from GET `/api/portal/booking-defaults`. |
| Dates | `startTime` and `endTime` as ISO 8601 strings (e.g. `new Date().toISOString()` in JS). |
| Errors | If POST returns 4xx/5xx, read the response body `message` and fix the payload (missing company, invalid date, etc.). |

---

## 6. Update Booking (optional)

**PATCH** `/api/portal/bookings/:id`  
**Headers:** `Content-Type: application/json`  
**Body:** JSON with only fields to change, e.g.:

```json
{
  "status": "CONFIRMED",
  "isPaid": true,
  "facilityArea": "Court 1",
  "notes": "Updated note"
}
```

**Response:** `200 OK` – updated booking.

---

## 7. Delete Booking (optional)

**DELETE** `/api/portal/bookings/:id`  
**Response:** `204 No Content` (no body).

---

## 8. Mobile app checklist

1. **Base URL** – Use the same API URL as the admin (env/config).
2. **List bookings** – `GET /api/portal/bookings` with optional `startDate` and `endDate` (same as admin “Day” view).
3. **Parse response** – Array of objects with `id`, `startTime`, `endTime`, `facilityArea`, `status`, `isPaid`, `customerName`, `customerPhone`, `customerEmail`, `notes`, and nested `company`, `member` as needed.
4. **Dates** – All times are ISO 8601 (e.g. `2025-01-28T10:00:00.000Z`). Convert to local time in the app for display.
5. **CORS** – If the API is on a different domain, ensure the server allows your app’s origin (already configured for common origins).

Using this, the mobile app will show the same bookings as the admin.

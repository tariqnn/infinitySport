# Infinity Sports App Reference

Use this document when building a **separate app** (booking, player tracing, subscriptions) so it can connect to the landing page and portal API and match the landing page design.

---

## 1. API Connection

### Base URL

- **Env variable:** `NEXT_PUBLIC_API_BASE_URL` (optional)
- **Defaults:**
  - Development: `http://localhost:4000`
  - Production: your deployed API URL (set `NEXT_PUBLIC_API_BASE_URL` or `API_BASE_URL`)

### CORS

API allows these origins (add your app’s origin if needed in API `main.ts`):

- `http://localhost:3000` (landing)
- `http://localhost:3001` (admin)
- `http://localhost:3002` (portal)
- `http://localhost:3003` (your app)
- Production URLs as configured

### Headers

- **Portal/company-scoped requests:** `x-company-id: <companyId>` (required for portal endpoints)
- **Content-Type:** `application/json` for JSON bodies

### Global prefix

All API routes are under **`/api`**. Full base for portal: `{API_BASE_URL}/api`.

---

## 2. API Endpoints

### Public (Landing – no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/public/landing` | Full landing content (hero, footer, etc.) |
| GET | `/api/public/programs` | Programs list |
| GET | `/api/public/offers` | Offers/packages |
| GET | `/api/public/events` | Events |
| GET | `/api/public/events/upcoming` | Upcoming events |
| GET | `/api/public/announcements` | Announcements |
| GET | `/api/public/facilities` | Facilities |

### Portal (company-scoped – send `x-company-id`)

Base path: **`/api/portal`**

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/portal/companies` | List / create companies |
| GET/PATCH/DELETE | `/api/portal/companies/:id` | Get / update / delete company |
| GET/POST | `/api/portal/members` | List / create members |
| GET/PATCH/DELETE | `/api/portal/members/:id` | Get / update / delete member |
| GET/POST | `/api/portal/bookings` | List / create bookings (query: `companyId`, `startDate`, `endDate`) |
| GET/PATCH/DELETE | `/api/portal/bookings/:id` | Get / update / delete booking |
| GET | `/api/portal/blocked-slots` | Blocked time slots |
| PATCH | `/api/portal/blocked-slots/:id` | Update blocked slot |
| GET/POST | `/api/portal/subscriptions` | List / create subscriptions |
| GET/PATCH/DELETE | `/api/portal/subscriptions/:id` | Get / update / delete subscription |
| GET/POST | `/api/portal/invoices` | List / create invoices |
| GET/PATCH/DELETE | `/api/portal/invoices/:id` | Get / update / delete invoice |
| GET | `/api/portal/invoices/:id/pdf` | Invoice PDF |
| GET/POST | `/api/portal/coaches` | List / create coaches |
| GET/PATCH/DELETE | `/api/portal/coaches/:id` | Get / update / delete coach |
| GET/POST | `/api/portal/classes` | List / create classes |
| GET/PATCH/DELETE | `/api/portal/classes/:id` | Get / update / delete class |
| GET/POST/DELETE | `/api/portal/enrollments` | List / create / delete enrollments |
| GET | `/api/portal/dashboard/stats` | Dashboard stats (query: `companyId`) |
| GET/POST | `/api/portal/settings/:companyId` | Get / create / update settings |

### Public booking (from landing)

Landing uses **Next.js API routes** that proxy to the backend. For a separate app you can either:

- Call your Next landing’s routes, e.g. `POST /api/booking` (with body: `courtId`, `courtName`, `date`, `time`, `name`, `email?`, `phone`), or  
- Call the API directly if you expose a public booking endpoint (currently landing uses internal API + `companyId` for creating the booking).

Booking creation body (conceptually):

```json
{
  "courtId": "basketball-ac",
  "courtName": "Basketball AC",
  "date": "2025-02-01",
  "time": "17:00",
  "name": "Player Name",
  "email": "optional@example.com",
  "phone": "+962791234567"
}
```

Blocked slots (for availability): `GET /api/portal/blocked-slots`.  
Booked slots: use `GET /api/portal/bookings?companyId=...&startDate=...&endDate=...` and filter by `facilityArea` / time.

---

## 3. Data Models (Prisma – for types/shapes)

### Company

```ts
{
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  phone?: string;
  industry?: string;
  size?: string;
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'INACTIVE';
  createdAt: string;  // ISO
  updatedAt: string;
}
```

### Member

```ts
{
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;  // ISO
  status: 'ACTIVE' | 'INACTIVE' | 'FROZEN' | 'EXPIRED';
  notes?: string;
  guardianName?: string;
  guardianPhone?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Booking

```ts
{
  id: string;
  companyId: string;
  classId?: string;
  coachId?: string;
  programId?: string;
  facilityId?: string;
  memberId?: string;
  facilityArea?: string;   // e.g. "Court 1", "Padel Court B"
  startTime: string;      // ISO DateTime
  endTime: string;        // ISO DateTime
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  isPaid: boolean;
  customerName?: string;  // public booking
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Subscription

```ts
{
  id: string;
  companyId: string;
  offerId: string;
  memberId?: string;
  startDate: string;   // ISO
  endDate?: string;    // ISO
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';
  createdAt: string;
  updatedAt: string;
}
```

### Invoice

```ts
{
  id: string;
  companyId: string;
  memberId?: string;
  subscriptionId?: string;
  number: string;
  amount: number;
  amountPaid: number;
  currency: string;   // e.g. "JOD"
  status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate?: string;
  issuedAt: string;
  paidAt?: string;
  description?: string;
  companyEmail?: string;
  companyPhone?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}
```

### BlockedSlot (recurring availability)

```ts
{
  id: string;
  dayOfWeek: string;   // MONDAY, TUESDAY, ... SUNDAY
  courtType: string;   // Basketball AC, Basketball 3x3, Padel, Volleyball
  time: string;        // HH:MM e.g. 17:00
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Offer (for subscriptions)

```ts
{
  id: string;
  name: string;
  pricePerMonth: number;
  badge?: string;
  description: string;
  features: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. Design System (match landing page)

### Brand colors (use in Tailwind or CSS vars)

| Token | Hex | Usage |
|-------|-----|--------|
| `brand.black` | `#000000` | Text, headings |
| `brand.blue.primary` | `#141AFF` | Primary actions, links |
| `brand.blue.light` | `#4A7FFF` | Accents |
| `brand.blue.dark` | `#0A1F8C` | Dark accents |
| `brand.lightBlue` | `#6BA5E8` | Secondary, borders |
| `brand.green.primary` | `#60D066` | Success, highlights |
| `brand.green.light` | `#7FE885` | Light green |
| `brand.green.dark` | `#1A4D3A` | Dark green, labels |
| **Primary button (used in nav/CTAs)** | **`#003DA5`** | Buttons, nav active |

### Tailwind theme (extend)

```js
// theme.extend.colors
brand: {
  black: '#000000',
  blue: {
    primary: '#141AFF',
    light: '#4A7FFF',
    dark: '#0A1F8C',
  },
  lightBlue: '#6BA5E8',
  green: {
    primary: '#60D066',
    light: '#7FE885',
    dark: '#1A4D3A',
  },
  teal: '#4DD4C4',
}

// Buttons / nav (landing uses this blue)
// Use class: bg-[#003DA5] or same in CSS
```

### Background images (gradients)

```css
gradient-primary: linear-gradient(135deg, #141AFF 0%, #6BA5E8 50%, #60D066 100%);
gradient-button: linear-gradient(135deg, #141AFF 0%, #60D066 100%);
gradient-hero: linear-gradient(135deg, rgba(20,26,255,0.4) 0%, rgba(107,165,232,0.3) 50%, rgba(96,208,102,0.4) 100%);
```

### Shadows

```js
'card': '0 8px 32px rgba(0, 0, 0, 0.08)',
'card-hover': '0 16px 48px rgba(20, 26, 255, 0.2), 0 0 0 1px rgba(96, 208, 102, 0.1)',
'button': '0 8px 24px rgba(20, 26, 255, 0.35)',
'button-hover': '0 12px 32px rgba(20, 26, 255, 0.5), 0 0 24px rgba(96, 208, 102, 0.3)',
'navbar': '0 4px 24px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
```

### Typography

- **Sans / body:** `"Plus Jakarta Sans", Inter, system-ui, sans-serif`
- **Display / headings:** `"Space Grotesk", Inter, sans-serif`
- **Weights:** 400, 500, 600, 700, 800, 900 (use `font-display` for display font in Tailwind)

### Border radius

- **Cards:** `16px` (Tailwind: `rounded-card` or `rounded-2xl`)
- **Buttons:** `9999px` for pills (`rounded-full`), or `12px` (`rounded-xl`)

### Spacing / layout

- **Container:** `max-w-7xl mx-auto px-4 py-8 lg:px-8`
- **Cards:** `rounded-2xl border border-brand-lightBlue/20 bg-white p-6 shadow-card` (or `p-8`)
- **Primary button (landing style):** `rounded-full bg-[#003DA5] px-8 py-3 text-sm font-bold text-white shadow-button hover:shadow-button-hover hover:bg-[#003DA5]/90`
- **Secondary / outline:** `border-2 border-brand-lightBlue text-brand-blue-primary hover:border-brand-green-primary hover:text-brand-green-primary`

### Fonts (Google or local)

- **Plus Jakarta Sans:** https://fonts.google.com/specimen/Plus+Jakarta+Sans  
- **Space Grotesk:** https://fonts.google.com/specimen/Space+Grotesk  

Include in HTML or your app’s layout.

---

## 5. Environment variables (your app)

```env
# API (required for data)
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

# If your app runs on a different port, add it to API CORS (e.g. http://localhost:3003)
```

---

## 6. Quick checklist for your separate app

1. Set **API base URL** and call `{API_BASE_URL}/api/...` for all requests.
2. For **portal** features (members, bookings, subscriptions, invoices): send **`x-company-id`** and use **`/api/portal/...`** routes.
3. For **public** content (programs, events, facilities): use **`/api/public/...`** (no auth).
4. Use **same brand colors, fonts, shadows, and button/card classes** above so the app matches the landing page.
5. Use the **data shapes** in §3 for TypeScript types or API response handling.

This gives you everything needed to connect the new app to the landing and portal and keep the same design.

---

## 7. Booking sync – what to add so booking is the same

To have **the same booking** in your app as on the landing (same courts, same slots, same API), add the following. All booking data goes to the **same API**; no `x-company-id` is sent for **fetching** blocked/booked slots or for **creating** the booking (the API uses the first company or creates one).

### 7.1 API base URL

Use the same as §1. Example:

```ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '');
```

### 7.2 Courts (same list and IDs)

Use these **exact** `id` and `type` values so blocked/booked logic matches:

| id             | type           |
|----------------|----------------|
| `basketball-ac`| Basketball AC  |
| `basketball-3x3` | Basketball 3x3 |
| `padel`        | Padel          |
| `volleyball`   | Volleyball     |

```ts
type CourtType = 'Basketball AC' | 'Basketball 3x3' | 'Padel' | 'Volleyball';

const COURTS: { id: string; name: string; type: CourtType }[] = [
  { id: 'basketball-ac', name: 'Basketball AC', type: 'Basketball AC' },
  { id: 'basketball-3x3', name: 'Basketball 3x3', type: 'Basketball 3x3' },
  { id: 'padel', name: 'Padel', type: 'Padel' },
  { id: 'volleyball', name: 'Volleyball', type: 'Volleyball' },
];

function courtTypeForId(courtId: string): CourtType | null {
  const c = COURTS.find((x) => x.id === courtId);
  return c ? c.type : null;
}
```

### 7.3 Shared courts (same physical space)

When **Basketball AC** or **Volleyball** is booked/blocked, the other must be treated as unavailable:

```ts
const SHARED_COURT_GROUPS: CourtType[][] = [['Basketball AC', 'Volleyball']];

function getSharedCourtTypes(type: CourtType): CourtType[] {
  for (const group of SHARED_COURT_GROUPS) {
    if (group.includes(type)) return group;
  }
  return [type];
}
```

Use `getSharedCourtTypes` when checking blocked slots and booked slots (see below).

### 7.4 Time slots (same as landing)

- **Slots:** 07:00–23:00 every hour, plus `00:00` at the end.
- **Sunday–Thursday:** only show slots from **15:00 (3pm)** onwards (and `00:00`).
- **Friday–Saturday:** show all slots.

```ts
const TIME_SLOTS = [
  '07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00','00:00'
];

function dayKey(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
}

function getAvailableTimeSlots(selectedDate: string, today: string): string[] {
  const day = dayKey(selectedDate);
  const isWeekday = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY'].includes(day);
  let slots = TIME_SLOTS;
  if (isWeekday) {
    slots = TIME_SLOTS.filter((t) => {
      const [h] = t.split(':').map(Number);
      const mins = (h || 0) * 60;
      return mins >= 15 * 60 || t === '00:00';
    });
  }
  if (selectedDate === today) {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    slots = slots.filter((t) => {
      const [h] = t.split(':').map(Number);
      return (h || 0) * 60 > currentMins;
    });
  }
  return slots;
}
```

### 7.5 Fetch blocked slots (same API as landing)

**GET** `{API_BASE}/api/portal/blocked-slots` — no auth.

Response: array of `{ dayOfWeek, courtType, time, isBlocked }`.  
Build a map: `blocked[dayOfWeek][courtType] = time[]` for rows where `isBlocked === true`.  
When checking if a slot is blocked, use **all** `getSharedCourtTypes(court.type)` and treat the slot blocked if any of those court types has that time in `blocked[day][courtType]`.

### 7.6 Fetch booked slots (same API as landing)

**GET** `{API_BASE}/api/portal/bookings?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` — no auth.

Response: array of bookings with `facilityArea`, `startTime`, `status`.  
- Ignore `status === 'CANCELLED'`.  
- For each booking, get date as `YYYY-MM-DD` and time as `HH:00` from `startTime`.  
- Build: `booked[dateStr][courtType].push(timeStr)` (only for `facilityArea` in your court types).  
When checking if a slot is booked, use **all** `getSharedCourtTypes(court.type)` and treat the slot booked if any of those types has that time in `booked[date][courtType]`.

### 7.7 Create booking (same API as landing)

Your app can either:

- **Option A – Call your landing’s API** (if you have a Next.js route):  
  **POST** `https://your-landing-domain.com/api/booking`  
  Body: `{ courtId, courtName, date, time, name, phone, email? }`  
  (Landing then uses the same API below and same company logic.)

- **Option B – Call the backend directly** (so it stays in sync with landing):

1. **Get or create company**  
   - GET `{API_BASE}/api/portal/companies`  
   - If empty: POST `{API_BASE}/api/portal/companies` with body  
     `{ name: 'Infinity Sporty', contactName: 'Infinity Sporty', contactEmail: 'infinitysportsacademyjo@gmail.com', status: 'ACTIVE' }`  
   - Use the first company’s `id` as `companyId`.

2. **Create booking**  
   POST `{API_BASE}/api/portal/bookings`  
   Headers: `Content-Type: application/json`  
   Body (use the **same** shape so backend stays in sync):

```json
{
  "company": { "connect": { "id": "<companyId>" } },
  "facilityArea": "<courtType or courtName>",
  "startTime": "<ISO datetime, e.g. 2025-02-01T17:00:00.000Z>",
  "endTime": "<startTime + 1 hour ISO>",
  "status": "PENDING",
  "isPaid": false,
  "customerName": "<name>",
  "customerPhone": "<phone>",
  "customerEmail": "<email or omit>",
  "notes": "Public booking from app"
}
```

- `facilityArea` must be the **court type** string (e.g. `Basketball AC`) so blocked/booked checks stay in sync.  
- `startTime` / `endTime`: same date as selected, time in ISO (backend accepts UTC; keep consistency with landing).

### 7.8 Phone validation (same as landing)

Use the **same rules** so invalid numbers are rejected in both places:

- Required, must start with `+`.
- Reject dummy patterns (all same digit, 123456789, etc.).
- **Jordan (+962):** after `+962` must be 9 digits starting with `7` (e.g. `+962 7 9000 2200`).
- Other countries: 8–15 digits.

You can copy `lib/phoneValidation.ts` from the landing repo (`isValidPhoneNumber`, `formatPhoneNumber`) into your app, or reimplement these rules.

### 7.9 Fallback blocked (when API fails)

If the blocked-slots API fails, the landing uses this fallback so the form still shows some slots as unavailable. You can use the same in your app:

```ts
const FALLBACK_BLOCKED: Record<string, Partial<Record<CourtType, string[]>>> = {
  MONDAY:    { 'Basketball AC': ['17:00','18:00','19:00'], Volleyball: ['19:00'] },
  WEDNESDAY: { 'Basketball AC': ['17:00','18:00','19:00'] },
  FRIDAY:    { 'Basketball AC': ['10:00','11:00','12:00','22:00','23:00','00:00'] },
  SATURDAY:  { 'Basketball AC': ['17:00','18:00','19:00'], Volleyball: ['15:00','16:00'] },
  SUNDAY:    { Volleyball: ['15:00','16:00'] },
};
```

### 7.10 Summary checklist for booking sync

| What to add in your app | Purpose |
|-------------------------|--------|
| Same `API_BASE` / env   | Same backend as landing |
| Same courts (ids + types) | Same courts and labels |
| `courtTypeForId`, `getSharedCourtTypes` | Correct court type and shared-space logic |
| Same time slots + Sun–Thu from 3pm, Fri–Sat all | Same availability rules |
| GET blocked-slots → build `blocked[day][courtType][]` | Same blocked slots |
| GET bookings → build `booked[date][courtType][]`, use shared types | Same booked slots |
| Create booking: same company logic + same POST body | Same DB and sync with landing |
| Same phone validation   | Same validation as landing |
| Optional: same FALLBACK_BLOCKED | Same UX when API fails |

If you add these, your app’s booking will use the **same data and API** as the landing and stay synced.
`
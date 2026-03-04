# Infinity Sports Mobile App Requirements (From All 3 Websites)

## 1. Purpose
This document defines the full functional requirements extracted from the 3 existing web systems:
- `apps/web` (public website)
- `apps/admin` (content and booking management)
- `apps/portal` (operations and finance)

Goal: build a mobile app that reuses the same backend, data model, and business rules.

## 2. Source Systems and Responsibilities

### 2.1 Public Website (`apps/web`)
- Public brand and marketing pages.
- Public booking flow for courts.
- Package registration flow.
- Public contact flow.
- Bilingual UI (English/Arabic).

### 2.2 Admin Dashboard (`apps/admin`)
- CMS for landing content (hero, programs, coaches, offers, events, announcements, facilities, footer).
- Media upload management.
- Booking operations (list, edit, status, paid/unpaid, receipt print).
- Booking availability/blocked slot management.

### 2.3 Portal (`apps/portal`)
- Daily operations platform.
- Members, classes, coaches, subscriptions, bookings.
- Package registrations and receipts.
- Financial modules (budget, invoices, cashflow, petty cash).
- Settings and company-scoped operations.

## 3. Global Requirements for Mobile

### 3.1 Single Backend Requirement
- Mobile must use the same backend and database used by all websites.
- Do not duplicate booking logic locally.
- All create/update actions must go through existing APIs.

### 3.2 Company Scope
- Most portal endpoints are company-scoped.
- Mobile must send `x-company-id` for company-scoped API calls.
- App must fetch/create first company once (then cache ID securely).

### 3.3 Booking Data Consistency
- Mobile booking must use same court IDs, slot logic, blocked-slot checks, and conflict rules.
- Booking records from mobile must be visible in admin/portal immediately.
- Booking source should be tagged as app-origin when supported (`APP`/notes/source metadata).

### 3.4 Language
- Mobile must support English and Arabic.
- UI direction must switch LTR/RTL.

### 3.5 Roles
- Guest user: public content + public booking + package registration.
- Member user: member profile, invoices, receipts, package status (phase-based).
- Staff/admin user: operational workflows (optional phase).

## 4. Functional Requirements by Domain

## 4.1 Public Content (from `web` + `admin`)
- Show home/hero content.
- Show programs/sports/facilities/coaches/offers/events/announcements/footer links.
- Content should be API-driven from admin-managed resources.
- Images/videos should render from uploaded media URLs.

Acceptance:
- Changes in admin CMS appear in mobile without app update.

## 4.2 Court Booking (Critical)

### 4.2.1 Court Catalog
- Use existing shared court IDs and names:
  - Basketball AC (`basketball_ac`)
  - Basketball 3x3 (`basketball_3x3`)
  - Padel Court (`padel`)
  - Volleyball Court (`volleyball`)

### 4.2.2 Booking Inputs
- Required:
  - `courtId`, `courtName`, `date`, `time`, `name`, `phone`
- Optional:
  - `email`, `notes`, `duration`, `sportType`, `source` (when supported)

### 4.2.3 Validation Rules
- Date cannot be in the past.
- Date selectable range: today to +30 days.
- Slot generation and visibility:
  - Hourly slots from 07:00 to 00:00.
  - Sun-Thu: from 15:00 onward.
  - Fri-Sat: full slot range.
- Duration options: 1h, 1.5h, 2h.
- Phone validation:
  - International format beginning with `+`.
  - Jordan numbers: `+962` with valid mobile pattern.
  - Reject fake/dummy patterns.

### 4.2.4 Availability and Conflict
- Before submit, mobile must fetch:
  - Blocked slots endpoint.
  - Booked slots endpoint.
- On submit, backend must re-validate conflicts and overlap (source of truth).
- If conflict occurs, show actionable error and force user to pick another slot.

### 4.2.5 Booking Status/Payments
- New public bookings default to pending/unpaid flow per backend.
- Staff-facing mobile phase can expose status update and payment posting via portal booking APIs.

Acceptance:
- A booking created on mobile appears in admin booking list with correct date/time/court.
- Conflicting slot cannot be created.

## 4.3 Blocked Slots / Availability (from `admin` + `portal`)
- Read blocked slots by court/date for user-facing disablement.
- Staff phase:
  - Create/update/delete blocked slots.
  - Support recurring block patterns where API supports it.

Acceptance:
- Blocking a slot in admin/portal makes it unavailable in mobile booking UI.

## 4.4 Package Registrations (from `web` + `portal`)
- User can submit package registration form with package selection and personal details.
- Backend stores pricing snapshot and registration metadata.
- Staff phase can:
  - Mark paid/unpaid.
  - Add/subtract sessions.
  - Re-register member.
  - View related receipts.

Acceptance:
- Registration appears in portal registrations list with correct package and member details.

## 4.5 Member Auth and Profile (from `portal`)
- Support member sign-in (email/password flow as implemented in portal API).
- Support first-time password setup/change flow endpoints.
- Show member profile, invoices, receipts, and receipt PDF links where available.

Acceptance:
- Logged-in member can view own invoices/receipts from live backend.

## 4.6 Receipts and Invoices
- Mobile should show receipt list and receipt detail.
- Support receipt PDF open/share.
- Staff phase: include receipt void action only if role/permissions allow.

## 4.7 Financials (from `portal`)
- Staff phase modules:
  - Budget
  - Invoices
  - Cashflow
  - Petty cash

Note:
- Treat as phase-2+ unless mobile is intended for internal management users.

## 4.8 CMS Operations in Mobile (Optional)
- If mobile is customer-facing only, do not include CMS edit screens.
- If requested, admin-role mobile can expose limited content update screens using admin CRUD endpoints.

## 5. API Requirements

### 5.1 Base URL
- Use one configurable API base URL via environment config.
- Development/staging/production URLs must be switchable without code changes.

### 5.2 Core Endpoints (minimum for MVP)
- Public content endpoints.
- Public booking endpoints:
  - create booking
  - blocked slots
  - booked slots
- Package registration create endpoint.
- Portal basics:
  - get/create company
  - member auth/me profile
  - member invoices/receipts

### 5.3 Headers and Identity
- Send `Content-Type: application/json`.
- Send `x-company-id` for company-scoped routes.
- Send auth token/header for member/staff protected routes.

### 5.4 Error Handling
- Standardize handling for:
  - `400` validation errors
  - `401/403` auth/permission errors
  - `404` resource not found
  - `409` booking conflicts (or conflict-style validation message)
  - `500` server errors

## 6. Data Model Requirements (Mobile Contracts)

Mobile models must align with Prisma-backed entities already in use:
- Company
- Booking
- BlockedSlot
- User/Member
- Package and PackageRegistration
- Receipt and Invoice
- Coach/Event/Offer/Facility landing models
- CourtRate and booking payment structures

Requirement:
- Do not invent alternate IDs or enum values.
- Reuse backend enums/status values exactly.

## 7. Non-Functional Requirements

### 7.1 Performance
- First screen load target: under 3 seconds on average 4G.
- Booking availability check response should feel real-time (loading states + retry).

### 7.2 Reliability
- Graceful fallback UI when booking availability endpoints fail.
- Idempotency guard in UI to prevent duplicate booking submits.

### 7.3 Security
- Store tokens in secure storage (platform keychain/keystore).
- Never log sensitive personal data in production logs.
- Enforce TLS-only API calls.

### 7.4 Observability
- Capture structured error logs for failed booking/register/payment flows.
- Track analytics events for:
  - booking started/submitted/success/failure
  - package registration started/submitted
  - member login success/failure

### 7.5 Accessibility
- Arabic RTL support.
- Minimum readable text size and sufficient color contrast.

## 8. Scope Decision: MVP vs Later Phases

## 8.1 Phase 1 (Recommended MVP)
- Public content browsing.
- Public court booking with full validation and blocked/booked sync.
- Package registration submission.
- Basic member login + profile + invoices/receipts view.
- EN/AR and RTL support.

## 8.2 Phase 2
- Staff booking operations:
  - edit status
  - payment posting
  - customer profile access
- Registrations management (mark paid/unpaid, session adjustments).
- Receipt detail workflows.

## 8.3 Phase 3
- Financial dashboards/actions.
- Limited admin CMS edits (if business requests it).
- Advanced internal tools from portal.

## 9. Known Gaps / Cautions
- Some portal modules are still mock/demo-oriented (e.g., news/calendar/docs/directory and salaries-like local behavior). Treat these as low-priority for mobile until backend contracts are finalized.
- Public contact flow in web has mixed implementation signals (UI wrapper mock vs API route available). Confirm desired production behavior before implementing contact in mobile.

## 10. QA Acceptance Checklist
- Booking created in mobile is visible in admin and portal immediately.
- Blocked slot in admin prevents mobile booking for same slot.
- Phone validation rejects invalid Jordan/international formats.
- Arabic layout is true RTL across key screens.
- Package registration submitted in mobile appears in portal registrations.
- Member receipts and invoices load correctly for authenticated member.
- All API errors display clear, user-safe messages.

## 11. Delivery Artifacts for Mobile Team
- API environment matrix (dev/stage/prod base URLs).
- Endpoint contract sheet (request/response examples).
- Shared enum/constants file (court IDs, statuses, sport types).
- UI flow map for:
  - guest booking
  - package registration
  - member login and receipts
- Test cases mapped to checklist above.


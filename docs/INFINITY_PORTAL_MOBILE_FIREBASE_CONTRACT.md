# Infinity Portal Mobile Firebase Contract

This document defines the Firebase collections used by the Flutter app (`Infinity Portal`) and the portal sync/backfill jobs.

The mobile app reads Firebase directly. The website/portal continues to use Neon/Postgres. Sync jobs mirror portal data into Firebase so both databases carry the same business data.

Recommended production flow:

1. Mobile app writes to Firestore inbox collections.
2. Firebase Functions send push notifications immediately from Firestore events.
3. Firebase Functions import app-origin inbox records directly into Postgres.
4. Firebase Functions write canonical `portalBookings` / `portalRegistrations` documents back to Firestore.
5. Portal sync routes remain useful for mirroring portal-origin database changes back into Firebase.

## Collections

- `portalBookings`: canonical booking feed for mobile read.
- `portalBookingConfig/current`: booking court metadata mirrored from portal DB.
- `portalBookingAvailability/current`: recurring blocked-slot snapshot mirrored from portal DB.
- `portalBookingInbox`: mobile booking writes awaiting portal/DB processing.
- `portalBookingActionInbox`: mobile booking confirmation/payment actions awaiting portal/DB processing.
- `portalRegistrations`: canonical registration feed for mobile read.
- `portalRegistrationConfig/current`: package catalog and canceled-session snapshot mirrored from portal DB.
- `portalRegistrationInbox`: mobile registration writes awaiting portal/DB processing.

## Booking Document (`portalBookings/{bookingId}`)

- `id` string
- `companyId` string
- `facilityArea` string|null
- `startTime` timestamp
- `endTime` timestamp
- `status` string (`PENDING`, `CONFIRMED`, `CANCELLED`, ...)
- `source` string (`WEBSITE`, `APP`, `ADMIN`)
- `isPaid` boolean
- `customerName` string|null
- `customerPhone` string|null (E.164 for WhatsApp, e.g. `+9627...`)
- `customerEmail` string|null
- `notes` string|null
- `financials` map
  - `totalHours` number|null
  - `totalAmount` number|null
  - `paidAmount` number|null
  - `refundAmount` number|null
  - `netPaid` number|null
  - `remainingAmount` number|null
  - `paymentStatus` string|null
  - `latestPaymentMethod` string|null
- `createdAt` timestamp
- `updatedAt` timestamp

## Booking Config Document (`portalBookingConfig/current`)

- `courts` array
  - `name` string
  - `hourlyRate` number
  - `rewardPointsPerHour` number
- `updatedAt` timestamp

## Booking Availability Document (`portalBookingAvailability/current`)

- `blockedSlots` array
  - `id` string
  - `dayOfWeek` string (`SUNDAY` ... `SATURDAY`)
  - `courtType` string
  - `time` string (`HH:mm`)
  - `isBlocked` boolean
  - `label` string|null
  - `startDate` string|null (`YYYY-MM-DD`)
  - `endDate` string|null (`YYYY-MM-DD`)
- `updatedAt` timestamp

## Booking Inbox Document (`portalBookingInbox/{id}`)

- booking fields from app submission
- processing fields written by portal:
  - `dbImported` boolean
  - `dbBookingId` string
  - `status` string (`SYNCED`, `CONFLICT`, `ERROR`, `PENDING`)
  - `syncError` string|null
  - `updatedAt` timestamp

## Booking Action Inbox Document (`portalBookingActionInbox/{id}`)

- `id` string
- `bookingId` string
- `actionType` string (`CONFIRM_BOOKING`, `COLLECT_PAYMENT`)
- `confirmBooking` boolean
- `paymentAmount` number|null
- `paymentMethod` string|null
- `source` string (`APP`)
- portal processor fields:
  - `status` (`PENDING`, `SYNCED`, `ERROR`)
  - `dbImported` boolean
  - `dbBookingId` string|null
  - `syncError` string|null
  - `syncNote` string|null
  - `updatedAt` timestamp

## Registration Document (`portalRegistrations/{registrationId}`)

- `id` string
- `packageName` string
- `customerName` string
- `customerPhone` string
- `customerEmail` string|null
- `isPaid` boolean
- `status` string (`ACTIVE`, `EXPIRED`, ...)
- `sessionsLeft` number|null
- `planLabel` string|null
- `periodStartsAt` timestamp|null
- `periodEndsAt` timestamp|null
- `isFrozen` boolean
- `basePriceJod` number
- `finalPriceJod` number
- `collected` number
- `discountType` string
- `discountValue` number|null
- `discountReason` string|null
- `sessionsBonus` number
- `nextPaymentDate` timestamp|null
- `source` string (`PORTAL_DB`, `APP`, `ADMIN`)
- `createdAt` timestamp
- `updatedAt` timestamp

## Registration Config Document (`portalRegistrationConfig/current`)

- `packages` array
  - `id` string
  - `sportType` string
  - `name` string
  - `description` string|null
  - `sessionsCount` number
  - `trackingType` string
  - `pricingType` string
  - `currentPriceJod` number
  - `isActive` boolean
  - `sortOrder` number
- `canceledSessions` array
  - `id` string
  - `packageName` string
  - `sessionDate` timestamp
  - `sessionDateIso` string (`YYYY-MM-DD`)
  - `reason` string
  - `reasonDetail` string|null
- `packagesUpdatedAt` timestamp
- `canceledSessionsUpdatedAt` timestamp

## Registration Inbox Document (`portalRegistrationInbox/{id}`)

- app-submitted registration payload
- processor status fields:
  - `status` (`PENDING`, `SYNCED`, `ERROR`)
  - `dbImported` boolean
  - `dbRegistrationId` string|null
  - `syncError` string|null
  - `updatedAt` timestamp

## Sync Jobs

- `GET /api/cron/sync-db-bookings?secret=...`
- `GET /api/cron/sync-db-registrations?secret=...`

Both use `CRON_SYNC_BOOKINGS_SECRET` in portal environment.

For direct Firestore-to-Postgres sync, set this Firebase Functions secret:

- `DATABASE_URL`: the Neon/Postgres connection string reachable by Firebase Functions

## Backfill Commands

- `npm run bookings:backfill:firebase`
- `npm run registrations:backfill:firebase`

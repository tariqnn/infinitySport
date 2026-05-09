# Infinity Portal Mobile (Flutter)

The mobile app now connects directly to Firebase. It does not require the portal HTTP API for bookings, registrations, or competition registrations.

## Firebase read/write model

- Reads bookings from `portalBookings`
- Reads booking court config from `portalBookingConfig/current`
- Reads recurring blocked slots from `portalBookingAvailability/current`
- Writes new booking requests to `portalBookingInbox`
- Reads registrations from `portalRegistrations`
- Reads package and canceled-session config from `portalRegistrationConfig/current`
- Writes new registration requests to `portalRegistrationInbox`
- Reads competition registrations from `portalCompetitionRegistrations`

The website/portal can keep using Neon/Postgres. Firebase acts as the mobile database, and the portal sync jobs keep both stores aligned.

For app-origin bookings, booking actions, and registrations, Firebase Functions can also import Firestore inbox data directly into Postgres. That removes the dependency on the portal site's in-process sync loop.

## Data migration

From the repo root, backfill existing portal data into Firebase:

- `npm run bookings:backfill:firebase`
- `npm run registrations:backfill:firebase`
- `npm run competitions:backfill:firebase`

Keep the mirror fresh by calling:

- `GET /api/cron/sync-db-bookings?secret=...`
- `GET /api/cron/sync-db-registrations?secret=...`

Both routes use `CRON_SYNC_BOOKINGS_SECRET`.

If you want Firebase Functions to import app-origin mobile writes directly into Postgres, set this Firebase Functions secret and deploy:

- `DATABASE_URL`

## Setup

1. Install Flutter SDK.
2. In this folder run `flutter pub get`.
3. Set the Firebase options in `lib/main.dart` to your Firebase project.
4. Add the Android/iOS Firebase app config files if you are building native binaries.
5. Run `flutter run`.

## Notifications

- The app subscribes devices to `infinity_portal_all`.
- Firebase Functions can broadcast booking, registration, and competition registration updates to that topic immediately when Firestore records are created.
- The same Firebase Functions can also write those app-origin records directly into Postgres, so the data shows in the portal even when the portal site is not running.
- No login is required.

# Infinity Portal Mobile (Flutter)

The mobile app now connects directly to Firebase. It does not require the portal HTTP API for bookings or registrations.

## Firebase read/write model

- Reads bookings from `portalBookings`
- Reads booking court config from `portalBookingConfig/current`
- Reads recurring blocked slots from `portalBookingAvailability/current`
- Writes new booking requests to `portalBookingInbox`
- Reads registrations from `portalRegistrations`
- Reads package and canceled-session config from `portalRegistrationConfig/current`
- Writes new registration requests to `portalRegistrationInbox`

The website/portal can keep using Neon/Postgres. Firebase acts as the mobile database, and the portal sync jobs keep both stores aligned.

## Data migration

From the repo root, backfill existing portal data into Firebase:

- `npm run bookings:backfill:firebase`
- `npm run registrations:backfill:firebase`

Keep the mirror fresh by calling:

- `GET /api/cron/sync-db-bookings?secret=...`
- `GET /api/cron/sync-db-registrations?secret=...`

Both routes use `CRON_SYNC_BOOKINGS_SECRET`.

## Setup

1. Install Flutter SDK.
2. In this folder run `flutter pub get`.
3. Set the Firebase options in `lib/main.dart` to your Firebase project.
4. Add the Android/iOS Firebase app config files if you are building native binaries.
5. Run `flutter run`.

## Notifications

- The app subscribes devices to `infinity_portal_all`.
- Firebase Functions can broadcast booking and registration updates to that topic.
- No login is required.

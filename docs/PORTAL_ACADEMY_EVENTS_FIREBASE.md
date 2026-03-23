# Academy events — Firebase contract (Infinity Track + admin)

Use this spec so the **Infinity Track** mobile app and **admin** stay aligned. The app reads events from Firestore; **clients cannot write** (security rules). The admin app creates/updates documents using the **Firebase Admin SDK** via `apps/admin/lib/academyEventsFirestore.ts` and `apps/admin/app/api/admin/[resource]/[[...id]]/route.ts`.

## Collection

- **Collection ID:** `academyEvents`
- **Document ID:** UUID (same id is dual-written to Postgres `Event` for the public website).

## Fields (per document)

| Field | Type | Required | Notes |
|--------|------|----------|-------|
| `title` | `string` | Yes | Event name shown in the app. |
| `location` | `string` | No | e.g. `Main Court`, `Basketball AC`. |
| `startAt` | `timestamp` | Strongly recommended | When the event starts. |
| `endAt` | `timestamp` | No | If set and in the past, the app may hide the event. |
| `description` | `string` | No | Detail text. |
| `published` | `bool` | Yes | **`true`** for the app to list the event and for “new event” notifications. |
| `imageUrl` | `string` | No | Extra field for the website admin; mobile may ignore. |
| `createdAt` | `timestamp` | Set on create | `FieldValue.serverTimestamp()`. |
| `updatedAt` | `timestamp` | Set on each update | `FieldValue.serverTimestamp()`. |

## Behaviour in the app (mobile)

1. **Listing:** Subscribes to `academyEvents`, filters **published** events with `startAt` on today or later (local), sorted by `startAt` ascending (up to three on home).
2. **Notifications:** New document IDs with `published == true` can trigger local notifications (first-run deduping applies).

## Admin environment

The admin app uses the same Firebase service account as the portal: set `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_PATH` in **`apps/admin/.env.local`** (or copy from `apps/portal/.env.local`).

## Website (Prisma)

Each create/update/delete also syncs **`Event`** in Postgres so `apps/web` continues to show events without reading Firestore.

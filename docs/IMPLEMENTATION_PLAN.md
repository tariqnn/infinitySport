# Implementation Plan: Admin-Driven Landing, Packages, Registrations, Sessions, Audit

**Non-negotiables:** Do not touch Invoice module. Sessions: HELD consumes 1 for everyone; CANCELED does not. Excuse/Slide = +1 with reason. Admin edits reflect on Landing + Portal. Price locking for paid periods. Discounts manual only + reason + audit. Scale to 1000+ rows.

---

## A) Admin modules control landing sections

| Section | DB model | Admin module | Landing source | Status |
|--------|----------|--------------|----------------|--------|
| Landing Content / SEO | FooterSettings (contact, socials) | landing-content, footer | GET /api/public/landing | ✅ landing uses API |
| Hero | HeroSection | hero | getLandingContent().hero | ✅ |
| Facilities | FacilityHighlight | facilities | getLandingContent().facilities | ✅ API exists; **web facilities page** was using fallback → fixed to use API |
| Coaches | Coach (company-scoped) or public Coach list | coaches | Coaches section | ⬜ Confirm public coaches API |
| Programs (disciplines) | Program | programs | getLandingContent().programs | ✅ |
| Packages (sellable) | **Package** (new) | packages (new or under Programs) | GET /api/public/packages | ⬜ Add Package + API |
| Offers | Offer | offers | getLandingContent().offers | ✅ |
| Events | Event | events | getLandingContent().events | ✅ |

**Tasks:** Add `order` to FacilityHighlight if missing. Ensure facilities/coaches/events/offers have `isActive` or equivalent for publish. Optional: draft vs publish (later).

---

## B) Packages (Programs) as single source of truth

- **Package** model: id, sportType, name, description, sessionsCount, trackingType (SESSIONS | DAYS | BOTH), pricingType (FIXED | MANUAL), currentPriceJod (nullable), timeSlots (JSON), isActive, sortOrder, updatedAt.
- **Admin:** CRUD packages, reorder, edit price (FIXED), MANUAL = "Contact for pricing", sessionsCount, timeSlots, trackingType.
- **Landing:** Render packages from GET /api/public/packages; FIXED shows currentPriceJod, MANUAL shows "Contact for pricing".
- **Portal:** Package selection + default price from Package table (replace PackagePricing usage over time).

---

## C) Price locking

- **Registration** snapshot fields: billingPeriodKey (e.g. YYYY-MM), basePriceJod, discountType, discountValue, discountReason, finalPriceJod, priceLockedUntil (optional).
- On create: FIXED → basePriceJod = Package.currentPriceJod snapshot; MANUAL → admin entry. finalPriceJod computed and stored.
- When Package.currentPriceJod changes: only new registrations / next periods; never overwrite existing registration finalPriceJod.

---

## D) People uniqueness + duplicate warning

- Unique key: **phone (normalized)**. Normalize on write (strip spaces, optional country code).
- On create person/registration: if phone exists → block and show existing; if email/name similarity → warn, offer to select existing.
- **Bulk add:** Report duplicates per row; partial success with failed-rows report (CSV optional).

---

## E) Duplicate registration protection

- Allow: one person, multiple packages (Basketball + Gymnastics).
- Block: duplicate ACTIVE registration for same person + same package + same billingPeriodKey (or overlapping dates).
- Optional: admin override with reason (stored, audited).

---

## F) Receipts + payment edge cases

- **Receipt:** status ACTIVE | VOIDED; voidReason required if VOIDED. createdBy. (Do not touch Invoice.)
- Partial payments: multiple ACTIVE receipts per registration. collected = sum(ACTIVE.amountPaid). expected = registration.finalPriceJod.
- Status: UNPAID / PARTIAL / PAID / OVERPAID.
- Reversal: VOID receipts with reason; do not “set Not Paid” without voiding.

---

## G) Manual discounts with audit

- Discounts on Registration only. If discountType != NONE: discountReason required; record discountAppliedBy, discountAppliedAt (and optionally discountAmountJod = base - final).

---

## H) Sessions: HELD / CANCELED + Excuse/Slide

- **ClassSession:** id, packageId or classId, date, status (HELD | CANCELED), cancelReason if CANCELED, createdBy, createdAt.
- **SessionAdjustment:** registrationId, classSessionId (optional), change (+1/-1), reason, createdBy. (Already exists; ensure used for excuse.)
- When ClassSession HELD: everyone in that package/period consumes 1. CANCELED: no consumption. Excuse/Slide: +1 adjustment with reason.
- **UI:** Replace “Record canceled day” with Class Sessions manager (Add HELD, Add CANCELED with reason). Row action “Excuse/Slide (+1)” with reason.

---

## I) Freeze rules

- **Freeze** model: id, registrationId, freezeFrom, freezeTo, reason, createdBy, createdAt. Support multiple freezes (log).
- Freeze pauses DAYS-based expiry only. Sessions still count when class held unless excused.

---

## J) Transfer registration

- Action “Transfer registration”: close old (status = TRANSFERRED), create new for new package. Optional: carry balance/sessions with reason. Audit.

---

## K) Performance (1000+ rows)

- Server-side pagination + filtering + sorting for registrations list.
- Summary via Prisma aggregates (no per-row loops).
- Optional: virtualization if no pagination.

---

## L) Audit log

- **AuditLog:** id, actorUserId, actionType, entityType, entityId, metadata (JSON), createdAt.
- Log: RECEIPT_CREATED, RECEIPT_VOIDED, DISCOUNT_APPLIED, SESSION_ADJUSTED, FREEZE_CREATED, TRANSFER_DONE, PRICE_CHANGED, BULK_IMPORT, etc.

---

## M) UI/UX

- Person drawer: all registrations, “Add packages” (multi-select).
- No horizontal scroll: sticky Actions column, truncate, overflow-x-hidden (done in Portal).
- Bulk add: per-row errors, partial success, failed-rows report (CSV optional).

---

## Implementation order (phases)

1. **Schema (DONE):** Package, AuditLog, Freeze, ClassSession; Receipt.status (ACTIVE|VOIDED); PackageRegistration (billingPeriodKey, priceLockedUntil, discountAppliedBy, discountAppliedAt, status ACTIVE|TRANSFERRED|EXPIRED); FacilityHighlight.order. **Run:** `npx prisma migrate dev --name add_package_audit_freeze_sessions` then `npx prisma generate`.
2. **Facilities (DONE):** Web `fetchFacilities()` now calls GET /api/public/facilities with fallback on error. Facilities page and landing use admin-driven data. `getFacilities()` orders by `order`.
3. **Package (API DONE):** Model + GET /api/public/packages + GET/POST/PATCH/DELETE /api/admin/packages. **Next:** Admin UI for Packages CRUD; Landing sports page and Portal to fetch and use packages from API (replace mock/hardcoded).
4. **Price locking:** Set snapshot + billingPeriodKey on create; never overwrite from Package.
5. **Receipt status:** Enforce ACTIVE/VOIDED, voidReason when voided; payment status derived.
6. **People/duplicate:** Normalize phone; duplicate check on create; bulk report.
7. **Sessions:** ClassSession CRUD, HELD/CANCELED; SessionAdjustment for excuse; computation.
8. **Freeze:** Freeze model + UI.
9. **Transfer:** Close old + create new + audit.
10. **Pagination + aggregates** for registrations.
11. **Audit logging** for key actions.
12. **Bulk add report** (per-row errors, optional CSV).

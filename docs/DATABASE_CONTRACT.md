# MongoDB data & consistency contract (from FRs + SQL reference)

`reference/dbcode.txt` is MySQL domain guidance only: never run it in Atlas. MongoDB has no SQL foreign keys, triggers or stored procedures. Implement invariants with schema validators, indexes, application checks and **transactions**. Names/types below are proposed and become frozen after Codex Phase 0.

## Collections
| Name | Required fields | Index and invariants |
|---|---|---|
| `users` | `_id`, `firstName`, `lastName`, `emailNormalized`, `phoneNormalized`, `passwordHash`, `role: CUSTOMER/ADMIN`, `status: ACTIVE/BLOCKED`, timestamps | unique normalized email and phone; store hash only; no public role assignment on registration |
| `ev_stations` | `_id`, `name`, address/city/state/postalCode, opening/closing local time, `timeZone`, status `ACTIVE/MAINTENANCE/INACTIVE`, timestamps | city/name searchable index; non-overnight hours, configured timezone; geolocation optional |
| `charging_slots` | `_id`, `stationId`, `slotNumber`, `connectorType` (`CCS2`,`CHAdeMO`,`TYPE2`,`GB_T`), `maxPowerKw`, `hourlyRate`, status, timestamps | unique (`stationId`,`slotNumber`); power>0, rate>=0; validates station exists |
| `bookings` | `_id`, `userId`, `slotId`, `startTime` UTC Date, `endTime` UTC Date, `ratePerHour`, status `CONFIRMED/CANCELLED/COMPLETED`, createdAt/updatedAt | unique partial active reservation index (`slotId`,`startTime`) for `status=CONFIRMED` ONLY, or more robust occupancy design below. Index user+start and slot+time. Immutable price snapshot |
| `payments` | `_id`, `bookingId`, `amount`, `method: MOCK`, `status: PAID/REFUNDED`, `transactionReference`, `paidAt`, timestamps | unique bookingId and transactionReference; never create payment detached from booking |

## Booking: critical correctness
Input `slotId`, station-local `startDateTime`; convert to UTC once; exactly 60 minutes; start must be in future and on whole hour; ensure entire `[start,end)` within operating hours; adjacent `[10,11)` and `[11,12)` allowed; non-active slot/station and blocked account rejected. All validations in backend.

**Race safety:** For fixed one-hour, hourly-aligned starts, overlapping valid time intervals always share identical `startTime` (after timezone canonicalization). Use atomic unique occupancy via partial unique (`slotId`,`startTime`) with an `active` discriminator or comparable strategy. Important subtlety: a booking that transitions to `COMPLETED` should not permit retroactive overlap, but starts are only future so already elapsed slots cannot be rebooked; future active availability sees only non-cancelled bookings. This must be documented/tested. Mongo duplicate key maps to 409, never 500. Multi-process concurrent test: exactly one accepted, one conflicts; use same station and truly simultaneous operations.

**Atomic payment:** `client.startSession().withTransaction(...)` for booking+payment writes; transaction must commit both or neither. Atlas must support transactions; no fallback to unsafe separate writes. Test forced failure after booking insertion and assert no booking remains. Mock references uniquely generated. Cancellation runs booking `CONFIRMED` -> `CANCELLED` and payment `PAID` -> `REFUNDED` in the *same transaction* with ownership, start-time precondition and optimistic guard; make second cancellation explicit 409. Freed occupancy allows another future booking. Handle retryable transactions or duplicates properly.

**Completion:** Confirmed booking whose `endTime <= now` becomes COMPLETED without changing payment PAID. Use idempotent bounded transition on booking-history/admin reads (or reliable on-start sweep) and test it. Cancelled stays CANCELLED. Prevent stale writes racing cancellation.

## Reports
- Usage per station = count bookings grouped by status, optionally time range; admin can see all bookings and payments.
- Revenue semantics: **gross = total original payment amounts for in-scope bookings, including subsequently refunded bookings; refunded = sum of REFUNDED amounts; net = gross - refunded**. Define date-filter dimension clearly (prefer payment `paidAt`) and use consistently. Use Mongo aggregation pipeline with joins/lookup or efficient service queries; avoid double counts from multiple slots. Test with a paid and refunded booking. Format money consistently in INR; avoid floating-point calculation errors (integer paise recommended or Decimal128, choose once).

## Seeding & demo
- `npm run db:seed` is idempotent; creates/updates indexes, admin, customer(s), active/maintenance stations, connector/slot examples, and optional dynamic future bookings. Do **not** ship SQL's fake `pbkdf2...saltsalt...hashhash` values as usable hashes or SQL past-dated `CONFIRMED` bookings. Demo admin/customer credentials are supplied through private environment variables or generated securely and distributed privately. Never log plaintext passwords by default. Don't overwrite existing customer passwords or wipe bookings on seed. Use stable seed identities/keys to prevent duplicates, seed-created flags if needed.
- Shared Atlas demo DB permitted; test environment must use isolated `MONGO_TEST_DB` or separate URI with safety guard rejecting test execution against live demo `MONGO_DB`. Test fixture teardown only touches tagged records created by that test, never deletes entire real DB.
- Atlas network access/credentials required on each laptop; `MONGO_URI` and `SESSION_SECRET` are private. `MONGO_DB=evsbs_demo` suggested, `MONGO_TEST_DB=evsbs_test_<suffix>` for tests. Verify Atlas transaction support as part of integration smoke.

## Migration/nonrequirements
No need to import legacy MySQL values or code. Mongo driver creates collections lazily, but index bootstrap must be deterministic and documented. Physical deletes not necessary for FRs; administrative deactivate is the required behavior. Do not enable dangerous public admin registration or destructive reset endpoint.

# FROZEN API v1 contract — implement these routes literally

This document fixes externally visible URL, payload, status, and access shapes to prevent frontend/backend divergence. Codex may add fields but must not rename/remove these without documenting a contract change and updating its consumers/tests. All requests/responses JSON (except HTML/static), all IDs MongoDB ObjectId strings. User-facing UI uses same-origin fetch with `credentials: 'same-origin'`. Responses never expose password hashes, token secrets, or database URLs.

## Response and error convention
Successful single resources: `{ "data": { ... } }`; successful collections: `{ "data": [...], "meta": {"count": N} }`; mutation: same successful single resource; logout: `204` empty body. Failures: `{ "error": { "code": "SOME_STABLE_CODE", "message": "safe human-readable explanation", "details": [] } }`. Never return 200 with embedded error. Consistently: 400 invalid payload/time/ID, 401 unauthenticated, 403 insufficient role or blocked session, 404 resource missing, 409 duplicate/conflict/state mismatch, 503 DB or optional cross-module dependency not available. `req.user` or equivalent is server-derived, NEVER accepted from request payload. All write endpoints require JSON and a valid same-origin CSRF defense; do not rely on CORS defaults alone. No public signup as ADMIN.

## Auth module `/api/auth`
- `POST /register` PUBLIC `{firstName,lastName,email,phone,password}` => `201 {data:{id,firstName,lastName,email,phone,role:'CUSTOMER',status:'ACTIVE'}}`; normalize identity; duplicate email/phone => 409 `IDENTITY_EXISTS` (don't expose unnecessary account details).
- `POST /login` PUBLIC `{email,password}` => `200 {data:{user:{id,firstName,lastName,email,role,status}}}` and HttpOnly signed/session cookie; blocked/invalid credentials => 401 or 403 consistently, with safe message. Set Secure cookie when HTTPS.
- `POST /logout` authenticated => 204 and invalidate session/cookie.
- `GET /me` authenticated => `{data:{id,firstName,lastName,email,role,status}}`; blocked user with previously valid cookie denied.
- User identity service contract: `requireUser(req,res,next)`, `requireAdmin`, `requireActiveCustomer`; alternatives with equivalent behavior allowed only if frozen in a single core contract prior to implementation. No client-controlled role.

## Stations module `/api/stations`
- `GET /?city=&name=` authenticated CUSTOMER or ADMIN => `{data:[{id,name,city,address,status,openingTime,closingTime,timeZone,...}],meta:{count}}`. No filters: ACTIVE ONLY. Filtered search: customer returns ACTIVE only; admin list may use separate admin endpoint for all statuses. Case-insensitive trimmed search; no arbitrary regex execution.
- `GET /:stationId` authenticated => `{data:{id,name,address,city,state,postalCode,openingTime,closingTime,timeZone,status,slots:[{id,slotNumber,connectorType,maxPowerKw,hourlyRatePaise,status}]}}`; details can show nonactive station/slots. No payment info.
- `GET /:stationId/availability?start=YYYY-MM-DDTHH:mm` authenticated => `{data:{stationId,startTime:<UTC ISO>,endTime:<UTC ISO>,slots:[{slotId,available,reason}]}}`. Parameter `start` is station-local *wall clock* (not browser timezone). Only canonical future on-hour starts accepted; invalid/out-of-hours => 400. If booking occupancy service not installed yet, return `503 DEPENDENCY_UNAVAILABLE` rather than claiming availability. For unavailable status give consistent machine-readable reason `STATION_INACTIVE|SLOT_INACTIVE|ALREADY_BOOKED`.

## Booking module `/api/bookings`
- `POST /` ACTIVE CUSTOMER `{slotId,start:'YYYY-MM-DDTHH:mm'}` => `201 {data:{id,slotId,userId,startTime:<UTC ISO>,endTime:<UTC ISO>,ratePerHourPaise,status:'CONFIRMED',payment:{id,amountPaise,status:'PAID',transactionReference}}}`. `start` is the station's local wall clock; server loads station timezone and converts it. Never trust userId, endTime, amount, status in client request. Validate exact future wall-clock whole hour; station/slot ACTIVE, hour fully within station operating window. One-hour occupancy conflict => 409 `SLOT_UNAVAILABLE`. Client MUST NOT be able to write a charge amount.
- `GET /my` ACTIVE CUSTOMER => `{data:[{id,station:{id,name},slot:{id,slotNumber,connectorType},startTime,endTime,status,amountPaise,paymentStatus}],meta:{count}}` sorted newest-first by startTime (tie breaker id). Must not leak another user's bookings.
- `POST /:bookingId/cancel` ACTIVE CUSTOMER owner only => `200 {data:{id,status:'CANCELLED',paymentStatus:'REFUNDED'}}`; cancellation only while CONFIRMED and `startTime > now`; 409 `CANNOT_CANCEL` otherwise. A customer cannot cancel someone else's booking (403 or 404 with no identity leak).
- No public booking-by-ID endpoint accessible cross-customer unless properly owner-guarded.

## Admin module `/api/admin`
ALL routes authenticated ADMIN, no customer access.
- `GET /stations` => list all stations including inactive.
- `POST /stations` => create station; body `{name,address,city,state,postalCode,openingTime,closingTime,timeZone?,status?}`. 201; validate nonovernight hours, valid timeZone, optional latitude/longitude bounds.
- `PATCH /stations/:stationId` => update allowed station fields, including status ACTIVE/MAINTENANCE/INACTIVE; no unrestricted Mongo update operators.
- `POST /stations/:stationId/slots` => `{slotNumber,connectorType,maxPowerKw,hourlyRatePaise,status?}` => 201; 409 if duplicate `(stationId,slotNumber)`.
- `PATCH /slots/:slotId` => update allowed charger attributes, including status, with validation.
- `GET /bookings` => all bookings with referenced station/slot/user where applicable, optional valid `from`/`to` filters.
- `GET /payments` => all payments and booking linkage, optional valid `from`/`to` filters.
- `GET /reports/stations?from=YYYY-MM-DD&to=YYYY-MM-DD` => `{data:[{stationId,stationName,totalBookings,confirmedBookings,completedBookings,cancelledBookings,grossRevenuePaise,refundedPaise,netRevenuePaise}]}` including stations with zero activity. Define date filter as payment `paidAt` inclusive start-of-day through exclusive end-of-next-day, using station reporting zone or explicit common `Asia/Kolkata` date interpretation; freeze one choice and test. `gross` counts all historically paid transaction amounts, even if later refunded; `net=gross-refunded`. Usage status counts should use the SAME cohort of payment-linked bookings; document this choice visibly.

## Core routes
- `GET /api/health` => 200 `{data:{status:'ok',database:'connected'}}` only if DB ping works, else 503 with safe error.
- `GET /api/modules` => `{data:[{id,version,state:'active'|'disabled'|'failed',reason?}]}` for discovered modules; zero modules is valid.
- `GET /` core index/static navigation, no blank screen when zero modules. `GET /modules/<id>/...` (or equivalent) static module UI namespace auto-mounted by discovery, never globally hand-edited.

## Time and money conventions
`hourlyRatePaise`, `ratePerHourPaise`, `amountPaise` integer INR paise; UI displays rupees. SQL historical rates `250.00` -> `25000` paise. UTC ISO strings for stored and returned instants; station-local `YYYY-MM-DDTHH:mm` input without offset interpreted via station `timeZone`. Demo station timezone `Asia/Kolkata` (no DST). Reject ambiguous/nonexistent local times for future additional timezones or explicitly limit supported zones to Asia/Kolkata for the project. Use half-open intervals `[start,end)`; same-slot consecutive bookings allowed.

## Contract tests mandatory
Tests assert routes, bodies, statuses, defensive no-role assignment, authentication enforcement, station-local time conversions, malformed ObjectIds, absent services => 503, admin create/edit working with booking rule changes, payments consistent with transaction outcomes. Freeze API examples in module tests before building UI.

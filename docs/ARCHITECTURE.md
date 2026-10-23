# Architecture and frozen module contract

## Goal and scope
Independent feature folders auto-discovered at runtime. Each PR preserves functioning core; features may be inactive pending dependencies. Prefer one Node.js process serving semantic HTML/CSS/JS and JSON API on same origin. No browser bundler necessary. Mongo Atlas is external and common to users; modules do not create separate servers.

## Reference layout (choose exact file names in Phase 0; then freeze)
```text
EVDRAFT/
  AGENTS.md  package.json  package-lock.json  .env.example  README.md
  src/core/{server,config,db,loader,http,contracts}/
  src/web/{index.html,base.css,shell.js}/
  modules/{auth,stations,bookings,admin}/
    module.json  index.js  api/  domain/  ui/
  tests/{core,modules/{auth,stations,bookings,admin},integration,fixtures}/
  scripts/{seed,verify-module,smoke}/
  docs/
```
If choosing `src/modules` instead of root `modules`, decide ONCE and document; don't mix paths. One source-of-truth manifest per module; no central registry or route list edits.

## Module discovery
Core scans dedicated feature directory for folders with valid `module.json`, verifies unique ID, semver or explicit contract version, dependencies and exported `register(context)` function. Explicit load order topologically sorted: `auth`, `stations`, `bookings`, `admin`. A missing required dependency disables that module with a clear reason in `/api/modules`; startup works with **zero installed modules**. Broken installed modules are reported and fail validation gates; don't silently skip bad code in release. UI navigation auto-derives visible module metadata, but all server routes enforce access separately. Root shell shows 'no modules installed' on zero modules.

## DI and public contracts
Module context exposes `{config, db, router, services, authenticate, authorize, errors, logger}` or equivalent documented stable API. Register only namespaced `GET/POST/PATCH /api/<module>/...` (may preserve intuitive `/api/auth`, `/api/stations`, `/api/bookings`, `/api/admin` and `/api/reports` public routes). Public `services` registry is initialized as each module registers; no direct imports into another module's private `domain/` or `api/` folders.
- Auth publishes `currentUser(req)`, `requireUser`, `requireAdmin`, `requireActiveCustomer`, and ownership check. Role/status constants stable.
- Stations publishes `findStation`, `findSlot`, `checkReservable(slotId, startTime)` and query APIs. Admin writes station/slot through a defined station management service, not private internals.
- Bookings publishes read-only booking/payment reporting service and safe `findSlotOccupancy`. Stations availability may depend on bookings occupancy. **Avoid cyclic startup dependencies:** expose an optional `occupancy` service or separate shared read-only persistence contract; station module registers independently, and availability uses the injected service when present. Freeze this design during Phase 0.
- Admin requires Auth, Stations and Bookings for complete dashboard; with missing dependencies disable gracefully.

## Interface rules
- Standard JSON envelopes for success/errors; HTTP: 400 validation, 401 unauthenticated, 403 unauthorized, 404 missing, 409 duplicate/conflict, 500 sanitized server errors; never leak credentials.
- API IDs are Mongo ObjectId strings; compare normalized IDs and reject malformed ones with 400.
- Dates: backend ISO 8601 instants in UTC; stations have explicit IANA time zones (default Asia/Kolkata for seeded demo), frontend collects local station date+time then converts consistently. Do not use browser user timezone implicitly for server business rules. Always operate on exact hour boundaries.
- Station hours within a single local day; first implementation explicitly rejects overnight opening spans rather than mishandling them. Define 24-hour station via open 00:00/close 24:00 representation, not SQL's 00:00:01 to 23:59:59 ambiguity. Determine DST correctness if adding non-India zones (outside scope).
- Auth via secure HttpOnly cookie (SameSite=Lax or stricter) and server validation; use strong, salted password hashing (Node scrypt/argon2/bcrypt subject to dependency choice). Reject blocked users at login and on protected request. CSRF protection for cookie-auth state-changing requests, suitable to same-origin application (Origin validation or CSRF token, document tradeoff). Limit login attempts, avoid password leakage and trust server role only.
- No source code changes on teammate's fresh clone. Env provides URI, DB name, secure cookie secret, port. Static files served from core plus module UI assets using module manifest. No dependency load from CDN needed for critical features.

## Feature ownership
`auth` / agamoze: FR01–03. `stations` / freezingswan: FR04–06 (availability reads booking occupancy through contract). `bookings` / akshitgawade: FR07–12. `admin` / advai1: FR13–15. All 4 own API, Mongo operations, UI and tests. Do not conflate physical Git push user with actual authorship of generated code.

## Compatibility gates
For each PR require valid manifest, no modified `src/core/`, no global dependency changes, module asset references resolve, no duplicate paths/IDs, no forbidden cross-module import, passes base test and module-specific acceptance, can run with any downstream missing module. Any unavoidable contract change is explicit, separate owner-approved integration change plus regression tests.

# Deterministic feature-module runtime contract

Avoid a powerful plugin system. Build a small predictable filesystem module loader. Root `modules/<id>/` is the sole installable unit, including its API+UI+domain code. Root `tests/modules/<id>/` contains its independent tests. Core must never import a feature module by a hardcoded filename nor rely on a centrally edited registry. Internal source relative imports are fine; importing another module's private files is not.

## Manifest and entrypoint (example; freeze this exact baseline)
`modules/auth/module.json`:
```json
{"id":"auth","version":"1.0.0","contractVersion":1,"dependsOn":[],"enabled":true,"entry":"index.js","nav":{"label":"Account","path":"/modules/auth/"}}
```
`modules/bookings/module.json` declares `dependsOn:["auth","stations"]`. `stations` depends on `auth` (station API requires authentication); `admin` depends on all three. `stations` availability requires optional booking occupancy *at request time*, not during startup. UI controls must hide/disable availability when dependency unavailable. If upstream auth not installed, stations is disabled but core continues to boot.

Entrypoint `index.js` exports `register(context)` synchronously or asynchronously; it registers namespaced routes and adds named exported services using a core-provided registry. Freeze ONE API (not an unbounded list of alternatives), e.g.:
```js
module.exports = {
  async register({router, db, config, services, errors, logger}) {
    // all feature endpoints registered on `router`, which core mounts under /api/<id>
    // services.provide('auth.requireUser', fn) etc; access only public services
  }
}
```
For `GET /api/admin/reports/stations`, admin router namespace handles it. Loader validates manifest against allowlisted `id` regex, `contractVersion=1`, unique route namespace, dependencies existing+enabled, path traversal protections; sorts dependencies topologically and detects cycles; catches failure and reports it in `/api/modules` without serving half-initialized routes. No `eval`; require only manifest-advertised local entry. Fail acceptance if installed modules registered partially or module boot crashes. Make `/api/modules` report all installed, enabled, disabled and failed modules including dependency reason.

## Inter-module service contract and ownership
- Core owns mongo connection, transactions helper (or safe pass-through to session), request JSON/error functions, cookie/session verifier framework, module loader. Core does **not** contain complete user, station or booking feature implementation.
- Auth owns `users` and exports `auth.requireUser`, `auth.requireAdmin`, `auth.requireActiveCustomer`, `auth.currentUser`; username/session lookup belongs to auth, not other modules.
- Stations owns `ev_stations` and `charging_slots`; exports `stations.getSlotWithStation(slotId)`, `stations.requireReservableSlot(slotId, localStart, session?)`, `stations.findStation(stationId)` and `stations.findSlot(slotId)`. Admin accesses stations via explicit `stations.createStation`, `stations.updateStation`, `stations.createSlot`, `stations.updateSlot`, not by requiring internal source files. These interfaces MUST receive and honor an optional Mongo session for booking-time validation inside transaction.
- Bookings owns `bookings` and `payments`; exports `bookings.isOccupied(slotId,startUtc,session?)`, `bookings.listAll`, `bookings.listPayments`, `bookings.reportStationCohorts`. Stations availability resolves `bookings.isOccupied` **dynamically per request** using `services.get('bookings.isOccupied')`, and returns 503 before bookings installed. Bookings does not call station availability endpoint; it calls stations reservability public service and enforces unique occupancy with DB index.
- Admin owns admin API/UI and delegates station writes and booking/payment reads/reports through published interfaces. Admin NEVER independently writes `bookings`, `payments`, `ev_stations` or `charging_slots`, preventing duplicated rules.

## Status and partial PRs
Stage each module with `enabled:false` until its PR contains a coherent runnable slice; flip `enabled:true` within an owned manifest when its required dependencies exist and tests pass. The source folder may exist while disabled, but that is not a successful FR implementation. No feature menu link to disabled module. Each accepted PR: start app, health ok, assert active modules work, run relevant backend tests. Core with zero modules is valid; overall FR completion judged only at final release.

## Routing and module-owned assets
Mount `router` at `/api/<id>` and module static `ui/` at `/modules/<id>/`; `GET /` core shell discovers nav from active manifest only. Auth module never exposes private auth logic client-side; browser fetch sends cookies only. Stable public route wrappers are fixed in API_CONTRACT.md. Use relative CSS/JS module URLs so cloned Windows path doesn't matter. Module CSS scoped by module container class to avoid cross-feature collisions.

## Structural test
Test copying each complete module folder into clean skeleton with needed dependencies, boot and inspect `GET /api/modules` and module routes; removing any module does not require source edits. Depending modules may disable (rather than boot broken) when upstream missing. Tests verify no feature PR touches root package.json/core/shared files, and that features do not import private sibling paths. Dependency versions pinned in skeleton. Do not implement dynamic hot reload: module discovery occurs on server start; restart after merging new module.

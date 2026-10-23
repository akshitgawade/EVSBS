# Cheap but strong testing plan — tests/ separate

Target few minutes of automated execution rather than repetitive LLM review. No actual test has been run by this handoff; Codex must create/run these. Minimize dependency count; prefer built-in `node:test`, `node:assert` and fetch, if possible. Test behavior rather than implementation details. Avoid full browser automation for routine checks.

## Directory
```text
tests/
  core/{boot.test.js,module-loader.test.js}
  modules/{auth,stations,bookings,admin}/*.test.js
  integration/{api-workflow.test.js,concurrency.test.js,atomicity.test.js,clean-clone.test.js}
  fixtures/{factory.js,db-safety.js}
```

## npm scripts required
`npm test` = quick unit/core/module tests (DB mocked or temporary isolated in-process fakes; no network). `npm run test:integration` = Atlas **test** database with strict safety guard. `npm run test:smoke` = lightweight running-server API health+module route and FR critical path; `npm run db:seed` = non-destructive idempotent demo seed. `npm start` = normal startup. `npm ci` = deterministic dependency installation.

## At each PR
1. Static module boundary manifest/file ownership check, boot smoke with current modules, focused current module tests (and its public consumers if applicable). Failure blocks PR. Only one test run when green; one focused rerun after patch.
2. No screenshot, browser driver or entire suite unless server/API contract changed. Avoid installing heavyweight test harness if Node built-ins suffice.
3. Record command, exit code, concise status, any skipped tests with reason. A mocked pass is NOT evidence of real Atlas integration.

## At final merge
- `npm ci` and clean build startup.
- Full unit + integration suite once using distinct `MONGO_TEST_DB`, with preflight guard that dbname does not match demo. Tests tag fixtures by `testRunId`, no dropDatabase on shared/demo DB.
- Dedicated parallel reservations test against Atlas via same slot and hour: 2 requests => HTTP 201 + 409, one booking and payment. Forced payment-insert error => zero partially persisted record. Cancellation/refund atomic, rebook follows.
- Security: roles/ownership, blocked user, unique normalization, CSRF/forged request as applicable.
- Plain static browser manual 5-minute walkthrough after API green (low priority for polish, high priority that forms actually call APIs).
- Separate fresh-clone run for both branches once main exists: clone into disposable temp dir, `npm ci`, private env vars, `npm run db:seed` against intended **demo** only if permitted (idempotent), `npm start`, health/UI/route check. No manual source edits.

## Stop rules
Cap remediation cycles: one root-cause diagnosis plus 2 targeted repair attempts per blocking issue, then report blocker with failing logs rather than burning the session regenerating. Never weaken/remove mandatory test, invent a success, or use production/demo DB for destructive integration fixture cleanup. If network unavailable mark remote tests NOT RUN and do not release as fully verified.

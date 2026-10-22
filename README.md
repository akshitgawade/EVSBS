# EV charging slot booking

Node.js (tested with 22.23.2), Express 5.3.0, MongoDB driver 7.7.0, HTML/CSS and vanilla JavaScript. No frontend build step. Payment is a mock transaction, not a real charge.

## Run

1. Install Node.js 22.23 or newer compatible runtime.
2. Run `npm ci`.
3. Copy `.env.example` to `.env` locally. Set private Atlas `MONGO_URI`, `MONGO_DB`, a randomly generated `SESSION_SECRET` of at least 32 characters, and `APP_ORIGIN` to the exact browser origin (default `http://localhost:3000`). Never paste secrets into logs or Git.
4. Set private seed admin/customer email/password values (10–128 characters). Run `npm run db:seed`.
5. Run `npm start`, open the configured origin, and sign in using the private seed identity. New public registrations are always customers.

The shared demo database needs an Atlas replica set with transaction support and an allowed network address. Use a dedicated database for this application. Bootstrap creates schema validators and indexes; an existing incompatible validator or duplicate unique-index data stops startup for migration review. It does not drop collections, modify existing validators, reset data or replace passwords. Seed uses reserved demo phone identities, does not overwrite accounts and preserves bookings.

## Features and conventions

Four discovered modules: auth, stations, bookings, admin. Copy a complete module folder into `modules/` and restart. Missing dependencies disable consumers; missing bookings makes availability return 503. `/api/modules` explains module states. `/api/health` returns success only when the database responds. The core can run with zero installed modules.

Booking starts use Asia/Kolkata local wall time, on the hour in the future. Each booking is exactly 60 minutes within one day's station hours. Money is integer INR paise. Transactions couple booking/payment and cancellation/refund. A confirmed-slot unique index resolves competing bookings. Booking validation writes station/slot guards so concurrent admin edits conflict and retry before commit. This design still requires the real Atlas race test before claiming verified concurrency.

Reports use payment paidAt dates in Asia/Kolkata, including all original amounts in gross and refunded amounts in refunds. Counts use the same payment-linked booking cohort. Net = gross minus refunds. Ended confirmed bookings become completed on history/admin reads.

Sessions are signed opaque HttpOnly cookies with server-side expiry; protected requests reload account status. Write requests require JSON and an exact matching Origin. Browser clients send this automatically. API clients must explicitly send the configured Origin header. HTTPS enables Secure cookies. Local HTTP requires COOKIE_SECURE=false. Login rate limiting is process-local; this student project uses one server process.

## Verify

- `npm test`: offline fake-database HTTP/unit tests; does not prove MongoDB concurrency.
- `npm run test:module -- auth` (or stations/bookings/admin): focused module tests.
- `npm run verify:modules`: private import boundaries.
- `npm run test:integration`: requires private MONGO_TEST_URI and MONGO_TEST_DB starting with `evsbs_test_`, distinct from demo. Each run creates a uniquely suffixed isolated database and tagged fixtures; no cleanup or drop is performed automatically. Missing configuration is explicitly SKIPPED / NOT-RUN.
- `npm run test:smoke`: core routes on a running configured server.

See TEST_RESULTS.md for actual executed results. No real Atlas verification or complete release is implied by mocked tests. UI has not undergone a browser walkthrough yet.

## Git delivery

EVDRAFT holds the completed draft; EVSBS holds incremental integration history. Bootstrap contains no finished modules. Six permanent branches and twelve serial feature PRs follow docs/GIT_WORKFLOW.md. Teammates open their PRs; the owner reviews and merges. No automated merges, force pushes, fake attribution or accepted-invitation claims.

If gh is unavailable, install/authenticate GitHub CLI yourself (outside this task's permitted write scope) and run `gh auth login`. After confirming the target name is available, create `akshitgawade/EVSBS` with `gh repo create akshitgawade/EVSBS --public` from EVSBS. Remote operations and collaborator invitations remain pending until verified.

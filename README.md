# EVSBS — EV Charging Slot Booking System

EVSBS is a modular web application for discovering electric-vehicle charging stations, checking charger availability, booking one-hour charging slots, and managing bookings and simulated payments. It uses a Node.js/Express backend, MongoDB, and a plain HTML, CSS, and JavaScript frontend. There is no frontend build step.

Payments are simulated for this project; the application does not charge a real card.

## Features

- Four independently discovered modules: authentication, stations, bookings, and administration.
- Customer registration and sign-in, station and charger discovery, availability checks, booking, cancellation, and simulated payment/refund records.
- Admin tools for managing station data and reviewing bookings, payments, and reports.
- MongoDB indexes and transaction-based protection for booking/payment operations.
- Responsive browser UI served by the application.

## Requirements

- Node.js **22.23.0 or newer** (npm is included with Node.js).
- A MongoDB Atlas deployment with transaction support (replica set or sharded cluster).
- Git.

## Run locally

### 1. Clone and install

Clone the `main` branch:

```sh
git clone https://github.com/akshitgawade/EVSBS.git
cd EVSBS
npm ci
```

### 2. Configure environment variables

Create a local `.env` file by copying the example.

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```sh
cp .env.example .env
```

Edit `.env` and set the values below. Keep this file private; it is gitignored and must never be committed or shared publicly.

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | Private MongoDB Atlas connection URI for the demo/application database. |
| `MONGO_DB` | Application database name; the example uses `evsbs_demo`. |
| `SESSION_SECRET` | Long, random secret used to sign sessions (at least 32 characters). |
| `PORT` | Optional HTTP port; defaults to `3000`. |
| `APP_ORIGIN` | Exact browser origin, normally `http://localhost:3000` for local use. |
| `COOKIE_SECURE` | Use `false` for local HTTP; use `true` when serving over HTTPS. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Private credentials for the seeded demo administrator. |
| `SEED_CUSTOMER_EMAIL`, `SEED_CUSTOMER_PASSWORD` | Private credentials for the seeded demo customer. |
| `MONGO_TEST_URI`, `MONGO_TEST_DB` | Optional, separate Atlas connection and test database used only by integration tests. |

Use strong, private passwords for seeded accounts. Do not put real credentials in source files, issues, pull requests, screenshots, or chat. For access to the shared demo MongoDB URI or account setup details, contact **akshitpgawade@gmail.com** privately. Do not send passwords over public channels.

### 3. Seed and start

With Atlas configured and reachable, initialize indexes and seed the demo accounts:

```sh
npm run db:seed
```

The seed is designed to be idempotent: it creates missing demo accounts and preserves existing accounts and bookings. It does not drop collections or reset the database. Startup also ensures the required indexes.

Start the application:

```sh
npm start
```

Then open [http://localhost:3000](http://localhost:3000) (or the configured `PORT`). The app serves the frontend and API from the same origin. Use the private demo account credentials configured in `.env`; public customer registration is also available.

Useful endpoints:

- `GET /api/health` — application/database health.
- `GET /api/modules` — discovered modules and their status.

If you change `PORT`, update `APP_ORIGIN` to match the origin you use in the browser.

## Tests and checks

```sh
npm test
npm run test:module -- auth
npm run test:module -- stations
npm run test:module -- bookings
npm run test:module -- admin
npm run verify:modules
```

The default test suite uses isolated fixtures/mocks and does not require Atlas. It does not prove live MongoDB transaction or concurrency behavior.

To run the Atlas integration tests, configure `MONGO_TEST_URI` and `MONGO_TEST_DB` in `.env`. Use a dedicated test database whose name begins with `evsbs_test_`, and never point it at the demo database:

```sh
npm run test:integration
```

Integration tests create uniquely named isolated test databases and do not automatically drop databases. Review the test output; missing Atlas configuration means the integration tests were skipped, not passed.

## Troubleshooting

- **Database connection fails:** check that the Atlas cluster is running, the client IP is allowed, the database user has appropriate access, and `MONGO_URI` is correct.
- **Transactions are unavailable:** use an Atlas replica-set or sharded deployment; standalone MongoDB does not support the transaction behavior required by bookings.
- **Session or browser-origin errors:** ensure `APP_ORIGIN` exactly matches the origin in the address bar, including scheme and port.
- **Port is in use:** set a different `PORT` and update `APP_ORIGIN` accordingly.
- **A module is inactive:** inspect `GET /api/modules` for its status and dependency details.

## Project layout

```text
docs/       Architecture, API, database, testing, and workflow documentation
modules/    auth, stations, bookings, and admin feature modules
scripts/    Seeding, smoke tests, module checks, and test runners
src/core/   Server, configuration, database, errors, and module loader
src/web/    Shared HTML, CSS, and browser shell
tests/      Core, module, fixture, and Atlas integration tests
```

For contribution and branch procedures, see [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md).
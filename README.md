# EVSBS — EV Charging Slot Booking System

Node.js (tested with 22.23.2), Express 5.3.0, MongoDB driver 7.7.0, HTML/CSS and vanilla JavaScript. No frontend build step. Payment is a mock transaction, not a real charge.

## Overview

EVSBS provides authenticated EV station discovery, charger availability, one-hour reservations, simulated payments, cancellation and refunds, and administrator reporting. The application uses a modular Node.js server with a plain HTML, CSS, and vanilla JavaScript frontend.

## Stack and architecture

The server uses Node.js, Express, and the official MongoDB driver. The core discovers independent modules from `modules/<name>/module.json`, resolves dependencies, exposes shared authentication services, and keeps the application bootable when optional modules are absent. The four modules are `auth`, `stations`, `bookings`, and `admin`. Module-specific API, domain, UI, and tests stay together. No frontend build step is required.

## Installation and configuration

1. Install Node.js 22.23 or newer.
2. Run `npm ci`.
3. Copy `.env.example` to `.env` locally. Set a private MongoDB Atlas URI in `MONGO_URI`, a database name, a random `SESSION_SECRET` of at least 32 characters, and the exact browser `APP_ORIGIN`.
4. Set private seed admin and customer email/password values, each password 10–128 characters.

The `.env` file is local-only and is excluded from Git. `.env.example` contains variable names and safe empty placeholders.

## MongoDB Atlas and seed

Use an Atlas deployment with replica-set or sharded transaction support and an allowlisted client address. Bootstrap creates schema validators and indexes; an incompatible existing validator or duplicate unique-index data stops startup for review. It does not drop collections, reset data, replace passwords, or delete bookings. Seed is idempotent and preserves existing accounts and bookings.

```powershell
npm run db:seed
```

## Start and use

```powershell
npm start
```

Open the configured origin. Public registration creates customers. Seeded administrators can manage stations and chargers, inspect bookings and payments, and view station reports.

## Features and conventions

Four discovered modules: auth, stations, bookings, admin. Copy a complete module folder into `modules/` and restart. Missing dependencies disable consumers; missing bookings makes availability return 503. `/api/modules` explains module states. `/api/health` returns success only when the database responds. The core can run with zero installed modules.

Booking starts use Asia/Kolkata local wall time, on the hour in the future. Each booking is exactly 60 minutes within one day's station hours. Money is integer INR paise. Transactions couple booking/payment and cancellation/refund. A confirmed-slot unique index resolves competing bookings. Booking validation writes station/slot guards so concurrent admin edits conflict and retry before commit. This design still requires the real Atlas race test before claiming verified concurrency.

Reports use payment paidAt dates in Asia/Kolkata, including all original amounts in gross and refunded amounts in refunds. Counts use the same payment-linked booking cohort. Net = gross minus refunds. Ended confirmed bookings become completed on history/admin reads.

Sessions are signed opaque HttpOnly cookies with server-side expiry; protected requests reload account status. Write requests require JSON and an exact matching Origin. Browser clients send this automatically. API clients must explicitly send the configured Origin header. HTTPS enables Secure cookies. Local HTTP requires COOKIE_SECURE=false. Login rate limiting is process-local; this student project uses one server process.

## Testing

- `npm test`: offline fake-database HTTP/unit tests; does not prove MongoDB concurrency.
- `npm run test:module -- auth` (or stations/bookings/admin): focused module tests.
- `npm run verify:modules`: private import boundaries.
- `npm run test:integration`: requires private MONGO_TEST_URI and MONGO_TEST_DB starting with `evsbs_test_`, distinct from demo. Each run creates a uniquely suffixed isolated database and tagged fixtures; no cleanup or drop is performed automatically. Missing configuration is explicitly SKIPPED / NOT-RUN.
- `npm run test:smoke`: core routes on a running configured server.

The offline suite does not prove MongoDB concurrency. Atlas integration requires private `MONGO_TEST_URI` and a distinct `MONGO_TEST_DB` beginning with `evsbs_test_`; tests use a unique suffix and never drop the shared demo database.

## Branch workflow

The permanent branches are `main`, `merge`, `branch_agamoze`, `branch_freezingswan`, `branch_akshitgawade`, and `branch_advai1`. `main` is intentionally empty. `merge` is the integration branch. Each feature branch contains the common skeleton and its assigned module contribution. Teammate contributions enter their designated branches through Stage A pull requests, then enter `merge` through Stage B pull requests. The owner reviews and merges both stages. See `docs/GIT_WORKFLOW.md` for the contribution sequence.

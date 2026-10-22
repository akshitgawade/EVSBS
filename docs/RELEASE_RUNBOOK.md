# Setup, demo and final release runbook

## Fresh clone contract
For integration:
```sh
git clone -b merge https://github.com/akshitgawade/EVSBS.git
cd EVSBS
npm ci
# copy .env.example -> .env locally; set valid MONGO_URI, MONGO_DB, SESSION_SECRET and seed identities securely
npm run db:seed
npm start
```
After release use `git clone -b main ...`. In Windows PowerShell `Copy-Item .env.example .env`; in Bash `cp .env.example .env`. `.env` must never be committed. Other required variables must be documented in `.env.example`; no hidden hardcoded paths or source code edits. Verify required Node version in README and `engines`.

## Environment contract (no example secrets)
- `MONGO_URI` required, Atlas connection string (private).
- `MONGO_DB` required/default safe demo DB name.
- `SESSION_SECRET` required, strong random secret. Same across instances only when shared sessions need interop; avoid committing.
- `PORT` optional, default documented.
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_CUSTOMER_EMAIL`, `SEED_CUSTOMER_PASSWORD` private for first creation. Generate valid password hashes; prohibit weak defaults and print-safe redact.
- `MONGO_TEST_DB` / `MONGO_TEST_URI` integration tests only; deny test DB == demo DB. Do not run destructive tests on demo.

## Demo startup
1. Atlas cluster reachable and IP allowlisted for each member; account credential has appropriate DB permissions. Verify Atlas transaction support. Don't set wildcard allowlist if avoidable; if using temporarily for demo, restrict afterward.
2. Start app and verify `/api/health` reflects real DB connectivity. `/api/modules` returns four active modules and zero unresolved dependencies.
3. Use seeded *working* admin/customer accounts (share passwords privately), show FR acceptance sequence from `docs/FR_ACCEPTANCE_MATRIX.md`; seed does not overwrite user-generated bookings.
4. Commit README with commands, expected URLs, functional demonstrations and troubleshooting for Atlas DNS/network auth/permissions/connection string. No real secret or PII.

## Final Git check
`git status` clean, `git branch -a` contains expected six branches, fresh clone of `merge` and of `main` works as applicable, source ZIP excludes `.git`, `node_modules`, `.env`, config secrets, credentials/dumps; README and lockfile included. If a PR is not accepted or test NOT RUN, disclose as blocker instead of claiming 'done'.

## No-op scopes
Project report, oral/viva training, CI Jenkins, Tomcat, Java backend, deployment to Render/Vercel and frontend cosmetic perfection deferred by user request. Initial goal: correct working application and verifiable Git collaboration.

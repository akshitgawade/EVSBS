# Phase 0 implementation decisions

- Build and test only in Desktop/EVDRAFT; Git operations only in Desktop/EVSBS. Never access FCC_Miniproject.
- Use Node.js, Express, the official MongoDB driver, semantic HTML/CSS and vanilla JavaScript. Local Node is v22.23.2 and npm is 10.9.8; validate supported dependency versions before installation.
- Installable units are root modules/auth, modules/stations, modules/bookings and modules/admin with the exact v1 manifest in MODULE_RUNTIME_SPEC.md. Dependencies: auth -> stations -> bookings -> admin; admin explicitly requires all three. Occupancy is resolved dynamically through the public registry.
- API_CONTRACT.md takes precedence over older database field examples: integer hourlyRatePaise, ratePerHourPaise and amountPaise; request field start; MongoDB Date storage and UTC ISO responses.
- Support Asia/Kolkata only; reject other station timezones explicitly. Interpret report dates in Asia/Kolkata, using payment paidAt and the same payment-linked booking cohort for counts and revenue.
- Use the specified unique partial CONFIRMED slot/start index and majority snapshot transactions for booking/payment and cancellation/refund. No nontransactional fallback.
- Implement shared station/slot write guards for booking and administrative updates inside transactions; real concurrent behavior requires isolated Atlas integration verification.
- Follow exact numbered PR slices. No Git repository under EVDRAFT despite the optional staging-repository suggestion in PR_DELIVERY_CHECKLIST.md: the master prompt restricts all Git operations to EVSBS. Use file snapshots instead.
- Existing documentation permits truthful owner-authored PRs in places, but the master prompt specifies teammate handoff. Prepare teammate branches and handoff unless the user explicitly chooses owner-authored PRs. Never impersonate collaborators or merge without approval.

## Environment preflight

- Desktop resolved to C:/Users/Nilima/Desktop. EVDRAFT contains the instruction pack; EVSBS is empty.
- Node/npm/Git available. GitHub CLI not on PATH or at its standard Program Files location; GitHub authentication not verified.
- MONGO_URI, MONGO_DB, SESSION_SECRET, MONGO_TEST_URI and MONGO_TEST_DB absent from process environment; no .env found in EVDRAFT root listing. Atlas tests NOT-RUN. Continue with mocked unit tests when write access is available.
- Current session writable roots do not include EVDRAFT or EVSBS. Targeted directory creation/dependency installation were approved through escalation; all writes remain in those two authorized directories.
- No application tests run; no Git operations or MongoDB connections performed in Phase 0.

## Implementation refinements before Git bootstrap

- Use installed Node 22.23.2 for this run; avoid changing the user's machine runtime. Exact pinned package versions were obtained from npm metadata and installed successfully.
- Public station service extra methods: parseStart, listStations, listSlots. Auth publishes seedAccounts for the root idempotent seed framework; modules never import sibling private code.
- Module context is {router, db, transaction, config, services, errors, logger}; services provides provide/get. transaction(callback) passes a real Mongo session. No complete feature logic lives in core.
- New collections receive JSON schema validators; preexisting incompatible validators stop bootstrap rather than being silently changed on the shared database.
- Real integration fixtures are tagged and retained in uniquely suffixed test databases. No destructive cleanup is performed without approval.
- GitHub connector account is akshitgawade. Target lookup returned 404 (not proof of global name availability). CLI and environment tokens are unavailable; connector lacks repo creation/invitation capabilities, so remote setup remains blocked.

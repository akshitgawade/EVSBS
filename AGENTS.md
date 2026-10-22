# EVSBS persistent Codex rules

## Mission
Build EV Charging Slot Booking for all FR01–FR15. Work in `Desktop/EVDRAFT` first; fresh repo lives exclusively at `Desktop/EVSBS`. `Desktop/FCC_Miniproject` is READ-ONLY and should NOT be scanned, modified, imported, or used to decide architecture. `reference/dbcode.txt` is an SQL domain reference, not Java or MongoDB code.

## Nonnegotiable
- Functionality first, especially secure auth, permissions, slot validity, exact-hour time, concurrency, atomic booking+payment and cancellation/refund.
- Use MongoDB Atlas. Shared demo DB; separate isolated TEST database. MongoDB URI, session secret and seeded passwords only in local `.env`/approved secret channels, never tracked. `.env.example` includes names, not values. Redact URI in logs. No secrets in PR descriptions.
- Semantic HTML/CSS/vanilla JS. Prefer Node.js small backend; minimal pinned production dependencies, committed lockfile. No Java/Tomcat/Jenkins/React unless a compelling documented block requires exception and user approves.
- Root `tests/` has fast repeatable tests. No expensive LLM review, repeated E2E/browser suites or screenshot comparisons as default. Test results always RAN-PASSED, RAN-FAILED, NOT-RUN with command and evidence. NEVER assert unexecuted behavior.
- Freeze interfaces before feature coding. Core hosts registration, server, Mongo lifecycle, health, default page, module auto-discovery, shared error shape and standardized auth hooks; feature modules own their files. Loader skips undeployed/incomplete modules with explanatory health diagnostics; no shared registry edits per module. Zero-feature skeleton boots.
- Feature PR may edit **only its module and corresponding `tests/modules/<name>`**. Any core/shared change goes through explicitly approved contract-change procedure, re-test all installed modules, and own integration PR. Don't falsely promise zero conflicts.
- Do not silently modify business requirements or weaken tests to pass. Keep changes targeted; summarize failures and limitations rather than looping. Stop on unresolved schema/core contract conflict or unsafe migrations.
- Git operations only in `Desktop/EVSBS`. Create NEW repository `akshitgawade/EVSBS` public. Do not repurpose previous repository or run `git init` on nonempty unrelated folders; verify `gh auth status` and remote. No force pushes, history rewrite, or branch deletion. Owner approves PRs. Do not spoof teammates' git author identities: commits authored by the actual actor, PRs opened by collaborators as instructed.
- Four permanent feature branches plus `merge` and `main`. Three real PRs per feature branch (12 total) sequentially. Existing `merge` must boot and existing FRs must remain functional after every PR. Incomplete modules are disabled until functional. Details in `docs/GIT_WORKFLOW.md`.
- Avoid architecture churn and unnecessary tool calls. Plan once, run cheap focused tests often, expensive full suite only on integration/release. Terminal checks are cheap; model interpretation/rewrite loops are costly.
- Keep operational README, seed, `.env.example`, and lockfile accurate. Never require team members to edit source code when cloning.

## State reporting after each phase
Write: **phase / changed files / Git branch and commit (if any) / commands with pass-fail / FRs verified / blockers / next action**. Ask only for decisions involving secrets, access, destructive data operations, or contract changes. Never describe GitHub invitations/PRs as completed without verified responses.

## Binding specs and conflict resolution
Read `docs/API_CONTRACT.md`, `docs/MODULE_RUNTIME_SPEC.md`, `docs/CONCURRENCY_IMPLEMENTATION.md`, and `docs/PR_DELIVERY_CHECKLIST.md` before writing any module. API_CONTRACT takes precedence over example route names elsewhere; MODULE_RUNTIME_SPEC takes precedence over optional loader variants; CONCURRENCY_IMPLEMENTATION is the minimum durability recipe. If a conflict remains, note it in DECISIONS.md, preserve all FRs, and ask only if a mandatory requirement cannot be implemented.

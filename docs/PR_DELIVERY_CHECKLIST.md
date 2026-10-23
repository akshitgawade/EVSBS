# Deterministic 12-PR delivery and owner handoffs

Priorities: working finished app > truthful history > fake author attribution. A real PR is GitHub pull request with base `merge`, head a student branch, opened from the account actually performing the action. Codex authenticated as `akshitgawade` cannot impersonate another teammate or approve their PR as them. On public repository, collaborators must accept invitations to push. User reviews/merges on GitHub website.

## One-time initialize, no existing repo replacement
- Verify `EVDRAFT` and `EVSBS` exact Desktop paths. Never touch `FCC_Miniproject`. Check `gh auth status` and `gh repo view akshitgawade/EVSBS`; existing unrelated repository is stop condition.
- EVDRAFT contains *complete tested* final source, plus snapshots/patches for each deliverable increment (can use a separate local staging Git repository under EVDRAFT if useful). Do not have Git commit generate fictitious history.
- EVSBS bootstrap: copy `core`, tests/core, docs, loader, module shells only if they truly have no feature; pin package.json+lock once. Commit on main, push; create merge and four student branches. Configure ownership/invitations if authorized. Ensure all branches initially share same baseline SHA.

## PRs — who creates and who approves
| PR | contributor's permanent head branch | standalone coherent increment |
|---|---|---|
| 01 | student-agamoze | Registration endpoint, form, normalized unique indexes, tests |
| 02 | student-agamoze | Login/logout/session/UI, blocked account enforcement, tests |
| 03 | student-agamoze | Guards, `GET /me`, cross-module auth contract, tests |
| 04 | student-freezingswan | Active station search, UI and queries/tests |
| 05 | student-freezingswan | Station detail + charger list, date UI, availability 503 until booking service arrives |
| 06 | student-freezingswan | Stable checkReservable/public station admin write service; time/status validation/tests |
| 07 | student-akshitgawade | Atomic create+pay, unique occupancy, booking form, concurrency tests |
| 08 | student-akshitgawade | Private history, completed status, history UI/tests |
| 09 | student-akshitgawade | Cancel+refund/rebook, tests |
| 10 | student-advai1 | Admin station create/edit/status and UI/tests |
| 11 | student-advai1 | Admin charger create/edit/status and UI/tests |
| 12 | student-advai1 | Admin bookings/payments and usage/revenue reports/UI/tests |

For PR 01-03, auth is partial: feature must be disabled or expose only coherent routes without enabling broken dependent modules; core startup/health always passes. PR 04-06 stations requires working auth; PR 05 availability explicitly 503 until PR07. Bookings may be disabled until its create endpoint and dependencies are available. Admin may be disabled until its endpoint slice coherent. All modules must be enabled on final merge.

## For EACH PR exactly
1. Confirm preceding PR merged to `origin/merge` by reading actual GitHub state (do not trust local status). On EVSBS, checkout the contributor's permanent branch; `git fetch origin`; merge `origin/merge` into head (without deleting branch or force-pushing). Before staging, verify tree reflects `merge` plus only intended feature increment.
2. In EVDRAFT take tested per-PR slice from tracked staged snapshot; copy only `modules/<owner module>/**` and `tests/modules/<owner module>/**`. If tests need a shared fixture missing from skeleton, fixture contract must have been preinstalled in bootstrap. Stage explicit paths and inspect `git diff --cached --name-only`.
3. Run `npm ci` once per clean Git root if needed, subsequent focused `npm test -- --...` or project-documented `npm run test:module -- <module>`; boot HTTP smoke. If changed module has downstream consumers, run their focused suite. Never run destructive live/demo DB tests during PR.
4. Commit with truthful configured Git author/account. Suggested message `feat(auth): add registration and unique identities [FR01]`; `feat(stations): add station search [FR04]`, etc. Push `student-*` to new public repo.
5. Assigned teammate opens their own PR to `merge` on GitHub (or Codex opens as currently authenticated account and attributes it truthfully). They may review/test all generated code and can be responsible for the feature without falsifying authorship.
6. User `akshitgawade` reviews and merges on GitHub. Codex must not claim or perform owner approval in their place; actual merge approvals may require distinct authorized reviewer if GitHub requires it. Use merge commits on permanent branches (not squash that complicates incremental ancestry).
7. Codex fetches, confirms merge exists in remote history, launches minimal smoke from EVSBS merge, then progresses to next numbered PR. Never pre-push PR02 to branch while PR01 still open.

## Stop/recovery
If PR approval is pending, Codex can continue preparing tested EVDRAFT slices, but must pause Git distribution and tell user exact PR URL and action. If team invitations pending, still can stage as owner, but teammate PR authorship requires actual teammate action. Do not burn session on idle waiting; the user can merge serially while Codex continues local work. If PR closed/rejected, reconcile branch with actual remote merge instead of force-pushing; do not blindly skip gate. A failed API test means no push for that increment.

## Final release
After PR12 merges, fetch `merge`; run clean install, Atlas test DB, full tests, manual backend/UI smoke and module census. Create PR `merge` -> `main` with truthful author; approved merge via user interface. Confirm main SHA and clone both branches cleanly before saying 'ready'. Report skipped tests honestly.

# New repository: exact branch, commit, PR and approval choreography

**New public GitHub repo:** `akshitgawade/EVSBS`. No old repository reuse. Codex builds `Desktop/EVDRAFT`; pushes Git ONLY from `Desktop/EVSBS`. Do NOT access `Desktop/FCC_Miniproject`. User approves PRs on GitHub. Three collaborators invited: `agamoze`, `freezingswan`, `advai1`. Git invitation pending acceptance is not success.

## Bootstrap: owner/Codex one time
0. Inspect `gh auth status`, `git --version`, Windows Desktop paths, whether new repo/EVSBS path already exist. Never overwrite unexpected data, force push or impersonate collaborator. Check repository ownership/availability. If missing permissions, stop at that operation with instructions.
1. In EVDRAFT create complete version including modules and tests, but freeze code/contracts after real verification. Keep per-PR increment patches or create snapshots of precise slices; no empty/artificial split. `EVDRAFT` is NOT remote Git history.
2. Initialize fresh EVSBS directory as Git repo only after verifying it is empty/intended. Copy only **working zero-module skeleton**, shared docs, seed framework, scripts, core tests, and lockfile; copy NO finished feature code. Core must start without installed modules. Commit on `main` as actual authenticated Git author: `chore(core): bootstrap modular app skeleton` and push.
3. Create/push `merge` pointing at `main` skeleton. Create/push `student-agamoze`, `student-freezingswan`, `student-akshitgawade`, `student-advai1` each pointing to same skeleton. Exactly six **permanent** branches. Set branch protection on `main` where available; configure ability to accept merge commits. Invite collaborators. Note repo owner doesn't have to invite their own handle `akshitgawade`.
4. Never place full modules in `main` at bootstrap. Every module enters via meaningful PR to `merge`. Set GitHub compare/base correctly; no owner self-approval/auto-merge masquerading as peer review.

## Repeated PR mechanic — MUST follow for all 12
(1) Ensure prior PR into `merge` is actually merged and `origin/merge` updated. (2) Checkout/pull the designated long-lived `student-*` branch. (3) Incorporate latest `origin/merge` using `git merge origin/merge` (not force-reset/rebase on shared public history). (4) Transfer *only* that PR's eligible module files and `tests/modules/<module>/` files from tested EVDRAFT slice. (5) Check `git status` and explicit staged paths; reject any core, other module, .env or secret change. (6) Run focused checks. (7) Commit using actual git actor account (Codex-generated code is not manually authored by teammate), push student branch. (8) Assigned teammate opens PR from that branch **to `merge`**, describing actual work and tests; repo owner `akshitgawade` reviews and merges using **create merge commit**, not squash/rebase. (9) Verify PR merge on GitHub and checkout `merge` to run lightweight smoke; only then continue. One open PR per long-lived branch; no later code pushed to that branch before its PR merges. Any blocked approval stays pending; Codex may work in EVDRAFT but cannot claim full merged sequence.

**Branch naming/ownership:** `student-agamoze` auth, `student-freezingswan` stations, `student-akshitgawade` bookings, `student-advai1` admin.

## Twelve specific pull requests
| # | Owner / source -> target | PR content | Merge gate |
|---|---|---|---|
| 01 | agamoze / student-agamoze -> merge | Auth registration: first/last/email/phone, unique normalized identities, secure hash, registration UI | register valid/duplicate validations, no plaintext |
| 02 | agamoze / student-agamoze -> merge | Auth login/logout, HttpOnly session, BLOCKED denial | session lifecycle, blocked login and blocked session |
| 03 | agamoze / student-agamoze -> merge | Role guard and protected own-data service API | 401/403, admin vs customer ownership |
| 04 | freezingswan / student-freezingswan -> merge | Station list/search active city/name, search UI | list + search, no inactive in no-filter search |
| 05 | freezingswan / student-freezingswan -> merge | Station details incl all charger slots + availability UI | details complete, adjacent bookings valid |
| 06 | freezingswan / student-freezingswan -> merge | Time/status validators and stable station-service public API | rejects out-of-hours/nonactive, contract tests |
| 07 | akshitgawade / student-akshitgawade -> merge | Create 60-min booking and atomic mock payment, conflict avoidance | same-slot race 1 success/1 rejection, atomicity |
| 08 | akshitgawade / student-akshitgawade -> merge | Private latest-first history and completion | customer isolation, correct payment view, completed |
| 09 | akshitgawade / student-akshitgawade -> merge | Before-start cancel/refund in one transaction, rebooking | no late cancel, paid->refunded and rebook |
| 10 | advai1 / student-advai1 -> merge | Protected admin dashboard + station create/edit/status | admin-only, inactive station blocks booking |
| 11 | advai1 / student-advai1 -> merge | Admin slot creation/update/state transitions | unique station slot number, inactive slot blocks booking |
| 12 | advai1 / student-advai1 -> merge | Admin usage/revenue + all bookings/payments | aggregation correct, filters, admin-only |

**Important subtlety:** Stations availability (PR05) runs before bookings installed (PR07). Contract must handle missing occupancy service without lying about availability: make availability endpoint explicitly unavailable (e.g. 503/not installed) until booking service exists, while station details remain functional. Alternatively implement booking-occupancy read in stable core database query contract during skeleton, but only once with test coverage. Do NOT return 'available' for every slot when occupancy cannot be verified. Core health must still work after PR05.

**Auth v1/2 before protected modules:** Inactive endpoints/controls may be hidden until dependent capability installed. Working core means not exposing broken partial functionality, not pretending missing features are complete.

## Final release
13. Fetch/checkout latest `merge`, verify four registered modules and FR01–FR15, Atlas and a fresh clone; audit secrets and committed modules. Keep PR IDs/URLs; never invent them.
14. Create integration PR `merge` -> `main`. Owner approves/merges; no automatic self-approval. Verify `main` from clean clone and create final ZIP without `.env`, `node_modules`, `.git` or secrets. Keep six permanent branches.
15. Provide teammates exact commands to clone `merge`/`main`, install and run. No editing paths, source code or SQL scripts needed. Include required env vars and Atlas IP allowlist instructions.

## Permission/automation realism
A single owner-authenticated Codex session cannot genuinely cause 3 distinct people to open PRs from their GitHub accounts. Codex can create and push commits, create **owner-authored** PRs if authorized (clearly attributed), or leave branches PR-ready for assigned teammates to open. Owner cannot independently 'approve' their own PR where GitHub branch policy requires distinct reviewer. This choreography must remain truthful even if human approvals cause waiting. If PR count/time pressure conflicts with correctness, prioritize working app and report actual PR state honestly.

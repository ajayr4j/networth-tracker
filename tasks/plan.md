# Implementation Plan: Couple's Net Worth & ₹5 Cr Goal Tracker

## Overview
Build the full-stack app described in [SPEC.md](../SPEC.md) and visualized in [architecture.excalidraw](../architecture.excalidraw): a Django REST + PostgreSQL backend and a React+TypeScript frontend, built as vertical slices per backend module (accounts → workspaces → holdings → projections/milestones), each slice shipping backend model+API+tests and the frontend page that consumes it before moving to the next.

## Architecture Decisions
- JWT (`djangorestframework-simplejwt`) over session+CSRF — frontend (Netlify) and backend (Render) are different origins.
- `Holding` is one unified model for assets and liabilities (`kind` field) rather than two separate models — net worth calc is one query, not a union of two tables.
- `HoldingValuation` is append-only; "editing" a holding's value always inserts a new row. Current value = latest `as_of_date` row per holding. This is the mechanism that satisfies the historical-integrity constraint — enforced in code (service layer never issues an UPDATE on `value`), not just by convention.
- Milestone-crossing and timeline entries are computed synchronously on write (in the service layer called by the holding-valuation-create and check-in-create endpoints), not via async workers — scope doesn't need the complexity of a task queue.
- Ownership (`owner_type` + `owner_user`) is a tag on `Holding`, not a parallel ledger per partner — this is what prevents double-counting by construction (see SPEC.md's Net Worth Calculation note).

## Task List

### Phase 0: Scaffold
- [ ] Task 1: Repo and environment scaffold
- [ ] Task 2: Django project + DRF + Postgres wiring
- [ ] Task 3: React + Vite + TS + Tailwind scaffold

### Checkpoint: Scaffold
- [ ] Backend `python manage.py runserver` serves a health-check endpoint
- [ ] Frontend `npm run dev` renders a shell page that successfully calls the health-check endpoint
- [ ] `docker-compose up -d db` brings up Postgres and backend connects to it

### Phase 1: Accounts (auth)
- [ ] Task 4: User model + JWT auth endpoints (accounts app)
- [ ] Task 5: Frontend auth — register/login pages + auth context

### Checkpoint: Accounts
- [ ] A user can register, log in, and reach a protected page; logging out clears the session; an unauthenticated request to a protected page redirects to login

### Phase 2: Workspaces
- [ ] Task 6: Workspace, WorkspaceMembership, WorkspaceInvite models + endpoints + workspace-scoping permission
- [ ] Task 7: Frontend workspace creation + invite flow

### Checkpoint: Workspaces
- [ ] User A creates a workspace and an invite code; User B (separate account) redeems the code and both now see the same workspace; a third account cannot see or join it

### Phase 3: Holdings (core + dashboard)
- [ ] Task 8: Holding + HoldingValuation models, net worth calc service, CRUD API, ownership permission class
- [ ] Task 9: Frontend holdings CRUD + dashboard (progress bar, %, historical chart)

### Checkpoint: Holdings
- [ ] Adding assets/liabilities (mixed individual/joint) produces the correct combined net worth in the dashboard
- [ ] Editing a holding's value inserts a new valuation row; the old value is still retrievable; dashboard history chart reflects the change over time, not a flat overwrite
- [ ] The non-owning partner gets 403 editing the other's individual holding; both can edit a joint holding

### Phase 4: Projections
- [ ] Task 10: ProjectionSettings model + projection calculation service + API
- [ ] Task 11: Frontend projections page (scenario chart + target-date estimates)

### Phase 5: Milestones & Timeline
- [ ] Task 12: Milestone seed data, MilestoneAchievement detection, MonthlyCheckIn, ActivityLogEntry + wiring
- [ ] Task 13: Frontend timeline feed + check-in form + milestone badge on dashboard

### Checkpoint: Projections & Milestones
- [ ] Projection page shows conservative/base/optimistic trajectories and an estimated ₹5 Cr date per scenario, labeled "estimate"
- [ ] Crossing a seeded milestone threshold creates exactly one `MilestoneAchievement` and one timeline entry; a monthly check-in appears on the timeline

### Phase 6: Integration and submission polish
- [ ] Task 14: `seed_demo` management command (sample data)
- [ ] Task 15: Authorization test sweep against SPEC.md Success Criteria 3–6
- [ ] Task 16: README.md + DESIGN_DECISIONS.md
- [ ] Task 17: Deployment config (Render + Netlify), no actual deploy
- [ ] Task 18: Full golden-path manual verification pass

### Checkpoint: Complete
- [ ] `pytest` and `npm run test` both green
- [ ] SPEC.md Success Criteria 1–10 all verified by a fresh run of README setup steps + seed data
- [ ] Ready for human review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Milestone-crossing logic double-fires or misses a crossing when multiple holdings update in sequence | Medium | Compute net worth once per write, compare against previously-achieved milestones (not against a cached "last net worth"), guard with a unique constraint on (workspace, milestone) |
| Ownership permission logic has an edge case (e.g. workspace with only 1 member) | Medium | Explicit tests for 1-member and 2-member workspace states before building the frontend around it |
| JWT refresh/expiry mishandled on the frontend, causing random logouts | Low-Medium | TanStack Query + axios interceptor refresh pattern, tested manually with a short-lived access token in dev |
| Projection math (compound growth with monthly contributions) off-by-one or wrong compounding period | Medium | Unit tests against hand-calculated values for at least 2 known input sets before wiring to UI |
| Local Postgres not available in dev environment | Low | Docker Compose service; document SQLite fallback only if Postgres truly unavailable, but Postgres is required for parity with prod |

## Open Questions
None outstanding — all deferred to SPEC.md's Open Questions, already approved.

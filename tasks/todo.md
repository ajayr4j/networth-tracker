# Task List: Couple's Net Worth & ₹5 Cr Goal Tracker

See [plan.md](plan.md) for architecture decisions and phase overview.

## Task 1: Repo and environment scaffold

**Description:** Initialize git, create `backend/` and `frontend/` directories, a root `.gitignore`, and a `docker-compose.yml` that runs a Postgres service for local dev.

**Acceptance criteria:**
- [ ] `git init` done, initial commit contains scaffold only (no secrets)
- [ ] `docker-compose.yml` defines a `db` service (postgres:16) with a named volume and env-based credentials
- [ ] `.gitignore` excludes `.env`, `node_modules/`, `__pycache__/`, `*.sqlite3`, `venv/`, build output dirs

**Verification:**
- [ ] `docker-compose up -d db` starts successfully; `docker-compose ps` shows it healthy
- [ ] `git status` is clean after the initial commit

**Dependencies:** None

**Files likely touched:**
- `.gitignore`
- `docker-compose.yml`
- `backend/` (empty placeholder)
- `frontend/` (empty placeholder)

**Estimated scope:** Small (1-2 files)

---

## Task 2: Django project + DRF + Postgres wiring

**Description:** Scaffold the Django project (`config/` settings/urls), install DRF + `djangorestframework-simplejwt` + `psycopg`, configure DB via env vars (`.env` read through `django-environ` or `python-decouple`), and add a `/api/health/` endpoint.

**Acceptance criteria:**
- [ ] `python manage.py migrate` runs clean against the Postgres container
- [ ] `GET /api/health/` returns `200 {"status": "ok"}`
- [ ] Settings split so `DEBUG`, `SECRET_KEY`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS` all come from environment variables, with a `.env.example` documenting them

**Verification:**
- [ ] `python manage.py runserver` + `curl localhost:8000/api/health/` → `200`
- [ ] `pytest` runs (even with zero tests) without import errors

**Dependencies:** Task 1

**Files likely touched:**
- `backend/manage.py`
- `backend/config/settings.py`, `backend/config/urls.py`
- `backend/requirements.txt`
- `backend/.env.example`

**Estimated scope:** Medium (3-5 files)

---

## Task 3: React + Vite + TS + Tailwind scaffold

**Description:** Scaffold the frontend with Vite (React+TS template), install Tailwind, TanStack Query, React Router, Recharts, Axios. Add a root layout and a page that calls the backend's `/api/health/` endpoint to prove the two servers talk to each other.

**Acceptance criteria:**
- [ ] `npm run dev` serves the app; the health-check page shows "ok" fetched from the backend
- [ ] Tailwind classes render correctly (visually confirmed, not just configured)
- [ ] API base URL comes from a Vite env var (`VITE_API_URL`), not hardcoded

**Verification:**
- [ ] `npm run build` succeeds with no type errors
- [ ] Manual check: load the dev server in a browser, confirm the health status renders

**Dependencies:** Task 2 (needs a live health endpoint to call)

**Files likely touched:**
- `frontend/src/main.tsx`, `frontend/src/App.tsx`
- `frontend/src/api/client.ts`
- `frontend/tailwind.config.js`
- `frontend/.env.example`

**Estimated scope:** Medium (3-5 files)

---

## Checkpoint: Scaffold
- [ ] Backend serves health check against real Postgres
- [ ] Frontend renders and successfully calls backend
- [ ] Review before proceeding to auth

---

## Task 4: User model + JWT auth endpoints (accounts app)

**Description:** Create the `accounts` Django app. Use email as the username field. Wire up `simplejwt` for register, login (token obtain), refresh, and "who am I" endpoints.

**Acceptance criteria:**
- [ ] `POST /api/accounts/register/` creates a user, rejects duplicate emails and weak passwords (Django's validators)
- [ ] `POST /api/accounts/login/` returns access+refresh tokens for valid credentials, 401 otherwise
- [ ] `POST /api/accounts/refresh/` exchanges a valid refresh token for a new access token
- [ ] `GET /api/accounts/me/` returns the authenticated user's profile, 401 if no/invalid token

**Verification:**
- [ ] `pytest backend/accounts` — covers register validation, login success/failure, refresh, and `me` auth-required
- [ ] Manual: `curl` through register → login → me with the returned token

**Dependencies:** Task 2

**Files likely touched:**
- `backend/accounts/models.py`, `backend/accounts/serializers.py`, `backend/accounts/views.py`, `backend/accounts/urls.py`
- `backend/accounts/tests/test_auth.py`

**Estimated scope:** Medium (3-5 files)

---

## Task 5: Frontend auth — register/login pages + auth context

**Description:** Build Register and Login pages, an `AuthContext` that stores tokens (localStorage) and exposes the current user, an axios interceptor that attaches the access token and refreshes on 401, and a `ProtectedRoute` wrapper.

**Acceptance criteria:**
- [ ] Registering navigates to login (or auto-logs-in) on success; shows field-level errors on failure
- [ ] Logging in stores tokens and redirects to the dashboard route (page not built yet — a placeholder is fine)
- [ ] Visiting a protected route while logged out redirects to `/login`
- [ ] Logging out clears tokens and redirects to `/login`

**Verification:**
- [ ] `npm run test` — component tests for the auth form validation and the protected-route redirect behavior
- [ ] Manual: full register → login → logout cycle in the browser

**Dependencies:** Task 3, Task 4

**Files likely touched:**
- `frontend/src/pages/Login.tsx`, `frontend/src/pages/Register.tsx`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/api/auth.ts`
- `frontend/src/components/ProtectedRoute.tsx`

**Estimated scope:** Medium (3-5 files)

---

## Checkpoint: Accounts
- [ ] Register → login → protected route → logout works end-to-end
- [ ] Review before proceeding to workspaces

---

## Task 6: Workspace, WorkspaceMembership, WorkspaceInvite models + endpoints

**Description:** Create the `workspaces` app. A user with no workspace can create one (becomes sole member). Any member can generate a single-use, expiring invite code. A different authenticated user can redeem a valid code to join (workspace caps at 2 members). Add an `IsWorkspaceMember` permission class and a `get_queryset` scoping pattern other apps will reuse.

**Acceptance criteria:**
- [ ] `POST /api/workspaces/` creates a workspace with the creator as the first member
- [ ] `POST /api/workspaces/{id}/invites/` generates a code (only existing members may call this; 403 otherwise)
- [ ] `POST /api/invites/redeem/` with a valid code joins the caller to that workspace; fails on expired/used code or a workspace already at 2 members
- [ ] `GET /api/workspaces/mine/` returns the caller's workspace (404/empty if none)
- [ ] A user outside a workspace gets 403/404 on any of its endpoints

**Verification:**
- [ ] `pytest backend/workspaces` — covers creation, invite generation permission, redeem success/expiry/reuse/capacity, and cross-workspace denial
- [ ] Manual: two separate accounts, full create → invite → redeem flow via `curl`/Postman

**Dependencies:** Task 4

**Files likely touched:**
- `backend/workspaces/models.py`, `backend/workspaces/serializers.py`, `backend/workspaces/views.py`, `backend/workspaces/permissions.py`, `backend/workspaces/urls.py`
- `backend/workspaces/tests/test_workspaces.py`

**Estimated scope:** Medium (3-5 files)

---

## Task 7: Frontend workspace creation + invite flow

**Description:** A Settings/Onboarding page: if the logged-in user has no workspace, prompt to create one or enter an invite code; once in a workspace, show the invite code to share with a partner. Add a `WorkspaceContext` (or fold into `AuthContext`) that holds the current workspace id for use by every later API call.

**Acceptance criteria:**
- [ ] New user without a workspace sees create/join options, not a dashboard
- [ ] Creating a workspace reveals a shareable invite code
- [ ] Entering a valid code joins the workspace and redirects to the dashboard route
- [ ] Invalid/expired code shows an inline error, doesn't crash the app

**Verification:**
- [ ] `npm run test` — tests for the create vs. join branching and error states
- [ ] Manual: two browser profiles (or incognito), create with one, join with the other, confirm both land in the same workspace

**Dependencies:** Task 5, Task 6

**Files likely touched:**
- `frontend/src/pages/WorkspaceOnboarding.tsx`
- `frontend/src/context/WorkspaceContext.tsx`
- `frontend/src/api/workspaces.ts`

**Estimated scope:** Medium (3-5 files)

---

## Checkpoint: Workspaces
- [ ] Two accounts share one workspace via invite code; a third account cannot access it
- [ ] Review before proceeding to holdings

---

## Task 8: Holding + HoldingValuation models, net worth calc, CRUD API

**Description:** Create the `holdings` app. `Holding` (kind, category, label, owner_type, owner_user, archived_at) + `HoldingValuation` (append-only). A service function computes net worth as of a given date (or "now") from latest valuations per non-archived holding. `CanEditHolding` permission: joint editable by either member, individual only by `owner_user`; both can always read. "Archiving" sets `archived_at`, never deletes. A dashboard aggregate endpoint returns current net worth, % to ₹5 Cr, and a historical series (one point per distinct valuation date across the workspace).

**Acceptance criteria:**
- [ ] `POST /api/holdings/` creates a holding + its first valuation in one call
- [ ] `PATCH /api/holdings/{id}/value/` inserts a new `HoldingValuation` row; `GET` on the holding still exposes prior valuations (history endpoint or nested list)
- [ ] `DELETE /api/holdings/{id}/` sets `archived_at`, doesn't remove rows; archived holdings excluded from net worth
- [ ] Non-owner gets 403 on PATCH/DELETE of an individual holding; both members succeed on a joint holding
- [ ] `GET /api/dashboard/` returns correct net worth (assets − liabilities, no double count) and a historical series that reflects value-over-time

**Verification:**
- [ ] `pytest backend/holdings` — net worth calc (mixed ownership, archived exclusion, liabilities subtracted), valuation history never overwritten, permission matrix (owner/non-owner/joint × read/write)
- [ ] Manual: create a mix of assets/liabilities across both ownership types, confirm dashboard math by hand

**Dependencies:** Task 6

**Files likely touched:**
- `backend/holdings/models.py`, `backend/holdings/services.py`, `backend/holdings/serializers.py`, `backend/holdings/views.py`, `backend/holdings/permissions.py`
- `backend/holdings/tests/test_holdings.py`, `backend/holdings/tests/test_net_worth_calc.py`

**Estimated scope:** Large (5-8 files) — acceptable to exceed the 5-file guideline here since model+service+serializer+views+permissions+2 test files are all one cohesive, tightly-coupled slice; splitting further would fragment a single calculation's tests from its implementation.

---

## Task 9: Frontend holdings CRUD + dashboard

**Description:** Holdings list/create/edit/archive UI (asset vs. liability, category dropdown, ownership picker). Dashboard page: progress bar to ₹5 Cr, remaining amount, % complete, Recharts line chart of the historical series, next milestone placeholder (wired fully in Task 13).

**Acceptance criteria:**
- [ ] Creating/editing a holding updates the dashboard without a full page reload (TanStack Query invalidation)
- [ ] Non-owner sees the other partner's individual holdings as read-only (no edit/delete controls rendered, and a direct API attempt still 403s server-side)
- [ ] Dashboard progress bar and % match the backend's returned net worth exactly (no client-side recompute drift)

**Verification:**
- [ ] `npm run test` — dashboard math rendering (given a mocked API response, percentages/remaining render correctly) and read-only control hiding for non-owned individual holdings
- [ ] Manual: full add/edit/archive cycle, confirm chart updates and old values remain visible in a holding's history view

**Dependencies:** Task 7, Task 8

**Files likely touched:**
- `frontend/src/pages/Holdings.tsx`, `frontend/src/pages/Dashboard.tsx`
- `frontend/src/components/HoldingForm.tsx`, `frontend/src/components/ProgressBar.tsx`, `frontend/src/components/NetWorthChart.tsx`
- `frontend/src/api/holdings.ts`

**Estimated scope:** Large (5-8 files) — same rationale as Task 8: one feature slice (holdings UI + dashboard) sharing types and API client, splitting would separate the chart from the data that feeds it mid-slice.

---

## Checkpoint: Holdings
- [ ] Combined net worth is correct for a mixed set of holdings
- [ ] Editing never loses history; non-owner is blocked server-side and hidden client-side
- [ ] Review before proceeding to projections/milestones

---

## Task 10: ProjectionSettings model + projection calculation service + API

**Description:** Create the `projections` app. `ProjectionSettings` (one row per workspace, defaults 6/10/14% annual, editable). Service computes, for each scenario, a month-by-month trajectory from current net worth given monthly contribution and annual rate, and an estimated date for reaching the target amount.

**Acceptance criteria:**
- [ ] `GET/PATCH /api/projections/settings/` reads/updates the workspace's settings (either member can update)
- [ ] `GET /api/projections/forecast/` returns 3 scenario trajectories + 3 estimated target dates, each explicitly labeled as an estimate in the response
- [ ] Compounding matches hand-calculated values for at least 2 known input sets (documented in the test)

**Verification:**
- [ ] `pytest backend/projections` — settings read/write permissions, and forecast math against hand-calculated fixtures
- [ ] Manual: sanity-check one scenario's numbers against a spreadsheet calculation

**Dependencies:** Task 8 (needs current net worth as the projection's starting point)

**Files likely touched:**
- `backend/projections/models.py`, `backend/projections/services.py`, `backend/projections/serializers.py`, `backend/projections/views.py`
- `backend/projections/tests/test_projection_math.py`

**Estimated scope:** Medium (3-5 files)

---

## Task 11: Frontend projections page

**Description:** A form for monthly contribution / rates / optional target date, and a Recharts chart overlaying the 3 scenario lines against a flat ₹5 Cr target line, with each scenario's estimated date labeled and a visible "estimate, not a guarantee" disclaimer.

**Acceptance criteria:**
- [ ] Changing an input and saving updates the chart and estimated dates
- [ ] All three scenarios are visually distinguishable (color/legend) and the target line is clearly separate
- [ ] The "estimate" disclaimer is always visible on this page, not just on hover

**Verification:**
- [ ] `npm run test` — form submits the right payload shape; chart component renders 3 series + 1 target line given mock data
- [ ] Manual: change contribution amount, confirm dates shift sensibly (higher contribution → earlier date)

**Dependencies:** Task 9, Task 10

**Files likely touched:**
- `frontend/src/pages/Projections.tsx`
- `frontend/src/components/ProjectionChart.tsx`, `frontend/src/components/ProjectionForm.tsx`
- `frontend/src/api/projections.ts`

**Estimated scope:** Medium (3-5 files)

---

## Task 12: Milestone seed data, MilestoneAchievement detection, MonthlyCheckIn, ActivityLogEntry

**Description:** Create the `milestones` app. A migration seeds the 5 fixed milestone amounts. On every holding-valuation write (called from the `holdings` service, not duplicated logic), recompute net worth and create a `MilestoneAchievement` for any newly-crossed threshold not already achieved (guarded by a unique constraint on workspace+milestone — never double-fires). `MonthlyCheckIn` CRUD (either member). `ActivityLogEntry` created for: holding created, valuation updated, holding archived, milestone achieved, check-in created, partner joined — exposed via one `GET /api/timeline/` endpoint ordered newest-first.

**Acceptance criteria:**
- [ ] Crossing a milestone threshold (via a valuation update) creates exactly one `MilestoneAchievement`; repeating the crossing (e.g. value goes up, down, up again past the same threshold) does not create a duplicate
- [ ] `GET /api/timeline/` returns all event types in reverse-chronological order, scoped to the caller's workspace
- [ ] `POST /api/checkins/` creates a check-in and a corresponding timeline entry

**Verification:**
- [ ] `pytest backend/milestones` — crossing detection (including the no-duplicate-on-re-cross case), timeline ordering/scoping, check-in creation
- [ ] Manual: push a workspace's net worth across ₹25L via the API, confirm one achievement + one timeline entry, not more

**Dependencies:** Task 8 (hooks into the holding-valuation write path), Task 6 (partner-joined event)

**Files likely touched:**
- `backend/milestones/models.py`, `backend/milestones/migrations/0002_seed_milestones.py`, `backend/milestones/services.py`, `backend/milestones/views.py`
- `backend/holdings/services.py` (call out to milestone check after valuation write)
- `backend/milestones/tests/test_milestones.py`

**Estimated scope:** Large (5-8 files) — the cross-app wiring (holdings → milestones) is the inherently coupled part of this slice; keeping detection logic and its trigger point in one task avoids a half-wired feature landing in two separate sessions.

---

## Task 13: Frontend timeline feed + check-in form + milestone badge

**Description:** A Timeline page rendering the activity feed (icon/label per event type), a Monthly Check-in form (notes + action items) reachable from the timeline, and a "next milestone" badge on the Dashboard showing the next unachieved threshold and how far away it is.

**Acceptance criteria:**
- [ ] Timeline renders all event types with human-readable descriptions, newest first
- [ ] Submitting a check-in adds it to the timeline without a full reload
- [ ] Dashboard's "next milestone" badge matches the backend's unachieved-milestone list (not hardcoded)

**Verification:**
- [ ] `npm run test` — timeline item rendering for each event type (mocked data) and check-in form submission
- [ ] Manual: submit a check-in, confirm it appears at the top of the timeline immediately

**Dependencies:** Task 9, Task 12

**Files likely touched:**
- `frontend/src/pages/Timeline.tsx`
- `frontend/src/components/CheckInForm.tsx`, `frontend/src/components/MilestoneBadge.tsx`
- `frontend/src/api/timeline.ts`

**Estimated scope:** Medium (3-5 files)

---

## Checkpoint: Projections & Milestones
- [ ] Projection page shows labeled scenario estimates
- [ ] Milestone crossing and check-ins both land correctly on the timeline, no duplicates
- [ ] Review before final polish

---

## Task 14: `seed_demo` management command

**Description:** A Django management command that creates two demo users, a shared workspace, a realistic mix of holdings (stocks, MF, cash, FD, property, business equity, one loan) with multi-month valuation history crossing at least one milestone, default projection settings, and one monthly check-in. Idempotent (safe to re-run against a fresh DB).

**Acceptance criteria:**
- [ ] `python manage.py seed_demo` populates a fully walkable demo end-to-end
- [ ] Re-running it on a DB that already has the seed data doesn't create duplicates or crash

**Verification:**
- [ ] Fresh `migrate` + `seed_demo` + log in as either demo user in the browser → dashboard, timeline, and projections all show non-empty, sensible data
- [ ] Re-run the command a second time, confirm no duplicate workspaces/users

**Dependencies:** Task 12

**Files likely touched:**
- `backend/holdings/management/commands/seed_demo.py` (or a new `seed/` app if cleaner)

**Estimated scope:** Small (1-2 files)

---

## Task 15: Authorization test sweep

**Description:** Cross-check SPEC.md's Success Criteria 3–6 against the test suite written incrementally in Tasks 4–12; add any missing case explicitly (don't rely on it being an accidental side effect of another test).

**Acceptance criteria:**
- [ ] Explicit test exists for: cross-workspace access denial, individual-holding edit blocked for non-owner, joint-holding editable by both, invite code single-use/expiry/capacity
- [ ] Explicit test exists for: net worth correctness with mixed ownership and an archived holding excluded

**Verification:**
- [ ] `pytest` full suite green
- [ ] Coverage report (or manual read-through) confirms no SPEC.md Success Criteria 3–6 item is untested

**Dependencies:** Task 12

**Files likely touched:**
- `backend/*/tests/*.py` (additions only, wherever a gap is found)

**Estimated scope:** Small (1-2 files, likely)

---

## Task 16: README.md + DESIGN_DECISIONS.md

**Description:** Write the submission docs: README covers setup (Docker Postgres, backend, frontend, env vars, migrations, seed command), architecture summary, data model, and how access control is enforced. DESIGN_DECISIONS.md has the reasoning table (decision / alternatives considered / why this one) and a "future expansion ideas" section.

**Acceptance criteria:**
- [ ] A person with nothing installed but Docker, Python, and Node can follow the README start-to-finish and reach a working app with seeded data
- [ ] Access control section explains the workspace-scoping + ownership-permission model concretely (not just "there's auth")
- [ ] DESIGN_DECISIONS.md reasoning table covers at minimum: JWT vs sessions, unified Holding model, append-only valuations, synchronous milestone detection, TypeScript, Tailwind

**Verification:**
- [ ] Manual: follow the README on a clean checkout (or have a fresh agent session follow it) and confirm it works as written

**Dependencies:** Task 14

**Files likely touched:**
- `README.md`
- `DESIGN_DECISIONS.md`

**Estimated scope:** Small (1-2 files)

---

## Task 17: Deployment config (Render + Netlify), no actual deploy

**Description:** Add `render.yaml` (or Render dashboard-equivalent docs) for the Django web service + managed Postgres, and `netlify.toml` (or equivalent) for the frontend static build, plus an env var checklist for both. Do not actually deploy — this is config-as-code for later, reviewed and approved by the human before any real deploy happens.

**Acceptance criteria:**
- [ ] `render.yaml` defines the web service (build/start commands, env vars referencing secrets, not values) and a Postgres instance
- [ ] `netlify.toml` defines the frontend build command/publish dir and the `VITE_API_URL` env var is documented as a dashboard setting, not committed
- [ ] README links to this config and states deployment is a manual, explicit step

**Verification:**
- [ ] Manual review only — config files are valid YAML/TOML (lint, don't deploy)

**Dependencies:** Task 16

**Files likely touched:**
- `render.yaml`
- `frontend/netlify.toml`

**Estimated scope:** Small (1-2 files)

---

## Task 18: Full golden-path manual verification pass

**Description:** Run the entire app locally end-to-end exactly as a grader would: fresh clone-equivalent state, follow the README, walk through every SPEC.md Success Criterion 1–10, and fix anything that doesn't hold up.

**Acceptance criteria:**
- [ ] Every SPEC.md Success Criterion (1–10) individually confirmed, not just "it generally works"
- [ ] `pytest` and `npm run test` both green on a clean run
- [ ] No console errors in the browser during the golden path

**Verification:**
- [ ] This task's own acceptance criteria are the verification — record which criterion was checked how (API call, UI click-through, or test name)

**Dependencies:** Task 17

**Files likely touched:** none expected (bugfixes only, scoped to whatever is found)

**Estimated scope:** Small, but open-ended if bugs are found — re-split into fix tasks if a fix touches more than ~5 files

---

## Checkpoint: Complete
- [ ] `pytest` and `npm run test` both green
- [ ] SPEC.md Success Criteria 1–10 all verified
- [ ] Ready for human review

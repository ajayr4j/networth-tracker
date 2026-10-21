# Net Worth Tracker

A full-stack app for a couple to track combined net worth and progress toward a
shared ₹5 crore goal: asset/liability tracking with ownership tagging, a shared
workspace, wealth projections, and a milestone/activity timeline.

- **Backend:** Django 5.2 + Django REST Framework + `djangorestframework-simplejwt`, PostgreSQL
- **Frontend:** React 19 + TypeScript + Vite + Tailwind v4 + TanStack Query + Recharts

See [SPEC.md](SPEC.md) for the full product spec and [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md)
for the reasoning behind key technical choices.

## Prerequisites

- Docker (for PostgreSQL)
- Python 3.10+
- Node 20+ and npm

## 1. Start PostgreSQL

From the repo root:

```bash
docker compose up -d
```

This starts a `postgres:16` container on host port `5437` (mapped from the
container's `5432`), using the credentials in the root `.env` file
(`networth` / `networth` / `networth`, db name `networth`). Wait for it to
report healthy:

```bash
docker compose ps
```

## 2. Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

> If `python3 -m venv` fails with an `ensurepip is not available` error
> (common on minimal Debian/Ubuntu installs), either install the matching
> venv package (`sudo apt install python3-venv`) or use `virtualenv venv`
> instead. Note that `virtualenv` on some Debian/Ubuntu systems places the
> interpreter under `venv/local/bin/` rather than `venv/bin/` — check which
> path exists and use/activate that one.

```bash
cp .env.example .env          # defaults already match docker-compose.yml, edit if needed
python manage.py migrate
python manage.py seed_demo    # creates demo users + sample data (safe to re-run)
python manage.py runserver
```

The backend now serves the API at `http://localhost:8000/api/`.

The seed command prints the demo login credentials; by default they are:

- `alice.demo@example.com` / `demo-pass-1234`
- `bob.demo@example.com` / `demo-pass-1234`

(Both users belong to the same seeded workspace, so either one can be used to
explore the full app with realistic multi-month data already in place.)

### Backend environment variables (`backend/.env`)

| Variable | Purpose | Example |
|---|---|---|
| `SECRET_KEY` | Django secret key | `dev-only-not-for-production` |
| `DEBUG` | Django debug mode | `True` |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost,127.0.0.1` |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_HOST` / `POSTGRES_PORT` | DB connection pieces, combined into the Postgres connection URL | see `.env.example` |
| `DATABASE_URL` | Optional: set this directly instead of the `POSTGRES_*` pieces above | `postgres://networth:networth@localhost:5437/networth` |
| `CORS_ALLOWED_ORIGINS` | Origins allowed to call the API | `http://localhost:5173` |

### Run backend tests

```bash
cd backend
pytest
```

61 tests cover net worth math (asset/liability sums, ownership mixes,
archived-holding exclusion, historical series), authorization (workspace
isolation, individual vs. joint edit permissions, invite redemption rules),
and the core CRUD/valuation-history flows.

## 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env.local     # already points at http://localhost:8000/api
npm run dev
```

Open `http://localhost:5173` and log in with one of the seeded demo accounts
above.

### Frontend environment variables (`frontend/.env.local`)

| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend API | `http://localhost:8000/api` |

### Run frontend tests

```bash
cd frontend
npm test
```

## Architecture

```
React (Vite, TS) ── axios ──▶ Django REST Framework ──▶ PostgreSQL
     │ TanStack Query               │ simplejwt auth
     │ Tailwind / Recharts          │ 5 Django apps (below)
```

Backend apps, in dependency order:

1. **`accounts`** — custom email-based `User` model, registration, JWT login/refresh (`/api/accounts/`)
2. **`workspaces`** — `Workspace`, `WorkspaceMembership`, `WorkspaceInvite`; a workspace holds exactly 2 members (`/api/workspaces/`, `/api/invites/redeem/`)
3. **`holdings`** — `Holding` + append-only `HoldingValuation`; net worth calculation (`/api/holdings/`, `/api/dashboard/`)
4. **`projections`** — `ProjectionSettings` + conservative/base/optimistic forecast math (`/api/projections/`)
5. **`milestones`** — `Milestone`, `MilestoneAchievement`, `MonthlyCheckIn`, `ActivityLogEntry` (`/api/timeline/`, `/api/checkins/`, `/api/milestones/`)

Frontend pages, each consuming the matching backend module: `Login`/`Register`
→ `Dashboard` (net worth, progress, chart, next milestone) → `Holdings` (CRUD +
value updates) → `Projections` (scenario chart) → `Timeline` (activity feed +
check-in form).

## Data model

```
User (email, display_name)
  └─ WorkspaceMembership (1:1 per user) ──┐
                                           ▼
                                      Workspace (max 2 members)
                                           │
        ┌──────────────┬──────────────────┼──────────────────┬───────────────┐
        ▼              ▼                  ▼                  ▼               ▼
  WorkspaceInvite   Holding          ProjectionSettings  MonthlyCheckIn  ActivityLogEntry
  (code, expiry,    (kind, category,  (1:1, contribution/   (month,       (event_type,
   accepted_by)      owner_type,       rate scenarios)       notes,        description,
                     owner_user)                             actions)      metadata)
                        │
                        ▼
                  HoldingValuation
                  (value, as_of — append-only,
                   never updated or deleted)

                  Milestone (₹25L/50L/1Cr/2Cr/5Cr, fixed)
                        │
                        ▼
                  MilestoneAchievement
                  (workspace, milestone, achieved_at — unique per workspace+milestone)
```

Key points:

- **`Holding` is a single model for both assets and liabilities**, distinguished by
  `kind`. Net worth = sum of asset holdings' latest valuation minus sum of
  liability holdings' latest valuation, as of a given date.
- **`HoldingValuation` rows are never updated or deleted.** Editing a holding's
  value inserts a new `HoldingValuation` row (via `PATCH /api/holdings/<id>/value/`);
  the current value is always "the valuation with the latest `as_of` date."
  This preserves full history for the dashboard's historical chart.
- **Ownership** is `individual` (tied to one `owner_user`) or `joint` (no
  owner, editable by both workspace members).
- **A workspace is capped at 2 members** (enforced in `WorkspaceInvite`
  redemption), matching the "couple" product shape.

## Access control

Two independent checks, both enforced server-side on every request that
touches workspace-scoped data:

1. **Workspace isolation** (`workspaces/permissions.py::IsWorkspaceMember`) —
   every holding, invite, projection setting, check-in, and activity entry
   belongs to exactly one `Workspace`. Every detail/list view filters queries
   by the requesting user's own `workspace_membership` and additionally checks
   object-level permission before returning or mutating a specific row. A
   user who is not a member of the workspace that owns a resource gets `404`
   (not `403`) on direct access, so workspace membership itself isn't leaked.

2. **Ownership permission** (`holdings/permissions.py::CanEditHolding`) —
   within a workspace, both members can always *read* any holding (`SAFE_METHODS`
   always pass once workspace membership is confirmed). For *writes*
   (value updates, archiving), a `joint` holding can be edited by either
   member, but an `individual` holding can only be edited by the member it's
   tied to (`obj.owner_user_id == request.user.id`). The other partner gets
   `403` attempting to edit a holding they don't own.

Authentication itself is stateless JWT (`djangorestframework-simplejwt`):
`POST /api/accounts/login/` returns an access + refresh token pair, the
frontend attaches the access token as `Authorization: Bearer <token>` on every
request, and `DEFAULT_PERMISSION_CLASSES` in `backend/config/settings.py`
requires authentication on all views by default (the only unauthenticated
routes are registration, login, token refresh, and `/api/health/`).

## API surface

| Area | Endpoints |
|---|---|
| Accounts | `POST /api/accounts/register/`, `POST /api/accounts/login/`, `POST /api/accounts/refresh/`, `GET /api/accounts/me/` |
| Workspaces | `GET/POST /api/workspaces/`, `GET /api/workspaces/mine/`, `POST /api/workspaces/<id>/invites/`, `POST /api/invites/redeem/` |
| Holdings | `GET/POST /api/holdings/`, `GET/DELETE /api/holdings/<id>/`, `PATCH /api/holdings/<id>/value/` |
| Dashboard | `GET /api/dashboard/` |
| Projections | `GET/PATCH /api/projections/settings/`, `GET /api/projections/forecast/` |
| Timeline / milestones | `GET /api/timeline/`, `GET/POST /api/checkins/`, `GET /api/milestones/` |

## Deployment

Config-as-code for a free-tier deploy lives at [render.yaml](render.yaml)
(Django backend + managed Postgres on Render) and
[frontend/netlify.toml](frontend/netlify.toml) (static frontend build on
Netlify). These files are **not** wired up to any live deployment and nothing
deploys automatically — connecting a Render/Netlify account to this repo and
triggering a deploy is a manual, explicit step for a human to take (and
should be reviewed before doing so).

Notes if/when that step happens:

- Render provisions `SECRET_KEY` and `DATABASE_URL` automatically (see
  `render.yaml`); update `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, and
  `CORS_ALLOWED_ORIGINS` to match the actual Render/Netlify hostnames once
  assigned.
- Netlify's `VITE_API_URL` is a build-time Vite env var (not a runtime one)
  — set it in the Netlify dashboard under Site configuration > Environment
  variables, pointing at the deployed backend's `/api` path, before
  triggering a build.
- After the first deploy, run the `seed_demo` management command against
  the production database via Render's shell if sample data is wanted there
  too.

## Repository layout

```
backend/             Django project (config/, accounts/, workspaces/, holdings/, projections/, milestones/)
frontend/            React app (src/pages, src/components, src/api, src/context), netlify.toml
docker-compose.yml   Local PostgreSQL
render.yaml          Render deployment config (backend + managed Postgres)
SPEC.md              Approved product spec
DESIGN_DECISIONS.md  Technical decisions + reasoning
architecture.excalidraw  Architecture/data-model diagram
```

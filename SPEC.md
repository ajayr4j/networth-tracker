# Spec: Couple's Net Worth & ₹5 Crore Goal Tracker

## Scope note (Phase 0)
The five feature areas (dashboard, holdings, collaboration, projections, milestones) are facets of one product with one shared data model and one acceptance bar — not independent capabilities with separate consumers. Treated as a single spec rather than a multi-module capability map. Internal module boundaries (accounts → workspaces → holdings → projections/milestones) are sequenced in the Plan/Tasks phase, not split into separate specs.

## Objective
A web app where two partners jointly track their combined net worth against a shared ₹5,00,00,000 (5 Cr) goal. Either partner can log in, see one shared dashboard, add/update assets and liabilities (individually owned or joint), watch historical net worth trend, project when they'll hit the goal under different return/contribution assumptions, and see milestones/timeline of progress. Success = a real couple could use this monthly to track progress, not a demo that only looks right with seed data.

**Users:** Two partners per workspace. Each has their own login; they share one workspace's financial data once both have joined it.

## Tech Stack
- **Backend:** Django 5.x + Django REST Framework. Auth via `djangorestframework-simplejwt` (JWT access/refresh tokens) — chosen over session+CSRF because frontend and backend are deployed on different origins/hosts (Netlify + Render) and JWT avoids cross-origin cookie complications.
- **DB:** PostgreSQL (local via Docker Compose for dev; Render Postgres free tier in prod).
- **Frontend:** React 18 + Vite + TypeScript. TypeScript chosen for maintainability (graded criterion), acceptable added overhead given the app's small-medium size.
- **Styling:** Tailwind CSS — fast to build a responsive dashboard without hand-rolled breakpoints.
- **Charts:** Recharts — handles the historical net worth line chart and projection-vs-target chart with minimal code.
- **Data fetching/state:** TanStack Query for server state (holdings, dashboard, projections); React Context for auth/session only.
- **Hosting target:** Render (Django web service + managed Postgres) for backend, Netlify (or Render static site) for frontend. Must run fully locally first via Docker Compose + `manage.py runserver` + `npm run dev`.

## Data Model (core)
- `User` — Django's built-in auth user (email as username).
- `Workspace` — one per couple. `created_by`.
- `WorkspaceMembership` — (`user`, `workspace`), symmetric role, `joined_at`. Max 2 active members per workspace.
- `WorkspaceInvite` — `workspace`, `code` (unique token), `created_by`, `created_at`, `expires_at`, `accepted_at`, `accepted_by`. No email sending — the inviter shares the code/link manually; invitee enters it after signing up/logging in to join.
- `Holding` — unified model for assets *and* liabilities. Fields: `workspace`, `kind` (ASSET/LIABILITY), `category` (stock, mutual_fund, cash, fd, property, business_equity, loan, other), `label`, `owner_type` (INDIVIDUAL/JOINT), `owner_user` (FK, null unless INDIVIDUAL), `created_by`, `created_at`, `archived_at` (soft delete — archived holdings stop counting toward *current* net worth but their valuation history remains for historical charts).
- `HoldingValuation` — append-only. `holding`, `value` (decimal), `as_of_date`, `recorded_at`, `note`. "Editing" a holding's value always inserts a new row; current value = latest `as_of_date` row per holding. Nothing is ever overwritten, satisfying the historical-integrity constraint.
- `ProjectionSettings` — one row per workspace: `monthly_contribution`, `conservative_rate`, `base_rate`, `optimistic_rate` (defaults 6%/10%/14% annual, editable), `target_amount` (default 5,00,00,000), `target_date` (optional user override), `updated_at`, `updated_by`.
- `Milestone` — fixed seed data: ₹25L, ₹50L, ₹1Cr, ₹2Cr, ₹5Cr (extensible later).
- `MilestoneAchievement` — `workspace`, `milestone`, `achieved_at`, `net_worth_at_achievement`. Recorded the first time a recomputed net worth crosses a threshold (checked on every valuation write).
- `MonthlyCheckIn` — `workspace`, `month` (first-of-month date), `notes`, `actions`, `created_by`, `created_at`.
- `ActivityLogEntry` — `workspace`, `actor` (nullable for system events), `event_type` (holding_created, valuation_updated, holding_archived, milestone_achieved, checkin_created, partner_joined), `description`, `metadata` (JSON), `created_at`. Feeds the timeline view.

**Net worth calculation:** `sum(latest valuation of all non-archived ASSET holdings in workspace) - sum(latest valuation of all non-archived LIABILITY holdings in workspace)`, as of "now" (or as of a given date, for the historical chart, by taking the latest valuation ≤ that date per holding). Individual + joint holdings are summed once each — ownership is a visibility/permission tag, not a separate ledger, so there's no double-counting risk by construction.

## Access Control (summary — full rules in README)
- All reads/writes are scoped to the requesting user's workspace(s); cross-workspace access returns 403/404.
- `Holding` with `owner_type=JOINT`: either partner can create/edit/archive.
- `Holding` with `owner_type=INDIVIDUAL`: only `owner_user` can edit/archive; the other partner has read-only access within the shared dashboard.
- `ProjectionSettings`, `MonthlyCheckIn`, viewing `ActivityLogEntry`/`Milestone` data: either partner can read/write (shared, no individual ownership).
- A workspace holds at most 2 members; invite codes expire and are single-use.

## Commands
Backend (run from `backend/`):
```
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo        # loads sample data
python manage.py runserver
pytest                             # test suite
flake8 . && black --check .        # lint
```
Frontend (run from `frontend/`):
```
npm install
npm run dev
npm run build
npm run test
npm run lint
```
Local full stack: `docker-compose up -d db` then run backend + frontend commands above against it.

## Project Structure
```
/
├── backend/
│   ├── config/          # settings, urls, wsgi/asgi
│   ├── accounts/        # user registration, JWT login/refresh
│   ├── workspaces/      # Workspace, Membership, Invite
│   ├── holdings/        # Holding, HoldingValuation, net worth calc
│   ├── projections/     # ProjectionSettings, projection math
│   ├── milestones/      # Milestone, MilestoneAchievement, MonthlyCheckIn, ActivityLogEntry
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/       # Login, Register, Dashboard, Holdings, Projections, Timeline, Settings
│       ├── components/  # ProgressBar, NetWorthChart, ProjectionChart, HoldingForm, etc.
│       ├── api/         # typed API client
│       ├── context/     # auth context
│       └── lib/         # client-side calc/formatting helpers
├── README.md
├── DESIGN_DECISIONS.md
└── docker-compose.yml
```

## Code Style
Backend — DRF ViewSets + serializers, snake_case, explicit queryset scoping per request user:
```python
class HoldingViewSet(viewsets.ModelViewSet):
    serializer_class = HoldingSerializer
    permission_classes = [IsWorkspaceMember, CanEditHolding]

    def get_queryset(self):
        return Holding.objects.filter(
            workspace__memberships__user=self.request.user,
            archived_at__isnull=True,
        )
```
Frontend — functional components, camelCase, hooks for data:
```tsx
export function NetWorthSummary() {
  const { data } = useDashboard();
  if (!data) return <Skeleton />;
  return <ProgressBar current={data.netWorth} target={data.targetAmount} />;
}
```

## Testing Strategy
- **Backend:** `pytest-django` + `factory_boy`. Required coverage: net worth calculation (joint + individual mix, archived holdings excluded, liabilities subtracted), projection math (all three scenarios, target-date estimate), milestone-crossing detection, and authorization (cross-workspace access denied, individual holding edit blocked for non-owner, joint holding editable by both, invite code single-use/expiry).
- **Frontend:** Vitest + React Testing Library on calculation-adjacent components (progress %, chart data shaping) and the auth-gated routing. No full e2e required at this scope.
- No fixed coverage %; tests must hit every item in the Success Criteria below.

## Boundaries
- **Always:** scope every queryset to the requester's workspace; insert new `HoldingValuation` rows rather than mutating value in place; run `pytest` and `npm run test` before considering a task done; validate monetary inputs server-side (non-negative, 2 decimal places).
- **Ask first:** changing the ownership/permission model, adding any paid third-party service, switching DB engine, changing the auth mechanism from JWT, hard-deleting any historical row.
- **Never:** overwrite or delete `HoldingValuation` rows, commit `.env`/secrets, bypass workspace scoping, roll custom password hashing.

## Success Criteria
1. Register → create workspace → dashboard shows ₹0 net worth, 0%, empty chart.
2. Generate invite code → second user registers/logs in → enters code → joins workspace → sees identical shared dashboard.
3. Adding assets/liabilities (mixed individual + joint) produces correct combined net worth (assets − liabilities, no double counting).
4. Editing a holding's value inserts a new valuation; prior values remain queryable; historical chart reflects value-over-time, not a flat overwrite.
5. Non-owner partner gets 403 editing/archiving the other's individual holding; both partners can edit a joint holding.
6. A user with no membership in a workspace gets 403/404 on any of its endpoints.
7. Projection view computes conservative/base/optimistic net worth trajectories and an estimated ₹5Cr target date per scenario, each visibly labeled "estimate."
8. Crossing ₹25L/50L/1Cr/2Cr/5Cr automatically creates a `MilestoneAchievement` exactly once, visible on the timeline alongside holding/check-in events.
9. `pytest` passes, covering items 3–6 above.
10. App runs end-to-end locally per README with seeded sample data demonstrating 2 partners, a mix of holding types, at least one crossed milestone, and one monthly check-in.

## Open Questions
1. **MVP/deadline:** not yet provided. Proceeding with the full feature list above as MVP; flag if a smaller first cut is wanted once the deadline arrives.
2. **Auth mechanism:** JWT (simplejwt) assumed — confirm, or prefer session+CSRF?
3. **Invite flow:** shareable code only, no email sending — confirm, or do you want actual email delivery (needs an SMTP/email provider)?
4. **Default projection rates:** proposing 6% / 10% / 14% annual (conservative/base/optimistic), user-editable — fine, or different defaults?
5. **Frontend language:** TypeScript assumed — confirm, or plain JavaScript preferred for speed?
6. **Styling:** Tailwind assumed — confirm, or prefer plain CSS/MUI/other?
7. **Hosting pair:** Render (backend+DB) + Netlify (frontend) assumed as the free-tier target — confirm?

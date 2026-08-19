# MediCare HMS — Hospital Management System

A modern hospital management system built with **React + Vite** on the frontend and **Supabase** (Postgres + Auth + RLS) on the backend.

## Features

- **Authentication** — Sign in / sign up / forgot & reset password, protected routes, "remember me"
- **Dashboard** — live stat cards (patients, doctors, today's appointments, revenue), charts, today's appointments, recent patients & doctors
- **Patients** — CRUD with pagination, search, auto-generated MR numbers
- **Doctors** — CRUD with department, specialization, license and consultation fee
- **Appointments** — CRUD, date/status filters, inline status updates, department auto-set from doctor
- **Departments** — CRUD with head doctor, color, live doctor/appointment counts
- **Billing & Invoices** — multi-line invoices, tax/discount, payments, overdue tracking, printable invoice view
- **Inventory** — stock levels, reorder alerts, auto-derived status (low / out of stock / expired), stock value
- **Staff** — CRUD with department, shift, salary, leave status
- **Reports** — revenue by status, appointments by status/department, top doctors, inventory health, latest invoices
- **Theme** — light/dark mode (persisted), global search (Ctrl/⌘+K)

## Tech Stack

- React 19, React Router 7, Vite
- Bootstrap-inspired custom CSS (design tokens, dark mode)
- Supabase (auth, Postgres, Row Level Security)
- react-icons, Vitest + Testing Library

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local   # then fill in your Supabase URL + anon key
```

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

```bash
# 3. Run dev server
npm run dev
```

> Get your project URL and anon key from **Supabase Dashboard → Settings → API**.

## Database Setup

All schema, RLS policies, triggers and seed data live in [`supabase/migrations/`](./supabase/migrations/). Run them in order:

```
001_extensions_and_types.sql
002_create_tables.sql
003_rls_policies.sql
004_functions_and_triggers.sql
005_seed_data.sql
```

If you have users who signed up **before** the schema existed, also run the backfill scripts:

```
006_fix_profile_fk.sql
007_backfill_profiles.sql
```

Then the aggregate functions and RBAC migrations:

```
008_aggregate_functions.sql
009_rbac_roles.sql
010_rbac_policies.sql
```

Then the account-status + permission-gating migrations. **011b is gated**: run it only after reviewing the verification query below.

```
011_profile_status.sql
011b_role_backfill.sql
012_permission_gating.sql
013_audit_and_corrections.sql
```

> 011b backfills any leftover `role = 'user'` accounts to `staff`. Before running it, paste this read-only query into the SQL Editor and confirm the results look right:

> ```sql
> select count(*) filter (where role = 'user') as legacy_users,
>        count(*) filter (where role is null or role = '') as null_role_users
> from public.profiles;
> ```

## Role-Based Access Control (RBAC)

Every user has a `role` and an account `status` in the `profiles` table. New signups always get `role = 'staff'` and `status = 'pending'` — there is no role selector on the signup form, and RLS prevents users from changing their own role or status or creating an admin profile.

Account statuses: `pending` (awaiting approval — app shows an "account pending" screen), `active` (full access), `suspended` (temporary, admin revokes), `deactivated` (rejected/removed).

Access requires `status = 'active'`. Permissions are enforced twice — in Postgres via the `has_permission(module, action)` helper + RLS policies, and in the UI via `src/utils/permissions.js` (`can(module, action)`).

- **`admin`** — every module, including account approvals, invoice/payment corrections, and settings.
- **`staff`** — patients, doctors, appointments, billing, payments, inventory, pharmacy, staff, reports.
- **`receptionist`** — patients (view/create/update), doctors (view), appointments, departments (view), billing, payments.
- **Legacy `user` / doctor / nurse / pharmacist** — fall through to the `staff` permission branch.

### Creating the first Admin

There is intentionally no public path to an admin account. After signing up normally (your account gets `role = 'staff'`, `status = 'pending'`), promote it from the **Supabase Dashboard → SQL Editor** — this activates the account at the same time:

```sql
update public.profiles p
set role = 'admin', status = 'active'
from auth.users u
where p.id = u.id
  and u.email = 'your-email@hospital.com';
```

Then refresh the app. Future role/status changes are done through the admin-only functions `public.admin_approve_staff(target_user_id, role, reason)` (approve + assign role), `public.admin_set_user_status(target_user_id, status, reason)`, and `public.admin_set_user_role(email, role)`.

## Supabase Auth URL Configuration

The app sends `redirectTo: ${window.location.origin}/reset-password` for password reset emails (see `src/pages/auth/ForgotPassword.jsx`), so the redirect always points back to wherever the app is currently running.

For Supabase to accept the redirect, configure the auth URLs in **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL:** `https://<your-production-domain>` (Vercel URL or custom domain)
- **Redirect URLs:** add one entry per environment, e.g.
  - `http://localhost:5173/**`
  - `https://<your-vercel-domain>/**`
  - `https://<your-custom-domain>/**`

If the current origin is missing from Redirect URLs, Supabase falls back to the Site URL — a leftover `http://localhost:5173` there is what causes deployed password reset links to redirect to localhost.

## Vercel Deployment

The repo includes a [`vercel.json`](./vercel.json) with a SPA rewrite so that client-side routes (e.g. `/reset-password`, `/patients`, `/doctors`) resolve to `index.html` instead of returning a Vercel 404 on direct navigation/reload. No extra configuration is needed for the password reset redirect — it is derived from `window.location.origin` at runtime.

## Available Scripts

| Command          | Description                    |
| ---------------- | ------------------------------ |
| `npm run dev`    | Start the dev server           |
| `npm run build`  | Production build               |
| `npm run preview`| Preview the production build   |
| `npm run lint`   | Run ESLint                     |
| `npm run test`   | Run Vitest test suite          |

## Project Structure

```
src/
├── assets/styles/      # CSS (tokens, layout, per-module styles)
├── components/
│   ├── auth/           # Auth layout + inputs
│   ├── dashboard/      # Dashboard widgets/charts
│   ├── routing/        # ProtectedRoute / PublicOnlyRoute
│   └── ui/             # Spinner etc.
├── context/            # Auth + Theme providers
├── data/               # Temporary mock data (dashboard charts)
├── hooks/              # Auth submit, password form helpers
├── layouts/            # AppShell (sidebar + topbar)
├── pages/              # One folder per module
├── services/           # Supabase data layer (per module)
├── utils/              # Shared helpers (auth, status)
└── test/               # Test setup
```

## Notes

- Dashboard charts (patient visits, appointment donut, bed occupancy, activity) currently use placeholder data in `src/data/mockData.js`; the stat numbers in the cards come from the live database.
- Access is role- and status-based: `admin` / `staff` / `receptionist` roles gated by account `status` (see above). Every module has fine-grained `has_permission(module, action)` RLS policies, so a user can never read or write beyond their role — the sidebar, buttons, and routes simply reflect the same matrix.

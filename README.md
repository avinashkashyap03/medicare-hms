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
- All authenticated users can read/write business data (shared hospital model). Role-based write restrictions are a planned enhancement.

-- ============================================================
-- MediCare HMS — 002_create_tables.sql
-- RUN SECOND (after 001)
-- ============================================================

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role user_role not null default 'staff',
  phone text,
  avatar_url text,
  designation text,
  created_at timestamptz not null default now()
);

create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  color text,
  head_doctor_id uuid,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table doctors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id),
  name text not null,
  department_id uuid references departments (id),
  specialization text,
  license_no text unique,
  phone text,
  email text,
  fee numeric(10,2) default 0,
  status text not null default 'active',
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table patients (
  id uuid primary key default gen_random_uuid(),
  mrn text unique not null,
  user_id uuid references profiles (id),
  name text not null,
  dob date,
  gender text,
  phone text,
  email text,
  address text,
  blood_group text,
  allergies text,
  insurance_no text,
  emergency_contact text,
  status text not null default 'active',
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients (id) on delete cascade,
  doctor_id uuid not null references doctors (id),
  department_id uuid references departments (id),
  date date not null,
  time time not null,
  type text,
  reason text,
  status appointment_status not null default 'scheduled',
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text unique not null,
  patient_id uuid not null references patients (id),
  appointment_id uuid references appointments (id),
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  paid_amount numeric(10,2) not null default 0,
  status invoice_status not null default 'pending',
  due_date date,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices (id) on delete cascade,
  amount numeric(10,2) not null,
  method payment_method not null default 'cash',
  transaction_id text,
  paid_at timestamptz not null default now(),
  created_by uuid references profiles (id)
);

create table inventory (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  category text,
  sku text unique,
  quantity int not null default 0,
  unit text,
  reorder_level int not null default 0,
  supplier text,
  purchase_price numeric(10,2) default 0,
  selling_price numeric(10,2) default 0,
  expiry_date date,
  location text,
  status stock_status not null default 'in_stock',
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id),
  name text not null,
  designation text not null,
  department_id uuid references departments (id),
  phone text,
  email text,
  shift text,
  salary numeric(10,2),
  hire_date date,
  status text not null default 'active',
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table pharmacy (
  id uuid primary key default gen_random_uuid(),
  drug_name text not null,
  generic_name text,
  category text,
  batch_no text,
  quantity int not null default 0,
  unit text,
  supplier text,
  purchase_price numeric(10,2) default 0,
  selling_price numeric(10,2) default 0,
  reorder_level int not null default 0,
  expiry_date date,
  status stock_status not null default 'in_stock',
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients (id) on delete cascade,
  doctor_id uuid not null references doctors (id),
  appointment_id uuid references appointments (id),
  drug_id uuid references pharmacy (id),
  drug_name text not null,
  dosage text,
  frequency text,
  duration text,
  instructions text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table beds (
  id uuid primary key default gen_random_uuid(),
  ward text not null,
  room_no text,
  bed_no text,
  type text,
  status bed_status not null default 'available',
  patient_id uuid references patients (id),
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
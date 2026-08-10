-- ============================================================
-- MediCare HMS — 001_extensions_and_types.sql
-- RUN THIS FIRST
-- ============================================================

-- Enable extensions
create extension if not exists pgcrypto;      -- gen_random_uuid()
create extension if not exists moddatetime;   -- updated_at auto-trigger

-- ENUM types
create type user_role as enum ('admin', 'doctor', 'receptionist', 'nurse', 'pharmacist', 'staff');
create type appointment_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
create type invoice_status as enum ('pending', 'paid', 'overdue', 'cancelled');
create type payment_method as enum ('cash', 'card', 'upi', 'bank_transfer', 'insurance');
create type bed_status as enum ('available', 'occupied', 'maintenance');
create type stock_status as enum ('in_stock', 'low', 'out_of_stock', 'expired');
-- ============================================================
-- MediCare HMS — 005_seed_data.sql
-- RUN LAST (after 004)
-- ============================================================

insert into departments (name, color) values
  ('Cardiology',   '#2563eb'),
  ('Neurology',    '#8b5cf6'),
  ('Pediatrics',   '#0ea5e9'),
  ('Orthopedics',  '#f59e0b'),
  ('Dermatology',  '#10b981'),
  ('Gynecology',   '#ec4899');

insert into patients (mrn, name, dob, gender, phone, blood_group, status) values
  ('P-9081', 'Sofia Martinez',  '1992-04-12', 'Female', '+1 555-0101', 'O+',  'active'),
  ('P-9080', 'Michael Lee',     '1974-08-25', 'Male',   '+1 555-0102', 'A+',  'active'),
  ('P-9079', 'Isabella Taylor', '1998-11-03', 'Female', '+1 555-0103', 'B-',  'active'),
  ('P-9078', 'James Wilson',    '1965-02-17', 'Male',   '+1 555-0104', 'AB+', 'active');

insert into doctors (name, department_id, specialization, phone, email, fee, status) values
  ('Dr. Sarah Chen',  (select id from departments where name = 'Cardiology'), 'Cardiology', '+1 555-0201', 'sarah.chen@medicare.io',  150, 'active'),
  ('Dr. David Kim',   (select id from departments where name = 'Neurology'),  'Neurology',  '+1 555-0202', 'david.kim@medicare.io',   140, 'active'),
  ('Dr. Emily Davis', (select id from departments where name = 'Pediatrics'), 'Pediatrics', '+1 555-0203', 'emily.davis@medicare.io', 120, 'active');

insert into beds (ward, room_no, bed_no, type, status) values
  ('General Ward', 'R-101', 'B-01', 'General',   'available'),
  ('General Ward', 'R-101', 'B-02', 'General',   'available'),
  ('ICU',          'R-201', 'B-01', 'ICU',       'available'),
  ('ICU',          'R-201', 'B-02', 'ICU',       'available'),
  ('Emergency',    'R-001', 'B-01', 'Emergency', 'available'),
  ('Maternity',    'R-301', 'B-01', 'Maternity', 'available');

insert into inventory (item_name, category, quantity, unit, reorder_level, status) values
  ('Surgical Gloves', 'Consumables', 500, 'box', 100, 'in_stock'),
  ('Syringe 5ml',     'Consumables', 320, 'pcs', 50,  'in_stock'),
  ('Bandage Roll',    'Consumables', 45,  'pcs', 60,  'low');

insert into pharmacy (drug_name, generic_name, category, quantity, unit, reorder_level, status) values
  ('Paracetamol',   'Acetaminophen', 'Analgesic',    200, 'strip', 50, 'in_stock'),
  ('Amoxicillin',   'Amoxicillin',   'Antibiotic',   30,  'strip', 40, 'low'),
  ('Insulin 100IU', 'Insulin',       'Antidiabetic', 80,  'vial',  20, 'in_stock');
/* ------------------------------------------------------------------
   MediCare HMS — TEMPORARY PLACEHOLDER DATA (Dummy)
   ===========================================================
   NOTE: This file contains hardcoded dummy values used only to give
   the dashboard a realistic look during development.

   It must be REPLACED with real data before going to production.
   To wire real data:
     1. Create the matching tables in Supabase
        (see supabase.com dashboard > SQL Editor).
     2. Swap these exports for queries via src/services/supabase.js
        (e.g. from('patients').select('*')).
   Until then, the numbers below are NOT real hospital data.
   ------------------------------------------------------------------- */

export const dashboardStats = [
  {
    id: 'patients',
    label: 'Total Patients',
    value: '8,846',
    delta: +12.5,
    color: 'blue',
    spark: [4, 5, 4.6, 6, 5.4, 6.8, 7.5, 7.2, 8.4, 8.8, 9.2, 10],
  },
  {
    id: 'doctors',
    label: 'Total Doctors',
    value: '1,240',
    delta: +3.2,
    color: 'violet',
    spark: [2, 2.2, 2.1, 2.5, 2.8, 2.6, 3, 3.2, 3.1, 3.5, 3.7, 3.9],
  },
  {
    id: 'appointments',
    label: "Today's Appointments",
    value: '428',
    delta: +8.1,
    color: 'info',
    spark: [3, 4, 3.4, 4.5, 4, 5, 5.4, 6, 5.2, 6.4, 7, 7.4],
  },
  {
    id: 'revenue',
    label: 'Revenue',
    value: '$48.2k',
    delta: -2.3,
    color: 'success',
    spark: [9, 8.4, 8.8, 8, 8.4, 7.6, 8.2, 7.8, 7.2, 7.6, 7, 6.8],
  },
  {
    id: 'pharmacy',
    label: 'Medicines',
    value: '0',
    delta: 0,
    color: 'info',
    spark: [2, 2.4, 2.2, 2.8, 3, 2.8, 3.4, 3.2, 3.8, 4, 4.2, 4.6],
  },
];

export const patientVisits = [
  { m: 'Jan', v: 2100 },
  { m: 'Feb', v: 2400 },
  { m: 'Mar', v: 2300 },
  { m: 'Apr', v: 2800 },
  { m: 'May', v: 2600 },
  { m: 'Jun', v: 3100 },
  { m: 'Jul', v: 2900 },
  { m: 'Aug', v: 3400 },
  { m: 'Sep', v: 3200 },
  { m: 'Oct', v: 3800 },
  { m: 'Nov', v: 3600 },
  { m: 'Dec', v: 4200 },
];

export const patientVisitsWeekly = [
  { m: 'Mon', v: 412 },
  { m: 'Tue', v: 485 },
  { m: 'Wed', v: 530 },
  { m: 'Thu', v: 468 },
  { m: 'Fri', v: 612 },
  { m: 'Sat', v: 320 },
  { m: 'Sun', v: 275 },
];

export const patientVisitsYearly = [
  { m: '2022', v: 28200 },
  { m: '2023', v: 30500 },
  { m: '2024', v: 33100 },
  { m: '2025', v: 35900 },
  { m: '2026', v: 38400 },
];

export const appointmentStatus = [
  { label: 'Completed', value: 46, color: '#10b981' },
  { label: 'Pending', value: 24, color: '#f59e0b' },
  { label: 'Cancelled', value: 12, color: '#ef4444' },
  { label: 'Scheduled', value: 18, color: '#2563eb' },
];

export const bedOccupancy = [
  { ward: 'General Ward', used: 78, total: 100 },
  { ward: 'ICU', used: 62, total: 80 },
  { ward: 'Emergency', used: 41, total: 50 },
  { ward: 'Maternity', used: 55, total: 60 },
];

export const todaysAppointments = [
  { id: '#APT-3842', patient: 'Olivia Martin', doctor: 'Dr. Sarah Chen', time: '09:00 AM', type: 'General', status: 'Completed' },
  { id: '#APT-3841', patient: 'Noah Williams', doctor: 'Dr. David Kim', time: '09:30 AM', type: 'Cardiology', status: 'Scheduled' },
  { id: '#APT-3840', patient: 'Emma Johnson', doctor: 'Dr. Emily Davis', time: '10:15 AM', type: 'Pediatrics', status: 'In Progress' },
  { id: '#APT-3839', patient: 'Liam Brown', doctor: 'Dr. James Chen', time: '11:00 AM', type: 'Dermatology', status: 'Scheduled' },
  { id: '#APT-3838', patient: 'Ava Garcia', doctor: 'Dr. David Kim', time: '11:45 AM', type: 'Neurology', status: 'Cancelled' },
];

export const recentPatients = [
  { id: 'P-9081', name: 'Sofia Martinez', gender: 'Female', age: 34, dept: 'Cardiology', visit: 'Today', color: '#2563eb' },
  { id: 'P-9080', name: 'Michael Lee', gender: 'Male', age: 52, dept: 'Orthopedics', visit: 'Yesterday', color: '#8b5cf6' },
  { id: 'P-9079', name: 'Isabella Taylor', gender: 'Female', age: 28, dept: 'Dermatology', visit: 'Yesterday', color: '#0ea5e9' },
  { id: 'P-9078', name: 'James Wilson', gender: 'Male', age: 61, dept: 'Neurology', visit: '2 days ago', color: '#f59e0b' },
  { id: 'P-9077', name: 'Mia Anderson', gender: 'Female', age: 45, dept: 'Gynecology', visit: '3 days ago', color: '#10b981' },
];

export const recentActivity = [
  { icon: 'appointment', text: 'Dr. Emily Davis added a new appointment', time: '5 min ago', color: 'blue' },
  { icon: 'patient', text: 'Ava Garcia profile was updated', time: '22 min ago', color: 'info' },
  { icon: 'lab', text: 'Lab results uploaded for Liam Brown', time: '1 hr ago', color: 'violet' },
  { icon: 'invoice', text: 'Invoice #INV-1142 generated for Emma Johnson', time: '3 hrs ago', color: 'success' },
  { icon: 'bed', text: 'ICU bed #12 released and sanitized', time: '5 hrs ago', color: 'amber' },
];
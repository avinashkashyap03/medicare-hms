import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext.jsx';
import SignIn from '@/pages/auth/SignIn.jsx';
import SignUp from '@/pages/auth/SignUp.jsx';
import ForgotPassword from '@/pages/auth/ForgotPassword.jsx';
import ResetPassword from '@/pages/auth/ResetPassword.jsx';
import Dashboard from '@/pages/dashboard/Dashboard.jsx';
import Patients from '@/pages/patients/Patients.jsx';
import Doctors from '@/pages/doctors/Doctors.jsx';
import Appointments from '@/pages/appointments/Appointments.jsx';
import Departments from '@/pages/departments/Departments.jsx';
import Billing from '@/pages/billing/Billing.jsx';
import Inventory from '@/pages/inventory/Inventory.jsx';
import Staff from '@/pages/staff/Staff.jsx';
import Reports from '@/pages/reports/Reports.jsx';
import Pharmacy from '@/pages/pharmacy/Pharmacy.jsx';
import ComingSoon from '@/pages/ComingSoon.jsx';
import AppShell from '@/layouts/AppShell.jsx';
import ProtectedRoute from '@/components/routing/ProtectedRoute.jsx';
import PublicOnlyRoute from '@/components/routing/PublicOnlyRoute.jsx';

const placeholderPages = [
  { path: 'profile', title: 'My Profile' },
  { path: 'settings', title: 'Settings' },
];

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/" element={<SignIn />} />
            <Route path="/login" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/doctors" element={<Doctors />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/departments" element={<Departments />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/pharmacy" element={<Pharmacy />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/reports" element={<Reports />} />
              {placeholderPages.map((page) => (
                <Route key={page.path} path={`/${page.path}`} element={<ComingSoon title={page.title} />} />
              ))}
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
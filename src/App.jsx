import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext.jsx';
import SignIn from '@/pages/auth/SignIn.jsx';
import SignUp from '@/pages/auth/SignUp.jsx';
import ForgotPassword from '@/pages/auth/ForgotPassword.jsx';
import ResetPassword from '@/pages/auth/ResetPassword.jsx';
import Dashboard from '@/pages/dashboard/Dashboard.jsx';
import Profile from '@/pages/profile/Profile.jsx';
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
import PermissionRoute from '@/components/routing/PermissionRoute.jsx';

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
              <Route path="/profile" element={<Profile />} />

              <Route element={<PermissionRoute module="departments" />}>
                <Route path="/departments" element={<Departments />} />
              </Route>
              <Route element={<PermissionRoute module="billing" />}>
                <Route path="/billing" element={<Billing />} />
              </Route>
              <Route element={<PermissionRoute module="inventory" />}>
                <Route path="/inventory" element={<Inventory />} />
              </Route>
              <Route element={<PermissionRoute module="pharmacy" />}>
                <Route path="/pharmacy" element={<Pharmacy />} />
              </Route>
              <Route element={<PermissionRoute module="staff" />}>
                <Route path="/staff" element={<Staff />} />
              </Route>
              <Route element={<PermissionRoute module="reports" />}>
                <Route path="/reports" element={<Reports />} />
              </Route>
              <Route element={<PermissionRoute module="settings" />}>
                <Route path="/settings" element={<ComingSoon title="Settings" />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
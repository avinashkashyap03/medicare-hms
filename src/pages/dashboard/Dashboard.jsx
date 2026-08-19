import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '@/components/dashboard/StatCard.jsx';
import PatientVisitsChart from '@/components/dashboard/PatientVisitsChart.jsx';
import AppointmentDonut from '@/components/dashboard/AppointmentDonut.jsx';
import BedOccupancy from '@/components/dashboard/BedOccupancy.jsx';
import AppointmentsTable from '@/components/dashboard/AppointmentsTable.jsx';
import RecentPatients from '@/components/dashboard/RecentPatients.jsx';
import RecentDoctors from '@/components/dashboard/RecentDoctors.jsx';
import RecentActivity from '@/components/dashboard/RecentActivity.jsx';
import QuickActions from '@/components/dashboard/QuickActions.jsx';
import { dashboardStats } from '@/data/mockData.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { getUserDisplay } from '@/utils/auth.js';
import { getPatientCount } from '@/services/patients.js';
import { getDoctorCount } from '@/services/doctors.js';
import { getTodayAppointmentCount } from '@/services/appointments.js';
import { getBillingStats } from '@/services/billing.js';
import { getPharmacyCount } from '@/services/pharmacy.js';

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function Dashboard() {
  const { user, isAdmin, can } = useAuth();
  const { firstName } = getUserDisplay(user);
  const [patientCount, setPatientCount] = useState(null);
  const [doctorCount, setDoctorCount] = useState(null);
  const [appointmentCount, setAppointmentCount] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [pharmacyCount, setPharmacyCount] = useState(null);

  const canBilling = can('billing', 'view');
  const canPharmacy = can('pharmacy', 'view');

  useEffect(() => {
    let cancelled = false;
    getPatientCount()
      .then((count) => {
        if (!cancelled) setPatientCount(count);
      })
      .catch((err) => {
        console.error('Failed to load patient count:', err);
        if (!cancelled) setPatientCount(null);
      });
    getDoctorCount()
      .then((count) => {
        if (!cancelled) setDoctorCount(count);
      })
      .catch((err) => {
        console.error('Failed to load doctor count:', err);
        if (!cancelled) setDoctorCount(null);
      });
    getTodayAppointmentCount()
      .then((count) => {
        if (!cancelled) setAppointmentCount(count);
      })
      .catch((err) => {
        console.error('Failed to load appointment count:', err);
        if (!cancelled) setAppointmentCount(null);
      });
    if (canBilling) {
      getBillingStats()
        .then((stats) => {
          if (!cancelled) setRevenue(stats?.collected ?? 0);
        })
        .catch((err) => {
          console.error('Failed to load revenue:', err);
          if (!cancelled) setRevenue(null);
        });
    }
    if (canPharmacy) {
      getPharmacyCount()
        .then((count) => {
          if (!cancelled) setPharmacyCount(count);
        })
        .catch((err) => {
          console.error('Failed to load pharmacy count:', err);
          if (!cancelled) setPharmacyCount(null);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [canBilling, canPharmacy]);

  const visibleStats = dashboardStats.filter((stat) => {
    if (stat.id === 'revenue') return canBilling;
    if (stat.id === 'pharmacy') return canPharmacy;
    return true;
  });

  const stats = visibleStats.map((stat) => {
    if (stat.id === 'patients') {
      return { ...stat, value: patientCount === null ? '—' : patientCount.toLocaleString() };
    }
    if (stat.id === 'doctors') {
      return { ...stat, value: doctorCount === null ? '—' : doctorCount.toLocaleString() };
    }
    if (stat.id === 'appointments') {
      return { ...stat, value: appointmentCount === null ? '—' : appointmentCount.toLocaleString(), to: '/appointments' };
    }
    if (stat.id === 'revenue') {
      return {
        ...stat,
        value: revenue === null ? '—' : formatCurrency(revenue),
        delta: 0,
        to: canBilling ? '/billing' : null,
      };
    }
    if (stat.id === 'pharmacy') {
      return {
        ...stat,
        value: pharmacyCount === null ? '—' : pharmacyCount.toLocaleString(),
        delta: 0,
        to: canPharmacy ? '/pharmacy' : null,
      };
    }
    return stat;
  });

  return (
    <main className="content">
      <section className="welcome">
        <div>
          <span className="welcome-date">{formatDate()}</span>
          <h1 className="welcome-title">Welcome back, {firstName} 👋</h1>
          <p className="welcome-sub">Here is what&apos;s happening with your hospital today.</p>
        </div>
        <Link to="/appointments" className="btn-primary">
          + New Appointment
        </Link>
      </section>

      <section className={`stats-grid grid-${stats.length}`}>
        {stats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </section>

      <section className="dash-grid">
        <div className="dash-span-2">
          <PatientVisitsChart />
        </div>
        <div>
          <AppointmentDonut />
        </div>
      </section>

      <section className="dash-grid dash-grid-mid">
        <div className="dash-span-2">
          <AppointmentsTable />
        </div>
        {isAdmin && (
          <div>
            <BedOccupancy />
          </div>
        )}
      </section>

      <section className="dash-grid">
        <div>
          <RecentPatients />
        </div>
        <div>
          <RecentDoctors />
        </div>
        <div>
          <QuickActions />
        </div>
        <div>
          <RecentActivity />
        </div>
      </section>
    </main>
  );
}

export default Dashboard;
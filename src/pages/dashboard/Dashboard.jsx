import { useState } from 'react';
import Sidebar from '@/components/dashboard/Sidebar.jsx';
import Topbar from '@/components/dashboard/Topbar.jsx';
import StatCard from '@/components/dashboard/StatCard.jsx';
import PatientVisitsChart from '@/components/dashboard/PatientVisitsChart.jsx';
import AppointmentDonut from '@/components/dashboard/AppointmentDonut.jsx';
import BedOccupancy from '@/components/dashboard/BedOccupancy.jsx';
import AppointmentsTable from '@/components/dashboard/AppointmentsTable.jsx';
import RecentPatients from '@/components/dashboard/RecentPatients.jsx';
import RecentActivity from '@/components/dashboard/RecentActivity.jsx';
import QuickActions from '@/components/dashboard/QuickActions.jsx';
import { dashboardStats } from '@/data/mockData.js';
import { useAuth } from '@/context/AuthContext.jsx';
import { getUserDisplay } from '@/utils/auth.js';

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function Dashboard() {
  const { user } = useAuth();
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { firstName } = getUserDisplay(user);

  return (
    <div className={`app-shell ${dark ? 'theme-dark' : ''}`}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="app-main">
        <Topbar
          dark={dark}
          onToggleTheme={() => setDark((d) => !d)}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <main className="content">
          <section className="welcome">
            <div>
              <span className="welcome-date">{formatDate()}</span>
              <h1 className="welcome-title">Welcome back, {firstName} 👋</h1>
              <p className="welcome-sub">Here is what&apos;s happening with your hospital today.</p>
            </div>
            <button type="button" className="btn-primary">
              + New Appointment
            </button>
          </section>

          <section className="stats-grid grid-4">
            {dashboardStats.map((stat) => (
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
            <div>
              <BedOccupancy />
            </div>
          </section>

          <section className="dash-grid">
            <div>
              <RecentPatients />
            </div>
            <div>
              <QuickActions />
            </div>
            <div>
              <RecentActivity />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
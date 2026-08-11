import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/dashboard/Sidebar.jsx';
import Topbar from '@/components/dashboard/Topbar.jsx';

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <div className="app-main">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
        <Outlet />
      </div>
    </div>
  );
}

export default AppShell;
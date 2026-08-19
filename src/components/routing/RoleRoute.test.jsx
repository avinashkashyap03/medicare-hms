import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RoleRoute from './RoleRoute.jsx';
import { useAuth } from '@/context/AuthContext.jsx';

vi.mock('@/context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

function renderRoleRoute(at = '/admin', role = 'user', loading = false) {
  useAuth.mockReturnValue({ role, loading });
  return render(
    <MemoryRouter initialEntries={[at]}>
      <Routes>
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        <Route element={<RoleRoute roles={['admin']} />}>
          <Route path="/admin" element={<div>Admin Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('RoleRoute', () => {
  it('shows a spinner while auth state is loading', () => {
    renderRoleRoute('/admin', null, true);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('renders the protected content for an allowed role', () => {
    renderRoleRoute('/admin', 'admin');
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument();
  });

  it('redirects users with a disallowed role to /dashboard', () => {
    renderRoleRoute('/admin', 'user');
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('redirects when the role is missing or unknown', () => {
    renderRoleRoute('/admin', 'staff');
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });
});
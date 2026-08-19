import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PermissionRoute from './PermissionRoute.jsx';
import { useAuth } from '@/context/AuthContext.jsx';

vi.mock('@/context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

function renderPermission(at = '/billing', can = () => true, loading = false) {
  useAuth.mockReturnValue({ can, loading });
  return render(
    <MemoryRouter initialEntries={[at]}>
      <Routes>
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        <Route element={<PermissionRoute module="billing" />}>
          <Route path="/billing" element={<div>Billing Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('PermissionRoute', () => {
  it('shows a spinner while auth state is loading', () => {
    renderPermission('/billing', () => true, true);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Billing Content')).not.toBeInTheDocument();
  });

  it('renders the protected content when the module is permitted', () => {
    renderPermission('/billing', () => true);
    expect(screen.getByText('Billing Content')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument();
  });

  it('redirects to /dashboard when the module is not permitted', () => {
    renderPermission('/billing', () => false);
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Billing Content')).not.toBeInTheDocument();
  });
});
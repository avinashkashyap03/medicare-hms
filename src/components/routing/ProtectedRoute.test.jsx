import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import { useAuth } from '@/context/AuthContext.jsx';

vi.mock('@/context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

function renderProtected(at = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('shows a spinner while auth state is loading', () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    renderProtected();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderProtected();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders the protected content for authenticated users', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    renderProtected();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
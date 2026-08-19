/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import supabase from '@/services/supabase.js';
import { can as canByRole } from '@/utils/permissions.js';

const AuthContext = createContext(null);

async function fetchProfile(authUser) {
  if (!authUser) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, status')
    .eq('id', authUser.id)
    .maybeSingle();
  if (error) {
    console.warn('Failed to load profile:', error);
    return null;
  }
  return data ?? null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user ?? null;
      if (!active) return;
      setUser(sessionUser);
      const prof = await fetchProfile(sessionUser);
      if (!active) return;
      setProfile(prof);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      // getSession() and this callback race on slow connections; whichever
      // resolves first must clear the initial loading state.
      if (active) setLoading(false);
      void fetchProfile(sessionUser).then((prof) => {
        if (active) setProfile(prof);
      });
    });

    return () => {
      active = false;
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    const prof = await fetchProfile(user);
    setProfile(prof);
  }, [user]);

  const signIn = async (email, password, rememberMe = true) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { persistSession: rememberMe },
    });
    if (error) throw error;
  };

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    return !data.session;
  };

  const resetPassword = async (email, redirectTo) => {
    const options = redirectTo ? { redirectTo } : {};
    const { error } = await supabase.auth.resetPasswordForEmail(email, options);
    if (error) throw error;
  };

  const exchangeRecoveryCode = async (code) => {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const role = profile?.role ?? null;
  const status = profile?.status ?? null;
  const isAdmin = role === 'admin';
  const isActive = status === 'active';
  const can = useCallback(
    (module, action) => canByRole(role, module, action),
    [role],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        status,
        isAdmin,
        isActive,
        can,
        loading,
        refreshProfile,
        signIn,
        signUp,
        resetPassword,
        exchangeRecoveryCode,
        updatePassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export default AuthContext;
/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../services/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription?.subscription?.unsubscribe();
  }, []);

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

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, resetPassword, exchangeRecoveryCode, updatePassword, signOut }}
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

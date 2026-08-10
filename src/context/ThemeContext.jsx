/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useEffect, useState } from 'react';

const THEME_KEY = 'medicare-theme';

const ThemeContext = createContext(null);

function getInitialDark() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
  } catch {
    // localStorage unavailable (e.g. private mode) — fall through to default
  }
  return false;
}

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(getInitialDark);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', dark);
  }, [dark]);

  const toggleTheme = () => {
    setDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      } catch {
        // ignore storage failures — theme still applies this session
      }
      return next;
    });
  };

  return <ThemeContext.Provider value={{ dark, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
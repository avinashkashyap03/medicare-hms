import { describe, expect, it, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext.jsx';

const THEME_KEY = 'medicare-theme';

function ThemeProbe() {
  const { dark, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      {dark ? 'dark' : 'light'}
    </button>
  );
}

describe('ThemeContext persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('theme-dark');
  });

  it('defaults to light when nothing is stored', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );
    expect(screen.getByRole('button')).toHaveTextContent('light');
  });

  it('reads an existing dark preference from localStorage and applies the theme class', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );
    expect(screen.getByRole('button')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('theme-dark');
  });

  it('persists the new preference to localStorage on toggle', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );
    act(() => {
      screen.getByRole('button').click();
    });
    expect(screen.getByRole('button')).toHaveTextContent('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(document.documentElement).toHaveClass('theme-dark');
  });
});
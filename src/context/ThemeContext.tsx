'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // 1. Initial load from localStorage
    try {
      const savedTheme = localStorage.getItem('nexthood_theme') as Theme;
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        setThemeState(savedTheme);
      } else {
        setThemeState('system');
      }
    } catch (e) {
      console.error('Error loading theme:', e);
    }
    setIsMounted(true);
  }, []);

  // 2. Synchronize theme with data-theme attribute on root
  useEffect(() => {
    if (!isMounted) return;

    const root = document.documentElement;

    const applyTheme = (t: Theme) => {
      if (t === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', systemPrefersDark ? 'dark' : 'light');
      } else {
        root.setAttribute('data-theme', t);
      }
    };

    applyTheme(theme);

    // 3. Listen to system preference changes if 'system' is selected
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      
      // Modern listener support
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
  }, [theme, isMounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('nexthood_theme', newTheme);
    } catch (e) {
      console.error('Error saving theme:', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {isMounted ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

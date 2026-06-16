'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'dark' | 'light' | 'midnight';

type ThemeCtx = { theme: Theme; setTheme: (t: Theme) => void };
const Ctx = createContext<ThemeCtx>({ theme: 'dark', setTheme: () => {} });

const THEMES: Record<Theme, Record<string, string>> = {
  dark: {
    '--bg':          '#080c18',
    '--bg-card':     'rgba(15, 20, 40, 0.72)',
    '--bg-sidebar':  'rgba(7, 10, 20, 0.97)',
    '--bg-glass':    'rgba(255,255,255,0.04)',
    '--border':      'rgba(255,255,255,0.08)',
    '--border-glow': 'rgba(99,102,241,0.40)',
    '--text':        '#eef2ff',
    '--text-sub':    '#8892b0',
    '--text-muted':  '#3d4966',
    '--indigo':      '#6366f1',
    '--indigo-glow': 'rgba(99,102,241,0.35)',
    '--violet':      '#8b5cf6',
    '--ambient-1':   'rgba(99,102,241,0.13)',
    '--ambient-2':   'rgba(139,92,246,0.10)',
    '--ambient-3':   'rgba(59,130,246,0.06)',
    '--card-shadow': '0 4px 32px rgba(0,0,0,0.40)',
    '--card-shine':  'rgba(255,255,255,0.07)',
    '--input-bg':    'rgba(255,255,255,0.04)',
    '--input-border':'rgba(255,255,255,0.09)',
    '--scrollbar':   'rgba(99,102,241,0.25)',
  },
  light: {
    '--bg':          '#f0f4ff',
    '--bg-card':     'rgba(255,255,255,0.90)',
    '--bg-sidebar':  'rgba(248,250,255,0.98)',
    '--bg-glass':    'rgba(0,0,0,0.03)',
    '--border':      'rgba(0,0,0,0.08)',
    '--border-glow': 'rgba(99,102,241,0.30)',
    '--text':        '#0f172a',
    '--text-sub':    '#475569',
    '--text-muted':  '#94a3b8',
    '--indigo':      '#4f46e5',
    '--indigo-glow': 'rgba(79,70,229,0.25)',
    '--violet':      '#7c3aed',
    '--ambient-1':   'rgba(99,102,241,0.08)',
    '--ambient-2':   'rgba(139,92,246,0.06)',
    '--ambient-3':   'rgba(59,130,246,0.04)',
    '--card-shadow': '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)',
    '--card-shine':  'rgba(255,255,255,0.80)',
    '--input-bg':    'rgba(0,0,0,0.04)',
    '--input-border':'rgba(0,0,0,0.12)',
    '--scrollbar':   'rgba(99,102,241,0.30)',
  },
  midnight: {
    '--bg':          '#000000',
    '--bg-card':     'rgba(10,10,18,0.85)',
    '--bg-sidebar':  'rgba(4,4,10,0.99)',
    '--bg-glass':    'rgba(255,255,255,0.03)',
    '--border':      'rgba(255,255,255,0.06)',
    '--border-glow': 'rgba(99,102,241,0.50)',
    '--text':        '#f8fafc',
    '--text-sub':    '#64748b',
    '--text-muted':  '#1e293b',
    '--indigo':      '#818cf8',
    '--indigo-glow': 'rgba(129,140,248,0.40)',
    '--violet':      '#a78bfa',
    '--ambient-1':   'rgba(99,102,241,0.18)',
    '--ambient-2':   'rgba(167,139,250,0.14)',
    '--ambient-3':   'rgba(59,130,246,0.08)',
    '--card-shadow': '0 4px 40px rgba(0,0,0,0.70)',
    '--card-shine':  'rgba(255,255,255,0.04)',
    '--input-bg':    'rgba(255,255,255,0.03)',
    '--input-border':'rgba(255,255,255,0.07)',
    '--scrollbar':   'rgba(129,140,248,0.35)',
  },
};

function applyTheme(t: Theme) {
  const vars = THEMES[t];
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute('data-theme', t);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const saved = (localStorage.getItem('cy_theme') as Theme) || 'dark';
    setThemeState(saved);
    applyTheme(saved);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('cy_theme', t);
    applyTheme(t);
  };

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);

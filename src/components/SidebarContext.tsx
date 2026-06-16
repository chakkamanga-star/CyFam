'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type SidebarCtx = { open: boolean; toggle: () => void };
const Ctx = createContext<SidebarCtx>({ open: true, toggle: () => {} });

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);

  // Persist preference
  useEffect(() => {
    const saved = localStorage.getItem('sidebar_open');
    if (saved !== null) setOpen(saved === 'true');
  }, []);

  const toggle = () => {
    setOpen(v => {
      localStorage.setItem('sidebar_open', String(!v));
      return !v;
    });
  };

  return <Ctx.Provider value={{ open, toggle }}>{children}</Ctx.Provider>;
}

export const useSidebar = () => useContext(Ctx);

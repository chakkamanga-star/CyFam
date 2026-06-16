'use client';

import Sidebar from '@/components/Sidebar';
import { SidebarProvider, useSidebar } from '@/components/SidebarContext';

function Inner({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar();
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s ease' }}>
      {/* Ambient gradient — reads from CSS vars so it responds to theme */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 70% 55% at 15% 10%, var(--ambient-1) 0%, transparent 60%),
          radial-gradient(ellipse 55% 45% at 80% 85%, var(--ambient-2) 0%, transparent 60%),
          radial-gradient(ellipse 40% 40% at 60% 0%,  var(--ambient-3) 0%, transparent 60%)
        `,
        transition: 'background 0.3s ease',
      }} />
      <Sidebar />
      <main style={{
        flex: 1,
        marginLeft: open ? '256px' : '64px',
        transition: 'margin-left 0.28s cubic-bezier(.4,0,.2,1)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1,
      }}>
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Inner>{children}</Inner>
    </SidebarProvider>
  );
}

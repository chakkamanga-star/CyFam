'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSidebar } from './SidebarContext';
import { useTheme, type Theme } from './ThemeContext';
import {
  LayoutDashboard, Users, CalendarDays, Images, Info,
  Bell, HandHelping, BarChart3, Settings2, LogOut, UserPen,
  PanelLeftClose, PanelLeftOpen, ChevronUp,
  Sun, Moon, Sparkles, BookOpen,
} from 'lucide-react';


const THEMES: { id: Theme; Icon: React.ElementType; label: string; tip: string }[] = [
  { id: 'light',    Icon: Sun,      label: 'Light',    tip: 'Light mode' },
  { id: 'dark',     Icon: Moon,     label: 'Dark',     tip: 'Dark mode' },
  { id: 'midnight', Icon: Sparkles, label: 'Midnight', tip: 'Midnight mode' },
];

type AdminProfile = {
  id: string; name: string; role: string; phone: string;
  photo_url: string | null;
  teams: { name: string; colour: string } | null;
};

const NAV = [
  { section: 'Main', items: [
    { name: 'Dashboard',       path: '/dashboard',          Icon: LayoutDashboard },
  ]},
  { section: 'Management', items: [
    { name: 'Members',         path: '/members',            Icon: Users },
    { name: 'Events',          path: '/events',             Icon: CalendarDays },
    { name: 'Media',           path: '/media',              Icon: Images },
    { name: 'About Us',        path: '/about/edit',         Icon: Info },
  ]},
  { section: 'Communication', items: [
    { name: 'Notifications',   path: '/notifications/send', Icon: Bell },
    { name: 'Prayer Schedule', path: '/prayer',             Icon: HandHelping },
  ]},
  { section: 'Spiritual', items: [
    { name: 'Bible Readings',  path: '/bible-readings',     Icon: BookOpen },
  ]},
  { section: 'Insights', items: [
    { name: 'Analytics',       path: '/analytics',          Icon: BarChart3 },
    { name: 'Settings',        path: '/settings',           Icon: Settings2 },
  ]},
];


export default function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { open, toggle } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [loggingOut,   setLoggingOut]   = useState(false);
  const [admin,        setAdmin]        = useState<AdminProfile | null>(null);
  const [showAccount,  setShowAccount]  = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.data) setAdmin(d.data); }).catch(() => {});
  }, []);

  useEffect(() => { if (!open) setShowAccount(false); }, [open]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/login', { method: 'DELETE' });
      toast.success('Logged out');
      router.push('/');
    } catch { toast.error('Logout failed'); }
    finally   { setLoggingOut(false); }
  };

  const initials = admin ? admin.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
  const W = open ? 256 : 64;

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, width: W,
      transition: 'width 0.28s cubic-bezier(.4,0,.2,1)',
      background: 'rgba(7,10,20,0.97)', backdropFilter: 'blur(24px)',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column', zIndex: 50, overflow: 'hidden',
    }}>

      {/* Ambient glow orb */}
      <div style={{
        position: 'absolute', top: -60, left: -60, width: 200, height: 200,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)',
      }} />

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', flexShrink: 0,
        padding: open ? '0 12px 0 14px' : '0',
        justifyContent: open ? 'space-between' : 'center',
        height: 58, borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'relative', zIndex: 1,
        transition: 'padding 0.28s cubic-bezier(.4,0,.2,1)',
      }}>
        {open ? (
          <Link href={admin ? `/members/${admin.id}` : '/dashboard'}
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flex: 1, minWidth: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, overflow: 'hidden', flexShrink: 0,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Image src="/cy-logo.png" alt="CY" width={32} height={32} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#eef2ff', whiteSpace: 'nowrap', lineHeight: 1.2 }}>CY Admin</div>
              <div style={{ fontSize: 10, color: '#3d4966', whiteSpace: 'nowrap', lineHeight: 1.3 }}>Kristujayanti College</div>
            </div>
          </Link>
        ) : (
          <Link href={admin ? `/members/${admin.id}` : '/dashboard'} style={{ display: 'flex' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, overflow: 'hidden',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Image src="/cy-logo.png" alt="CY" width={32} height={32} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
            </div>
          </Link>
        )}

        {/* Toggle */}
        <button onClick={toggle} title={open ? 'Collapse' : 'Expand'}
          style={{
            width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#3d4966', flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            const b = e.currentTarget;
            b.style.background = 'rgba(99,102,241,0.15)';
            b.style.borderColor = 'rgba(99,102,241,0.3)';
            b.style.color = '#818cf8';
          }}
          onMouseLeave={e => {
            const b = e.currentTarget;
            b.style.background = 'rgba(255,255,255,0.04)';
            b.style.borderColor = 'rgba(255,255,255,0.08)';
            b.style.color = '#3d4966';
          }}
        >
          {open
            ? <PanelLeftClose size={15} strokeWidth={1.8} />
            : <PanelLeftOpen  size={15} strokeWidth={1.8} />
          }
        </button>
      </div>

      {/* ── Nav ── */}
      <nav style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: open ? '8px 10px' : '8px 8px',
        position: 'relative', zIndex: 1,
        scrollbarWidth: 'none',
      }}>
        {NAV.map((sec, si) => (
          <div key={si} style={{ marginBottom: 4 }}>
            {/* Section label */}
            {open ? (
              <div style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '1.2px', color: '#252d45',
                padding: '8px 8px 4px',
              }}>{sec.section}</div>
            ) : (
              si > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '6px 6px 8px' }} />
            )}

            {sec.items.map((item) => {
              const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
              const { Icon } = item;
              return (
                <Link key={item.path} href={item.path} title={!open ? item.name : undefined}
                  style={{
                    display: 'flex', alignItems: 'center',
                    gap: open ? 10 : 0,
                    justifyContent: open ? 'flex-start' : 'center',
                    padding: open ? '8px 10px' : '9px 0',
                    borderRadius: 10, marginBottom: 1,
                    textDecoration: 'none', fontSize: 13, fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#c7d0f8' : '#3d4966',
                    background: isActive
                      ? 'linear-gradient(90deg, rgba(99,102,241,0.16), rgba(99,102,241,0.04))'
                      : 'transparent',
                    borderLeft: isActive && open ? '2px solid #6366f1' : '2px solid transparent',
                    transition: 'all 0.15s ease',
                    overflow: 'hidden', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      const a = e.currentTarget as HTMLAnchorElement;
                      a.style.background = 'rgba(255,255,255,0.04)';
                      a.style.color = '#8892b0';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      const a = e.currentTarget as HTMLAnchorElement;
                      a.style.background = 'transparent';
                      a.style.color = '#3d4966';
                    }
                  }}
                >
                  <Icon
                    size={16}
                    strokeWidth={isActive ? 2 : 1.6}
                    style={{ flexShrink: 0, color: isActive ? '#818cf8' : 'inherit', transition: 'color 0.15s' }}
                  />
                  {open && <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>}
                  {open && isActive && (
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                      background: '#6366f1', boxShadow: '0 0 8px rgba(99,102,241,0.9)',
                    }} />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Theme Switcher ── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, padding: open ? '8px 10px' : '8px 6px',
        display: 'flex', gap: 4, justifyContent: open ? 'flex-start' : 'center',
        flexWrap: open ? 'nowrap' : 'wrap',
        transition: 'padding 0.28s',
      }}>
        {THEMES.map(({ id, Icon, label, tip }) => {
          const isActive = theme === id;
          return (
            <button
              key={id}
              onClick={() => setTheme(id)}
              title={tip}
              style={{
                flex: open ? 1 : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 5, padding: open ? '6px 8px' : '7px',
                borderRadius: 8, border: '1px solid',
                fontSize: 11, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s ease',
                background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                borderColor: isActive ? 'rgba(99,102,241,0.40)' : 'rgba(255,255,255,0.06)',
                color: isActive ? '#818cf8' : '#3d4966',
                width: open ? 'auto' : 28,
                height: open ? 'auto' : 28,
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#8892b0';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = '#3d4966';
                }
              }}
            >
              <Icon size={12} strokeWidth={isActive ? 2.2 : 1.8} />
              {open && label}
            </button>
          );
        })}
      </div>

      {/* ── Account section ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, position: 'relative', zIndex: 1 }}>

        {/* Popup menu */}
        {showAccount && open && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 8, right: 8, marginBottom: 6,
            background: 'rgba(11,16,32,0.98)', backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 -12px 48px rgba(0,0,0,0.6)',
            zIndex: 60,
          }}>
            {admin && (
              <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 10, color: '#252d45', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Signed in as</div>
                <div style={{ fontWeight: 700, color: '#eef2ff', fontSize: 13.5 }}>{admin.name}</div>
                <div style={{ fontSize: 11, color: '#3d4966', marginTop: 2 }}>📱 {admin.phone}</div>
                {admin.teams && (
                  <span style={{
                    display: 'inline-block', marginTop: 6,
                    padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600,
                    background: `${admin.teams.colour}22`, color: admin.teams.colour,
                  }}>{admin.teams.name}</span>
                )}
              </div>
            )}
            <div style={{ padding: 6 }}>
              {[
                { href: admin ? `/members/${admin.id}` : '#', Icon: UserPen, label: 'Edit my profile', color: '#8892b0', hoverBg: 'rgba(255,255,255,0.05)', hoverColor: '#eef2ff' },
              ].map(({ href, Icon, label, color, hoverBg, hoverColor }) => (
                <Link key={href} href={href}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, fontSize: 12.5, color, textDecoration: 'none', transition: 'all 0.12s' }}
                  onMouseEnter={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.background = hoverBg; a.style.color = hoverColor; }}
                  onMouseLeave={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.background = 'transparent'; a.style.color = color; }}
                >
                  <Icon size={14} strokeWidth={1.8} /> {label}
                </Link>
              ))}
              <button onClick={handleLogout} disabled={loggingOut}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                  padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none',
                  fontSize: 12.5, color: '#ef4444', cursor: loggingOut ? 'not-allowed' : 'pointer',
                  opacity: loggingOut ? 0.5 : 1, transition: 'background 0.12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <LogOut size={14} strokeWidth={1.8} />
                {loggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </div>
          </div>
        )}

        {/* Profile row */}
        <button onClick={() => open && setShowAccount(v => !v)}
          title={!open ? (admin?.name ?? 'Account') : undefined}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            gap: open ? 10 : 0, justifyContent: open ? 'flex-start' : 'center',
            padding: open ? '11px 14px' : '11px 0',
            background: 'transparent', border: 'none', cursor: 'pointer',
            textAlign: 'left', transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <div style={{ flexShrink: 0 }}>
            {admin?.photo_url ? (
              <img src={admin.photo_url} alt={admin.name}
                style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(99,102,241,0.35)' }} />
            ) : (
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff',
              }}>{initials}</div>
            )}
          </div>
          {open && (
            <>
              <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#d4daef', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {admin?.name ?? 'Loading…'}
                </div>
                <div style={{ fontSize: 10, color: '#252d45', whiteSpace: 'nowrap' }}>{admin?.role ?? ''}</div>
              </div>
              <ChevronUp size={13} strokeWidth={1.8} style={{ color: '#252d45', flexShrink: 0, transform: showAccount ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Users, CalendarDays, Images, Cake,
  LogIn, UserPlus, UserMinus, UserPen, CalendarPlus, CalendarX,
  Upload, Bell, Download, Settings2, Activity,
  LayoutDashboard, BarChart3, ArrowRight, MapPin,
  Sunrise, Sun, Flame, Droplet, Star, Cross, BookOpen
} from 'lucide-react';

function getLiturgyIcon(iconName: string) {
  switch (iconName) {
    case 'Sunrise': return Sunrise;
    case 'Sun': return Sun;
    case 'Flame': return Flame;
    case 'Droplet': return Droplet;
    case 'Star': return Star;
    case 'Cross': return Cross;
    default: return BookOpen;
  }
}


type UpcomingEvent = { id: string; title: string; event_date: string; type: string; location: string | null; banner_url: string | null };

type Stats = {
  totalMembers: number;
  eventsThisMonth: number;
  photosUploaded: number;
  upcomingEvents: number;
  recentActivity: { admin_name: string; action: string; detail: string; created_at: string }[];
  upcomingBirthdays: { id: string; name: string; dob: string; photo_url: string | null }[];
  upcomingEventsData: UpcomingEvent[];
};

type ActionMeta = { label: string; Icon: React.ElementType; color: string; bg: string };
const ACTION_MAP: Record<string, ActionMeta> = {
  LOGIN:             { label: 'logged in',           Icon: LogIn,       color: '#60a5fa', bg: 'rgba(96,165,250,0.10)' },
  CREATE_MEMBER:     { label: 'added a member',      Icon: UserPlus,    color: '#34d399', bg: 'rgba(52,211,153,0.10)' },
  DELETE_MEMBER:     { label: 'deleted a member',    Icon: UserMinus,   color: '#f87171', bg: 'rgba(248,113,113,0.10)' },
  UPDATE_MEMBER:     { label: 'updated a member',    Icon: UserPen,     color: '#fbbf24', bg: 'rgba(251,191,36,0.10)' },
  CREATE_EVENT:      { label: 'created an event',    Icon: CalendarPlus,color: '#818cf8', bg: 'rgba(129,140,248,0.10)' },
  DELETE_EVENT:      { label: 'deleted an event',    Icon: CalendarX,   color: '#f87171', bg: 'rgba(248,113,113,0.10)' },
  UPLOAD_MEDIA:      { label: 'uploaded photos',     Icon: Upload,      color: '#a78bfa', bg: 'rgba(167,139,250,0.10)' },
  SEND_NOTIFICATION: { label: 'sent a notification', Icon: Bell,        color: '#fb923c', bg: 'rgba(251,146,60,0.10)' },
  IMPORT_MEMBERS:    { label: 'imported members',    Icon: Download,    color: '#2dd4bf', bg: 'rgba(45,212,191,0.10)' },
  UPDATE_SETTINGS:   { label: 'updated settings',    Icon: Settings2,   color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' },
};
const DEFAULT_ACTION: ActionMeta = { label: 'performed an action', Icon: Activity, color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type StatCard = {
  key: string; href: string; label: string; sub: (s: Stats) => string;
  Icon: React.ElementType; gradientFrom: string; gradientTo: string;
  iconColor: string; iconBg: string; glowColor: string; hoverBorder: string;
};

const STAT_CARDS: StatCard[] = [
  { key: 'totalMembers',    href: '/members',  label: 'Total Members',      sub: s => `${s.upcomingEvents} upcoming events`,
    Icon: Users,       gradientFrom: 'rgba(99,102,241,0.18)',  gradientTo: 'rgba(99,102,241,0.02)',
    iconColor: '#818cf8', iconBg: 'rgba(99,102,241,0.14)',    glowColor: 'rgba(99,102,241,0.25)',  hoverBorder: 'rgba(99,102,241,0.4)' },
  { key: 'eventsThisMonth', href: '/events',   label: 'Events This Month',  sub: s => `${s.upcomingEvents} upcoming`,
    Icon: CalendarDays, gradientFrom: 'rgba(16,185,129,0.18)',  gradientTo: 'rgba(16,185,129,0.02)',
    iconColor: '#34d399', iconBg: 'rgba(16,185,129,0.14)',    glowColor: 'rgba(16,185,129,0.22)',  hoverBorder: 'rgba(16,185,129,0.4)' },
  { key: 'photosUploaded',  href: '/media',    label: 'Photos in Gallery',  sub: () => 'across all albums',
    Icon: Images,      gradientFrom: 'rgba(59,130,246,0.18)',  gradientTo: 'rgba(59,130,246,0.02)',
    iconColor: '#60a5fa', iconBg: 'rgba(59,130,246,0.14)',    glowColor: 'rgba(59,130,246,0.20)',  hoverBorder: 'rgba(59,130,246,0.4)' },
  { key: 'upcomingBirthdays', href: '/members', label: 'Upcoming Birthdays', sub: () => 'within 7 days',
    Icon: Cake,        gradientFrom: 'rgba(245,158,11,0.18)', gradientTo: 'rgba(245,158,11,0.02)',
    iconColor: '#fbbf24', iconBg: 'rgba(245,158,11,0.14)',    glowColor: 'rgba(245,158,11,0.20)',  hoverBorder: 'rgba(245,158,11,0.4)' },
];

const QUICK_LINKS = [
  { href: '/members',   Icon: Users,          label: 'Members',   sub: 'View directory',  iconBg: 'rgba(99,102,241,0.12)',  iconColor: '#818cf8' },
  { href: '/events',    Icon: CalendarDays,   label: 'Events',    sub: 'Manage events',   iconBg: 'rgba(16,185,129,0.12)',  iconColor: '#34d399' },
  { href: '/media',     Icon: Images,         label: 'Media',     sub: 'Photo gallery',   iconBg: 'rgba(59,130,246,0.12)',  iconColor: '#60a5fa' },
  { href: '/analytics', Icon: BarChart3,      label: 'Analytics', sub: 'View insights',   iconBg: 'rgba(167,139,250,0.12)', iconColor: '#a78bfa' },
];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [liturgy, setLiturgy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics/summary').then(r => r.json()),
      fetch('/api/bible-readings?rite=syro-malabar').then(r => r.json()).catch(() => null)
    ]).then(([s, l]) => {
      setStats(s);
      // API returns { data: { liturgical_day, colour, season, feasts, ... } }
      // Unwrap and normalize to camelCase for the banner
      if (l && !l.error) {
        const raw = l.data ?? l;
        setLiturgy({
          liturgicalDay: raw.liturgical_day ?? raw.liturgicalDay ?? '',
          season:        raw.season ?? '',
          colour:        raw.colour ?? '#10b981',
          feasts:        raw.feasts ?? [],
          source:        raw.source ?? '',
          sourceUrl:     raw.source_url ?? raw.sourceUrl,
        });
      } else {
        setLiturgy(null);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const getValue = (key: string, s: Stats): number => {
    if (key === 'upcomingBirthdays') return s.upcomingBirthdays?.length ?? 0;
    return (s as unknown as Record<string, number>)[key] ?? 0;
  };

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Welcome back — here's what's happening today.">
        <Link href="/members/import"
          className="glass-input"
          style={{ padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#8892b0', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
          <Download size={14} strokeWidth={2} />
          Import Members
        </Link>
        <Link href="/events/new" className="btn-primary-gradient"
          style={{ padding: '7px 16px', borderRadius: 10, fontSize: 13, textDecoration: 'none' }}>
          <CalendarPlus size={14} strokeWidth={2} />
          New Event
        </Link>
      </PageHeader>

      <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
          {STAT_CARDS.map((card, i) => {
            const { Icon } = card;
            return (
              <Link key={card.key} href={card.href} style={{ textDecoration: 'none', animationDelay: `${i * 60}ms` }}
                className="stat-card fade-up"
              >
                {/* Glow orb */}
                <div style={{
                  position: 'absolute', top: -30, right: -30, width: 120, height: 120,
                  borderRadius: '50%', pointerEvents: 'none',
                  background: `radial-gradient(circle, ${card.gradientFrom} 0%, ${card.gradientTo} 60%, transparent 80%)`,
                  filter: 'blur(8px)',
                }} />

                <div style={{ padding: '20px 20px 18px', position: 'relative' }}>
                  {/* Icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 11,
                    background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 16, border: `1px solid ${card.glowColor}`,
                  }}>
                    <Icon size={18} strokeWidth={1.8} style={{ color: card.iconColor }} />
                  </div>

                  {loading
                    ? <div className="skeleton" style={{ height: 36, width: 64, marginBottom: 4 }} />
                    : <div style={{ fontSize: 34, fontWeight: 800, color: '#eef2ff', lineHeight: 1, marginBottom: 6 }}>
                        {stats ? getValue(card.key, stats) : 0}
                      </div>
                  }
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#8892b0', marginBottom: 4 }}>{card.label}</div>
                  <div style={{ fontSize: 11.5, color: '#252d45' }}>
                    {loading ? <span className="skeleton" style={{ display: 'inline-block', height: 12, width: 90 }} /> : stats ? card.sub(stats) : ''}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── Today's Liturgy Banner ── */}
        {!loading && liturgy && (
          <div className="glass-card fade-up" style={{ marginBottom: 16, overflow: 'hidden', position: 'relative', border: `1px solid ${liturgy.colour}40`, animationDelay: '100ms' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: liturgy.colour }} />
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${liturgy.colour}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${liturgy.colour}30` }}>
                   {React.createElement(getLiturgyIcon(liturgy.season?.includes('Denha') ? 'Droplet' : liturgy.season?.includes('Fast') ? 'Flame' : liturgy.season?.includes('Resurrection') ? 'Sun' : liturgy.season?.includes('Annunciation') ? 'Star' : 'Sunrise'), { size: 24, color: liturgy.colour, strokeWidth: 1.5 })}
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: liturgy.colour, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 2 }}>
                    {liturgy.season} Season
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#eef2ff', marginBottom: 2 }}>
                    {liturgy.liturgicalDay}
                  </div>
                  {liturgy.feasts && liturgy.feasts.length > 0 && (
                    <div style={{ fontSize: 12, color: '#8892b0', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Star size={12} style={{ color: '#fbbf24' }} />
                      {liturgy.feasts.join(', ')}
                    </div>
                  )}
                </div>
              </div>
              <Link href="/bible-readings" style={{ padding: '8px 16px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, fontWeight: 600, color: '#eef2ff', textDecoration: 'none', transition: 'background 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)'; }}
              >
                Today's Readings
              </Link>
            </div>
          </div>
        )}

        {/* ── Bottom grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 16 }}>

          {/* ── Upcoming Events ── */}
          <div className="glass-card fade-up" style={{ animationDelay: '200ms', overflow: 'hidden' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarDays size={15} strokeWidth={1.8} style={{ color: '#818cf8' }} />
                <span style={{ fontWeight: 600, fontSize: 14, color: '#eef2ff' }}>Upcoming Events</span>
              </div>
              <Link href="/events" style={{ fontSize: 11.5, color: '#252d45', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#8892b0'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#252d45'; }}
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {loading ? (
              <div style={{ display: 'flex', gap: 12, padding: '16px 18px', overflowX: 'auto' }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ minWidth: 160, height: 140, borderRadius: 14, flexShrink: 0 }} />
                ))}
              </div>
            ) : stats?.upcomingEventsData?.length ? (
              <div style={{ display: 'flex', gap: 12, padding: '14px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {stats.upcomingEventsData.map(ev => {
                  const evDate  = new Date(ev.event_date);
                  const diffMs  = evDate.getTime() - Date.now();
                  const diffDay = Math.ceil(diffMs / 86400000);
                  const isToday = diffDay <= 0;
                  const isSoon  = diffDay <= 3;
                  const TYPE_C: Record<string, { bg: string; color: string }> = {
                    'Church Event':  { bg: 'rgba(99,102,241,0.18)',  color: '#818cf8' },
                    'Birthday':      { bg: 'rgba(251,191,36,0.18)',  color: '#fbbf24' },
                    'Feast Day':     { bg: 'rgba(239,68,68,0.18)',   color: '#f87171' },
                    'Meeting':       { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
                    'Special Event': { bg: 'rgba(167,139,250,0.18)', color: '#a78bfa' },
                    'Team Event':    { bg: 'rgba(16,185,129,0.18)',  color: '#34d399' },
                  };
                  const tc = TYPE_C[ev.type] ?? TYPE_C['Church Event'];
                  return (
                    <Link key={ev.id} href="/events" style={{ textDecoration: 'none', flexShrink: 0 }}>
                      <div style={{
                        width: 168, borderRadius: 14, overflow: 'hidden', position: 'relative',
                        border: `1px solid ${isSoon ? tc.color + '50' : 'rgba(255,255,255,0.07)'}`,
                        background: 'rgba(255,255,255,0.03)', transition: 'all 0.2s',
                        boxShadow: isSoon ? `0 0 16px ${tc.color}22` : 'none',
                        cursor: 'pointer',
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${tc.color}30`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = isSoon ? `0 0 16px ${tc.color}22` : 'none'; }}
                      >
                        {/* Banner or gradient */}
                        <div style={{ height: 80, position: 'relative', overflow: 'hidden', background: tc.bg }}>
                          {ev.banner_url
                            ? <img src={ev.banner_url} alt={ev.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${tc.bg}, rgba(255,255,255,0.02))`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CalendarDays size={28} strokeWidth={1.2} style={{ color: tc.color, opacity: 0.5 }} />
                              </div>
                          }
                          {/* Date badge */}
                          <div style={{ position: 'absolute', top: 7, left: 7, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', borderRadius: 8, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                            {format(evDate, 'MMM d')}
                          </div>
                          {/* Today/Soon badge */}
                          {(isToday || isSoon) && (
                            <div style={{ position: 'absolute', top: 7, right: 7, background: isToday ? '#ef4444' : tc.color, borderRadius: 6, padding: '2px 7px', fontSize: 9.5, fontWeight: 700, color: '#fff' }}>
                              {isToday ? 'TODAY' : `${diffDay}d`}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div style={{ padding: '10px 10px 12px' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#d4daef', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                          <div style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, display: 'inline-block', background: tc.bg, color: tc.color, fontWeight: 600, marginBottom: 5 }}>{ev.type}</div>
                          {ev.location && (
                            <div style={{ fontSize: 10.5, color: '#252d45', display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}>
                              <MapPin size={9} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.location}</span>
                            </div>
                          )}
                          <div style={{ fontSize: 10.5, color: '#1e2640', marginTop: 3 }}>{format(evDate, 'hh:mm a')}</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <CalendarDays size={32} strokeWidth={1.2} style={{ color: '#1e2640', margin: '0 auto 8px', display: 'block' }} />
                <div style={{ fontSize: 13, color: '#252d45' }}>No upcoming events</div>
                <Link href="/events/new" style={{ fontSize: 12, color: '#818cf8', display: 'inline-block', marginTop: 6 }}>Create one →</Link>
              </div>
            )}
          </div>

          {/* Birthdays */}
          <div className="glass-card fade-up" style={{ animationDelay: '260ms', overflow: 'hidden' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cake size={15} strokeWidth={1.8} style={{ color: '#fbbf24' }} />
                <span style={{ fontWeight: 600, fontSize: 14, color: '#eef2ff' }}>Birthdays</span>
              </div>
              <Link href="/members" style={{ fontSize: 11.5, color: '#252d45', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#8892b0'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#252d45'; }}
              >
                All <ArrowRight size={12} />
              </Link>
            </div>
            <div style={{ padding: '8px' }}>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px' }}>
                      <div className="skeleton" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div className="skeleton" style={{ height: 12, width: '65%' }} />
                        <div className="skeleton" style={{ height: 10, width: '40%' }} />
                      </div>
                    </div>
                  ))
                : stats?.upcomingBirthdays?.length
                  ? stats.upcomingBirthdays.map(m => (
                      <Link key={m.id} href={`/members/${m.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, textDecoration: 'none', transition: 'background 0.12s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
                      >
                        {m.photo_url
                          ? <img src={m.photo_url} alt={m.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.08)' }} />
                          : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                              {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#d4daef', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                          <div style={{ fontSize: 11, color: '#3d4966' }}>{m.dob ? format(new Date(m.dob), 'MMMM d') : ''}</div>
                        </div>
                        <div style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: 'rgba(251,191,36,0.10)', color: '#fbbf24', fontWeight: 600, flexShrink: 0 }}>
                          Soon
                        </div>
                      </Link>
                    ))
                  : <div style={{ padding: '32px 16px', textAlign: 'center', color: '#252d45' }}>
                      <Cake size={28} strokeWidth={1.2} style={{ margin: '0 auto 8px', display: 'block', color: '#1e2640' }} />
                      <div style={{ fontSize: 12.5 }}>No birthdays this week</div>
                    </div>
              }
            </div>
          </div>
        </div>

        {/* ── Quick Links ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {QUICK_LINKS.map(link => {
            const { Icon } = link;
            return (
              <Link key={link.href} href={link.href} className="glass-card fade-up"
                style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', animationDelay: '320ms' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: link.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} strokeWidth={1.8} style={{ color: link.iconColor }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#d4daef' }}>{link.label}</div>
                  <div style={{ fontSize: 11, color: '#252d45' }}>{link.sub}</div>
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </>
  );
}

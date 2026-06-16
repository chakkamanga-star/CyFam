'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import PageHeader from '@/components/PageHeader';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  ChevronLeft, ChevronRight, MapPin, Calendar, Upload,
  X, ImagePlus, Loader2, CheckCircle, Trash2, ExternalLink, Star,
} from 'lucide-react';
import { getSyroMalabarLiturgy, getLiturgicalTheme } from '@/lib/liturgy';

type CYEvent = {
  id: string; title: string; description: string | null;
  event_date: string; location: string | null; type: string;
  banner_url: string | null; is_recurring: boolean; created_at: string;
  teams: { name: string } | null;
};

const TYPE_COLOURS: Record<string, { bg: string; color: string; pill: string }> = {
  'Church Event':  { bg: 'rgba(99,102,241,0.18)',  color: '#818cf8', pill: 'rgba(99,102,241,0.14)' },
  'Birthday':      { bg: 'rgba(251,191,36,0.18)',  color: '#fbbf24', pill: 'rgba(251,191,36,0.14)' },
  'Feast Day':     { bg: 'rgba(239,68,68,0.18)',   color: '#f87171', pill: 'rgba(239,68,68,0.14)'  },
  'Meeting':       { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', pill: 'rgba(148,163,184,0.10)'},
  'Special Event': { bg: 'rgba(167,139,250,0.18)', color: '#a78bfa', pill: 'rgba(167,139,250,0.14)'},
  'Team Event':    { bg: 'rgba(16,185,129,0.18)',  color: '#34d399', pill: 'rgba(16,185,129,0.14)' },
};
const tc = (type: string) => TYPE_COLOURS[type] ?? TYPE_COLOURS['Church Event'];

// ── Banner Upload Modal ─────────────────────────────────────────
function BannerModal({
  events, day, onClose, onSaved,
}: {
  events: CYEvent[];
  day: number;
  onClose: () => void;
  onSaved: (updated: CYEvent) => void;
}) {
  const [selectedEvent, setSelectedEvent] = useState<CYEvent>(events[0]);
  const [preview, setPreview]   = useState<string | null>(null);
  const [file, setFile]         = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Keep preview in sync with selected event's existing banner
  useEffect(() => {
    setPreview(selectedEvent.banner_url);
    setFile(null);
  }, [selectedEvent]);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!file) { toast.error('Choose a banner image first'); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('banner', file);
    const res  = await fetch(`/api/events/${selectedEvent.id}`, { method: 'PATCH', body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { toast.error(data.error || 'Upload failed'); return; }
    toast.success('Banner saved!');
    onSaved({ ...selectedEvent, banner_url: data.data.banner_url });
    setFile(null);
  };

  const handleRemoveBanner = async () => {
    setUploading(true);
    const res  = await fetch(`/api/events/${selectedEvent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banner_url: null }),
    });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { toast.error(data.error || 'Failed'); return; }
    toast.success('Banner removed');
    setPreview(null); setFile(null);
    onSaved({ ...selectedEvent, banner_url: null });
  };

  const colours = tc(selectedEvent.type);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 560, borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 3 }}>
              {format(new Date(selectedEvent.event_date), 'EEEE, MMMM d')}
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Event Banner</h3>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={15} />
          </button>
        </div>

        {/* Event selector (if multiple events on this day) */}
        {events.length > 1 && (
          <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {events.map(ev => (
              <button key={ev.id} onClick={() => setSelectedEvent(ev)} style={{
                padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                border: `1px solid ${selectedEvent.id === ev.id ? tc(ev.type).color : 'var(--border)'}`,
                background: selectedEvent.id === ev.id ? tc(ev.type).pill : 'transparent',
                color: selectedEvent.id === ev.id ? tc(ev.type).color : 'var(--text-sub)',
              }}>{ev.title}</button>
            ))}
          </div>
        )}

        <div style={{ padding: '20px 24px' }}>
          {/* Selected event info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', borderRadius: 12, background: colours.bg, border: `1px solid ${colours.color}30` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{selectedEvent.title}</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, color: colours.color }}>{selectedEvent.type}</span>
                {selectedEvent.location && (
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <MapPin size={10} /> {selectedEvent.location}
                  </span>
                )}
              </div>
            </div>
            <Link href={`/events/${selectedEvent.id}/edit`} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              <ExternalLink size={14} />
            </Link>
          </div>

          {/* Banner preview / upload zone */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: '100%', height: 200, borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
              border: `2px dashed ${preview ? colours.color + '60' : 'var(--border)'}`,
              background: preview ? 'transparent' : 'rgba(255,255,255,0.02)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', transition: 'all 0.2s', marginBottom: 14,
            }}
          >
            {preview ? (
              <>
                <img src={preview} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)', display: 'flex', alignItems: 'flex-end', padding: 12 }}>
                  <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <ImagePlus size={13} /> Click to change banner
                  </span>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <ImagePlus size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 10px', display: 'block' }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Upload Event Banner</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click to browse · JPG, PNG, WEBP</div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            {(selectedEvent.banner_url || file) && (
              <button onClick={handleRemoveBanner} disabled={uploading}
                style={{ padding: '10px 16px', borderRadius: 11, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={13} /> Remove
              </button>
            )}
            <button onClick={handleSave} disabled={!file || uploading} className="btn-primary-gradient"
              style={{ flex: 1, justifyContent: 'center', padding: '10px', borderRadius: 11, fontSize: 14, opacity: !file || uploading ? 0.5 : 1 }}>
              {uploading ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Upload size={14} /> Save Banner</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Events Page ───────────────────────────────────────────
export default function Events() {
  const [events, setEvents]   = useState<CYEvent[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState<'list' | 'calendar'>('list');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now);

  // Banner modal state
  const [modalDay, setModalDay] = useState<number | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const res  = await fetch('/api/events?limit=100');
    const data = await res.json();
    setEvents(data.data || []);
    setTotal(data.count || 0);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/events/${deleteId}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Event deleted'); setDeleteId(null); fetchEvents(); }
    else { toast.error('Failed to delete event'); }
  };

  const exportIcal = (event: CYEvent) => {
    const dt = new Date(event.event_date);
    const dtStr = dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const ical = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CY Admin//EN',
      'BEGIN:VEVENT', `UID:${event.id}@cy-admin`,
      `DTSTART:${dtStr}`, `SUMMARY:${event.title}`,
      event.location ? `LOCATION:${event.location}` : '',
      event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : '',
      'END:VEVENT', 'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');
    const blob = new Blob([ical], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${event.title.replace(/\s+/g, '_')}.ics`;
    a.click();
  };

  // Calendar helpers
  const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
  const firstDay    = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getDay();

  const getEventsForDay = (day: number) =>
    events.filter(e => {
      const d = new Date(e.event_date);
      return d.getFullYear() === calMonth.getFullYear() &&
             d.getMonth()    === calMonth.getMonth() &&
             d.getDate()     === day;
    });

  const modalEvents = modalDay ? getEventsForDay(modalDay) : [];

  const handleBannerSaved = (updated: CYEvent) => {
    setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
  };

  return (
    <>
      <PageHeader title="Events Manager" subtitle={`${total} total events`}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: 3, borderRadius: 10, marginRight: 8, gap: 2 }}>
          {(['list', 'calendar'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: view === v ? 'rgba(99,102,241,0.18)' : 'transparent',
                color: view === v ? '#818cf8' : 'var(--text-muted)' }}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <Link href="/events/new" className="btn-primary-gradient" style={{ padding: '7px 16px', borderRadius: 10, fontSize: 13, textDecoration: 'none' }}>
          + Create Event
        </Link>
      </PageHeader>

      <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>
        {view === 'list' ? (

          /* ── List View ── */
          <div className="glass-card">
            <table className="data-table">
              <thead>
                <tr><th>Event</th><th>Date & Time</th><th>Type</th><th>Location</th><th>Team</th><th>Banner</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                ) : events.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px' }}>
                    No events yet. <Link href="/events/new" style={{ color: '#818cf8' }}>Create one →</Link>
                  </td></tr>
                ) : events.map(event => {
                  const colours = tc(event.type);
                  return (
                    <tr key={event.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{event.title}</div>
                        {event.is_recurring && <div style={{ fontSize: 11, color: '#818cf8' }}>🔁 Recurring</div>}
                      </td>
                      <td style={{ fontSize: 13.5 }}>{format(new Date(event.event_date), 'EEE, dd MMM yyyy • hh:mm a')}</td>
                      <td>
                        <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: colours.pill, color: colours.color }}>
                          {event.type}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{event.location || '—'}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{event.teams?.name || '—'}</td>
                      <td>
                        {event.banner_url
                          ? <img src={event.banner_url} alt="banner" style={{ width: 48, height: 30, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                          : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>None</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Link href={`/events/${event.id}/edit`} style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.05)', color: 'var(--text-sub)', textDecoration: 'none' }}>Edit</Link>
                          <button onClick={() => exportIcal(event)} style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12, background: 'rgba(255,255,255,0.05)', color: 'var(--text-sub)', border: 'none', cursor: 'pointer' }} title="Export iCal">📅</button>
                          <button onClick={() => setDeleteId(event.id)} style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(239,68,68,0.10)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        ) : (

          /* ── Calendar View ── */
          <div className="glass-card" style={{ padding: 24 }}>
            {/* Month navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1))}
                style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sub)', transition: 'all 0.12s' }}
                onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; }}>
                <ChevronLeft size={16} />
              </button>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{format(calMonth, 'MMMM yyyy')}</h3>
              <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1))}
                style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sub)', transition: 'all 0.12s' }}
                onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; }}>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', padding: '6px 0', letterSpacing: '0.8px', textTransform: 'uppercase' }}>{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day       = i + 1;
                const dDate     = new Date(calMonth.getFullYear(), calMonth.getMonth(), day);
                const dateStr   = format(dDate, 'yyyy-MM-dd');
                const liturgy   = getSyroMalabarLiturgy(dateStr);
                const theme     = liturgy ? getLiturgicalTheme('Syro-Malabar Rite', liturgy.season) : null;
                
                const dayEvents = getEventsForDay(day);
                const isToday   = now.getDate() === day && now.getMonth() === calMonth.getMonth() && now.getFullYear() === calMonth.getFullYear();
                const hasBanner = dayEvents.some(e => e.banner_url);
                const bannerUrl = dayEvents.find(e => e.banner_url)?.banner_url;
                const hasEvents = dayEvents.length > 0;

                return (
                  <div
                    key={day}
                    onClick={() => hasEvents && setModalDay(day)}
                    style={{
                      minHeight: 88, borderRadius: 12, overflow: 'hidden', position: 'relative',
                      border: `1px solid ${isToday ? 'rgba(99,102,241,0.5)' : theme ? `${theme.color}20` : 'rgba(255,255,255,0.04)'}`,
                      background: isToday ? 'rgba(99,102,241,0.08)' : theme ? `${theme.color}08` : 'rgba(255,255,255,0.01)',
                      cursor: hasEvents ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (hasEvents) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.4)'; }}
                    onMouseLeave={e => { if (hasEvents) (e.currentTarget as HTMLDivElement).style.borderColor = isToday ? 'rgba(99,102,241,0.5)' : theme ? `${theme.color}20` : 'rgba(255,255,255,0.08)'; }}
                  >
                    {/* Banner background */}
                    {hasBanner && bannerUrl && (
                      <img src={bannerUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }} />
                    )}

                    {/* Upload indicator */}
                    {hasEvents && !hasBanner && (
                      <div style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 5, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImagePlus size={10} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    )}
                    {hasBanner && (
                      <div style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 5, background: 'rgba(16,185,129,0.25)', border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={10} style={{ color: '#34d399' }} />
                      </div>
                    )}

                    <div style={{ position: 'relative', padding: '6px 8px' }}>
                      {/* Day number */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 700,
                          color: isToday ? '#818cf8' : hasEvents ? 'var(--text)' : theme ? theme.color : 'var(--text-muted)',
                          ...(isToday ? {
                            width: 22, height: 22, background: 'rgba(99,102,241,0.25)', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          } : {}),
                        }}>{day}</div>
                        
                        {/* Liturgical indicator */}
                        {!isToday && theme && (
                           <div style={{ width: 6, height: 6, borderRadius: '50%', background: theme.color, opacity: 0.6, marginTop: 4 }} title={liturgy?.season} />
                        )}
                      </div>

                      {/* Feasts */}
                      {liturgy?.feasts && liturgy.feasts.map((f, fi) => (
                        <div key={`f-${fi}`} style={{
                          fontSize: 9.5, fontWeight: 600, padding: '2px 6px', borderRadius: 5, marginBottom: 2,
                          background: `${theme?.color}15`, color: theme?.color,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          display: 'flex', alignItems: 'center', gap: 3
                        }}>
                          <Star size={8} /> {f}
                        </div>
                      ))}

                      {/* Event pills */}
                      {dayEvents.slice(0, 3).map(e => {
                        const c = tc(e.type);
                        return (
                          <div key={e.id} style={{
                            fontSize: 9.5, fontWeight: 600, padding: '2px 6px', borderRadius: 5, marginBottom: 2,
                            background: hasBanner ? 'rgba(0,0,0,0.55)' : c.pill,
                            color: hasBanner ? '#fff' : c.color,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            backdropFilter: hasBanner ? 'blur(4px)' : 'none',
                          }}>
                            {e.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', paddingLeft: 6 }}>+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <ImagePlus size={11} /> Click event date to upload banner
              </div>
              <div style={{ fontSize: 11, color: '#34d399', display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle size={11} /> Has banner
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Banner Modal ── */}
      {modalDay !== null && modalEvents.length > 0 && (
        <BannerModal
          events={modalEvents}
          day={modalDay}
          onClose={() => setModalDay(null)}
          onSaved={updated => {
            handleBannerSaved(updated);
          }}
        />
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ padding: 32, width: 360, textAlign: 'center', borderRadius: 18 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>Delete this event?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--text-sub)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import PageHeader from '@/components/PageHeader';
import { format, addDays, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import {
  BookOpen, ChevronLeft, ChevronRight, RefreshCw, ExternalLink,
  Plus, Church, Flame, Leaf, Snowflake, Sun, Star, AlertCircle,
  BookMarked, ScrollText, Music4, Loader2, Calendar,
  Share2, Copy, MessageCircle, Mail, Check, X, Link2, Droplet, Crown
} from 'lucide-react';

type Reading = { label: string; reference: string; text: string };
type DailyReadings = {
  rite: string; date: string; liturgicalDay: string; season: string;
  colour: string; readings: Reading[]; feasts?: string[]; source: string; sourceUrl?: string; error?: string;
};

// ── Colour themes for liturgical seasons ────────────────────────
const SEASON_STYLE: Record<string, { gradient: string; accent: string; bg: string; icon: React.ElementType }> = {
  'Advent':       { gradient: 'linear-gradient(135deg,#7c3aed,#4c1d95)', accent: '#a78bfa', bg: 'rgba(124,58,237,0.12)', icon: Star },
  'Christmas':    { gradient: 'linear-gradient(135deg,#d97706,#92400e)', accent: '#fbbf24', bg: 'rgba(217,119,6,0.12)',  icon: Star },
  'Lent':         { gradient: 'linear-gradient(135deg,#6b21a8,#3b0764)', accent: '#c084fc', bg: 'rgba(107,33,168,0.12)', icon: Plus },
  'Easter':       { gradient: 'linear-gradient(135deg,#b45309,#92400e)', accent: '#fcd34d', bg: 'rgba(180,83,9,0.12)',   icon: Sun },
  'Ordinary Time':{ gradient: 'linear-gradient(135deg,#065f46,#14532d)', accent: '#34d399', bg: 'rgba(6,95,70,0.12)',    icon: Leaf },
  // Syro-Malabar specific
  'Annunciation': { gradient: 'linear-gradient(135deg,#0d9488,#0f766e)', accent: '#5eead4', bg: 'rgba(13,148,136,0.12)', icon: Star },
  'Nativity':     { gradient: 'linear-gradient(135deg,#d97706,#b45309)', accent: '#fcd34d', bg: 'rgba(217,119,6,0.12)', icon: Star },
  'Denha':        { gradient: 'linear-gradient(135deg,#0284c7,#0369a1)', accent: '#7dd3fc', bg: 'rgba(2,132,199,0.12)', icon: Droplet },
  'Great Fast':   { gradient: 'linear-gradient(135deg,#7c3aed,#5b21b6)', accent: '#c4b5fd', bg: 'rgba(124,58,237,0.12)', icon: Flame },
  'Great Lent':   { gradient: 'linear-gradient(135deg,#7c3aed,#5b21b6)', accent: '#c4b5fd', bg: 'rgba(124,58,237,0.12)', icon: Flame },
  'Resurrection': { gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', accent: '#fde68a', bg: 'rgba(245,158,11,0.12)', icon: Sun },
  'Apostles':     { gradient: 'linear-gradient(135deg,#e11d48,#be123c)', accent: '#fb7185', bg: 'rgba(225,29,72,0.12)', icon: Flame },
  'Summer':       { gradient: 'linear-gradient(135deg,#0ea5e9,#0284c7)', accent: '#7dd3fc', bg: 'rgba(14,165,233,0.12)', icon: Snowflake },
  'Elijah-Cross-Moses': { gradient: 'linear-gradient(135deg,#16a34a,#15803d)', accent: '#86efac', bg: 'rgba(22,163,74,0.12)', icon: Plus },
  'Dedication of the Church': { gradient: 'linear-gradient(135deg,#ea580c,#c2410c)', accent: '#fdba74', bg: 'rgba(234,88,12,0.12)', icon: Crown },
};

const getStyle = (season: string) => {
  const match = Object.keys(SEASON_STYLE).find(k => season.includes(k));
  return match ? SEASON_STYLE[match] : SEASON_STYLE['Ordinary Time'];
};

const READING_ICONS: Record<string, React.ElementType> = {
  'First Reading':      BookOpen,
  'Second Reading':     BookMarked,
  'Responsorial Psalm': Music4,
  'Alleluia':           Star,
  'Gospel':             ScrollText,
};

const READING_COLOURS: Record<string, string> = {
  'First Reading':      '#60a5fa',
  'Second Reading':     '#a78bfa',
  'Responsorial Psalm': '#34d399',
  'Alleluia':           '#fbbf24',
  'Gospel':             '#f87171',
};

const RITES = [
  { id: 'latin' as const, label: 'Latin / Roman Rite', sublabel: 'Roman Catholic (Novus Ordo)', Icon: Church, accent: '#818cf8', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
  { id: 'syro-malabar' as const, label: 'Syro Malabar Rite', sublabel: 'Eastern Catholic — East Syriac', Icon: Star, accent: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.3)' },
];

const COLOUR_MAP: Record<string, string> = {
  green: '#22c55e', purple: '#a855f7', white: '#e2e8f0', red: '#ef4444', rose: '#f43f5e', black: '#374151',
};

// ── Share helpers ────────────────────────────────────────────────
function buildShareText(data: DailyReadings, reading?: Reading): string {
  const riteName = data.rite === 'syro-malabar' ? 'Syro Malabar Rite' : 'Latin / Roman Rite';
  const dateFormatted = format(new Date(data.date), 'MMMM d, yyyy');

  if (reading) {
    return [
      `✝ ${reading.label} — ${reading.reference}`,
      `📅 ${dateFormatted} | ${data.liturgicalDay}`,
      `🕊 ${riteName}`,
      ``,
      reading.text.slice(0, 800) + (reading.text.length > 800 ? '…' : ''),
      ``,
      `— CY App Daily Readings`,
    ].join('\n');
  }

  const lines = [
    `✝ Daily Bible Readings — ${dateFormatted}`,
    `📖 ${data.liturgicalDay} (${riteName})`,
    `🌿 Season: ${data.season}`,
    ``,
  ];
  for (const r of data.readings) {
    lines.push(`${r.label}: ${r.reference}`);
    if (r.text) lines.push(r.text.slice(0, 200) + (r.text.length > 200 ? '…' : ''));
    lines.push('');
  }
  lines.push('— CY App Daily Readings');
  return lines.join('\n');
}

// ── Share Modal ──────────────────────────────────────────────────
function ShareModal({ data, reading, onClose }: {
  data: DailyReadings;
  reading?: Reading;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<'text' | 'link' | null>(null);
  const text    = buildShareText(data, reading);
  const waText  = encodeURIComponent(text);
  const mailSubject = encodeURIComponent(reading
    ? `${reading.label}: ${reading.reference} — ${format(new Date(data.date), 'MMMM d, yyyy')}`
    : `Daily Readings — ${format(new Date(data.date), 'MMMM d, yyyy')}`);
  const mailBody = encodeURIComponent(text);

  const copyText = async () => {
    await navigator.clipboard.writeText(text);
    setCopied('text');
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied to clipboard!');
  };

  const copyLink = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied('link');
    setTimeout(() => setCopied(null), 2000);
    toast.success('Link copied!');
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: reading ? `${reading.label}: ${reading.reference}` : 'Daily Bible Readings', text });
    } catch {/* user cancelled */ }
  };

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 480, borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,102,241,0.3)' }}>
              <Share2 size={15} style={{ color: '#818cf8' }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Share Readings</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                {reading ? reading.reference : format(new Date(data.date), 'MMMM d, yyyy')}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <X size={14} />
          </button>
        </div>

        {/* Preview */}
        <div style={{ margin: '14px 20px', padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', maxHeight: 120, overflowY: 'auto' }}>
          <pre style={{ fontSize: 11.5, color: 'var(--text-sub)', fontFamily: 'inherit', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>
            {text.slice(0, 300)}{text.length > 300 ? '…' : ''}
          </pre>
        </div>

        {/* Share options */}
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Native share (mobile) */}
          {hasNativeShare && (
            <button onClick={nativeShare}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 13, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.10)')}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Share2 size={16} style={{ color: '#818cf8' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Share via…</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>WhatsApp, Messages, Email & more</div>
              </div>
            </button>
          )}

          {/* WhatsApp */}
          <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 13, border: '1px solid rgba(37,211,102,0.3)', background: 'rgba(37,211,102,0.08)', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.15s' }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,211,102,0.16)')}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,211,102,0.08)')}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(37,211,102,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={16} style={{ color: '#25d366' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>WhatsApp</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Send to a contact or group</div>
            </div>
          </a>

          {/* Email */}
          <a href={`mailto:?subject=${mailSubject}&body=${mailBody}`}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 13, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.08)', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.15s' }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(59,130,246,0.16)')}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(59,130,246,0.08)')}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={16} style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Email</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Open in your mail app</div>
            </div>
          </a>

          {/* Two-column row: copy text + copy link */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={copyText}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderRadius: 13, border: '1px solid var(--border)', background: copied === 'text' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s', borderColor: copied === 'text' ? 'rgba(16,185,129,0.4)' : 'var(--border)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: copied === 'text' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {copied === 'text' ? <Check size={14} style={{ color: '#34d399' }} /> : <Copy size={14} style={{ color: 'var(--text-muted)' }} />}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: copied === 'text' ? '#34d399' : 'var(--text)' }}>{copied === 'text' ? 'Copied!' : 'Copy Text'}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Full reading</div>
              </div>
            </button>

            <button onClick={copyLink}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderRadius: 13, border: '1px solid var(--border)', background: copied === 'link' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s', borderColor: copied === 'link' ? 'rgba(16,185,129,0.4)' : 'var(--border)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: copied === 'link' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {copied === 'link' ? <Check size={14} style={{ color: '#34d399' }} /> : <Link2 size={14} style={{ color: 'var(--text-muted)' }} />}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: copied === 'link' ? '#34d399' : 'var(--text)' }}>{copied === 'link' ? 'Copied!' : 'Copy Link'}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Page URL</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function BibleReadingsPage() {
  const [rite, setRite]       = useState<'latin' | 'syro-malabar'>('latin');
  const [date, setDate]       = useState(new Date());
  const [data, setData]       = useState<DailyReadings | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loadTime, setLoadTime] = useState(0);
  const [shareTarget, setShareTarget] = useState<{ reading?: Reading } | null>(null);

  const dateStr = format(date, 'yyyy-MM-dd');

  const fetchReadings = useCallback(async () => {
    setLoading(true);
    setData(null);
    const t0 = Date.now();
    try {
      const res  = await fetch(`/api/bible-readings?rite=${rite}&date=${dateStr}`);
      const json = await res.json();
      setData(json);
      setLoadTime(Date.now() - t0);
      setExpanded(new Set(json.readings?.map((r: Reading) => r.label) ?? []));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [rite, dateStr]);

  useEffect(() => { fetchReadings(); }, [fetchReadings]);

  const style     = data ? getStyle(data.season) : getStyle('Ordinary Time');
  const SeasonIcon = style.icon;
  const todayStr  = format(new Date(), 'yyyy-MM-dd');
  const isToday   = dateStr === todayStr;

  return (
    <>
      <PageHeader title="Daily Bible Readings" subtitle="Liturgical readings for each rite">
        <button onClick={() => data && setShareTarget({})}
          disabled={!data}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.35)', background: data ? 'rgba(99,102,241,0.1)' : 'transparent', color: data ? '#818cf8' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: data ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}>
          <Share2 size={13} />
          Share
        </button>
        <button onClick={fetchReadings} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </PageHeader>

      <div style={{ padding: '20px 28px', flex: 1, overflowY: 'auto' }}>

        {/* ── Rite selector ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, maxWidth: 640 }}>
          {RITES.map(r => (
            <button key={r.id} onClick={() => setRite(r.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              borderRadius: 14, border: `2px solid ${rite === r.id ? r.border : 'var(--border)'}`,
              background: rite === r.id ? r.bg : 'rgba(255,255,255,0.02)',
              cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
              boxShadow: rite === r.id ? `0 0 20px ${r.bg}` : 'none',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: rite === r.id ? r.bg : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${rite === r.id ? r.border : 'var(--border)'}`, flexShrink: 0 }}>
                <r.Icon size={18} style={{ color: rite === r.id ? r.accent : 'var(--text-muted)' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: rite === r.id ? r.accent : 'var(--text)' }}>{r.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.sublabel}</div>
              </div>
            </button>
          ))}
        </div>

        {/* ── Date navigation ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setDate(d => subDays(d, 1))}
            style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sub)' }}>
            <ChevronLeft size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}>
            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{format(date, 'EEEE, MMMM d, yyyy')}</span>
            {isToday && <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 99, background: 'rgba(99,102,241,0.18)', color: '#818cf8', fontWeight: 700 }}>TODAY</span>}
          </div>
          <button onClick={() => setDate(d => addDays(d, 1))}
            style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sub)' }}>
            <ChevronRight size={16} />
          </button>
          {!isToday && (
            <button onClick={() => setDate(new Date())}
              style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}>
              Jump to Today
            </button>
          )}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', border: '2px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={24} style={{ color: '#818cf8' }} className="animate-spin" />
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              {rite === 'syro-malabar' ? 'Fetching Syro Malabar readings via AI…' : 'Fetching liturgical readings…'}
            </div>
          </div>
        )}

        {/* ── Main content ── */}
        {!loading && data && (
          <div style={{ maxWidth: 860 }}>

            {/* Season banner */}
            <div style={{ borderRadius: 18, padding: '24px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden', background: style.gradient, boxShadow: `0 8px 32px ${style.bg}` }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -50, left: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(0,0,0,0.1)', pointerEvents: 'none' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, position: 'relative' }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }}>
                  <SeasonIcon size={24} style={{ color: '#fff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 4 }}>
                    {RITES.find(r => r.id === rite)?.label}
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4, lineHeight: 1.2 }}>{data.liturgicalDay}</h2>
                  {data.feasts && data.feasts.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {data.feasts.map((f, i) => (
                        <div key={i} style={{ fontSize: 11.5, fontWeight: 600, color: '#fcd34d', background: 'rgba(252,211,77,0.15)', padding: '2px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Star size={10} /> {f}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span>📅 {format(date, 'MMMM d, yyyy')}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLOUR_MAP[data.colour] || '#34d399', display: 'inline-block', border: '1px solid rgba(255,255,255,0.3)' }} />
                      {data.colour.charAt(0).toUpperCase() + data.colour.slice(1)} — {data.season}
                    </span>
                  </div>
                </div>

                {/* Header action buttons */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setShareTarget({})}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}>
                    <Share2 size={12} /> Share all
                  </button>
                  {data.sourceUrl && (
                    <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)', transition: 'all 0.15s' }}>
                      <ExternalLink size={11} /> Source
                    </a>
                  )}
                </div>
              </div>

              {rite === 'syro-malabar' && data.source.includes('AI') && (
                <div style={{ marginTop: 14, padding: '8px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                  <Star size={12} style={{ color: '#fbbf24' }} />
                  <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)' }}>
                    Readings generated by AI based on the Syro-Malabar liturgical calendar. Verify with the official Panchangam.
                  </span>
                </div>
              )}
              {rite === 'syro-malabar' && !data.source.includes('AI') && (
                <div style={{ marginTop: 14, padding: '8px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                  <BookOpen size={12} style={{ color: '#60a5fa' }} />
                  <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.75)' }}>
                    Readings loaded from official Syro-Malabar 2026 Liturgical Calendar.
                  </span>
                </div>
              )}

              {loadTime > 0 && (
                <div style={{ position: 'absolute', bottom: 10, right: 14, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                  Loaded in {(loadTime / 1000).toFixed(1)}s
                </div>
              )}
            </div>

            {/* Error banner */}
            {data.error && (
              <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertCircle size={16} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12.5, color: 'var(--text-sub)' }}>
                  Showing fallback readings. Error: <em style={{ color: '#fbbf24' }}>{data.error}</em>
                </div>
              </div>
            )}

            {/* Toggle pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {data.readings.map(r => {
                const RIcon  = READING_ICONS[r.label] || BookOpen;
                const rColor = READING_COLOURS[r.label] || '#818cf8';
                const isExp  = expanded.has(r.label);
                return (
                  <button key={r.label} onClick={() => setExpanded(prev => {
                    const next = new Set(prev);
                    if (next.has(r.label)) next.delete(r.label); else next.add(r.label);
                    return next;
                  })} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99,
                    border: `1px solid ${isExp ? rColor + '50' : 'var(--border)'}`,
                    background: isExp ? rColor + '15' : 'transparent',
                    color: isExp ? rColor : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <RIcon size={12} />
                    {r.label}
                  </button>
                );
              })}
              <button onClick={() => setExpanded(data.readings.length === expanded.size ? new Set() : new Set(data.readings.map(r => r.label)))}
                style={{ padding: '6px 12px', borderRadius: 99, border: '1px solid var(--border)', background: 'transparent', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}>
                {expanded.size === data.readings.length ? 'Collapse All' : 'Expand All'}
              </button>
            </div>

            {/* Readings */}
            {data.readings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <BookOpen size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No readings found</div>
                <div style={{ fontSize: 13 }}>Try refreshing or checking another date.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.readings.map((reading, idx) => {
                  const RIcon  = READING_ICONS[reading.label] || BookOpen;
                  const rColor = READING_COLOURS[reading.label] || '#818cf8';
                  const isExp  = expanded.has(reading.label);

                  return (
                    <div key={reading.label} className="glass-card" style={{ overflow: 'hidden', borderRadius: 16, border: `1px solid ${isExp ? rColor + '30' : 'var(--border)'}`, transition: 'all 0.2s' }}>
                      {/* Reading header */}
                      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: 14 }}>
                        {/* Clickable expand area */}
                        <button onClick={() => setExpanded(prev => {
                          const next = new Set(prev);
                          if (next.has(reading.label)) next.delete(reading.label); else next.add(reading.label);
                          return next;
                        })} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 11, background: rColor + '18', border: `1px solid ${rColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <RIcon size={18} style={{ color: rColor }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: rColor + '18', color: rColor, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                {reading.label}
                              </span>
                              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Reading {idx + 1}</span>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>{reading.reference}</div>
                          </div>
                          <ChevronRight size={16} style={{ color: 'var(--text-muted)', transform: isExp ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                        </button>

                        {/* Per-reading share button */}
                        <button onClick={() => setShareTarget({ reading })}
                          title="Share this reading"
                          style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = rColor + '18'; (e.currentTarget as HTMLButtonElement).style.color = rColor; (e.currentTarget as HTMLButtonElement).style.borderColor = rColor + '40'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}>
                          <Share2 size={13} />
                        </button>
                      </div>

                      {/* Reading text */}
                      {isExp && (
                        <div style={{ padding: '0 20px 20px' }}>
                          <div style={{ height: 1, background: `linear-gradient(to right, ${rColor}40, transparent)`, marginBottom: 16 }} />
                          <div style={{ fontSize: 15, lineHeight: 1.9, color: 'var(--text)', fontFamily: 'Georgia, "Times New Roman", serif', whiteSpace: 'pre-wrap', borderLeft: `3px solid ${rColor}40`, paddingLeft: 16 }}>
                            {reading.text || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Text not available. View source for full reading.</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: 20, padding: '14px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <BookOpen size={13} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Source: {data.source}</span>
              {data.sourceUrl && (
                <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11.5, color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Open source <ExternalLink size={10} />
                </a>
              )}
              <div style={{ marginLeft: 'auto' }}>
                <button onClick={() => setShareTarget({})}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#818cf8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <Share2 size={11} /> Share Readings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Share Modal ── */}
      {shareTarget !== null && data && (
        <ShareModal
          data={data}
          reading={shareTarget.reading}
          onClose={() => setShareTarget(null)}
        />
      )}
    </>
  );
}

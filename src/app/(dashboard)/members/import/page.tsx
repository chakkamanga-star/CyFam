'use client';

import { useState, useRef, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  FileSpreadsheet, FileText, Upload, CheckCircle, XCircle, Pencil,
  Trash2, CalendarDays, MapPin, AlignLeft, ChevronDown,
  Loader2, Sparkles, ArrowRight, SkipForward, RotateCcw,
} from 'lucide-react';
import type { ExtractedEvent } from '@/app/api/events/import-calendar/route';

// ════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════
type SheetStep    = 'url' | 'preview' | 'importing' | 'done';
type CalStep      = 'upload' | 'extracting' | 'review' | 'saving' | 'done';
type ActiveTab    = 'sheet' | 'calendar';
type ImportResult = { imported: number; skipped: number; errors: string[] };

type PreviewData = {
  sheetId: string; headers: string[]; detectedMap: string[];
  preview: (string | null)[][]; totalRows: number;
};

const FIELD_OPTIONS = [
  { value: 'ignore',    label: '— Ignore —' },
  { value: 'full_name', label: 'Full Name' },
  { value: 'phone',     label: 'Phone Number' },
  { value: 'email',     label: 'Email' },
  { value: 'dob',       label: 'Date of Birth' },
  { value: 'team',      label: 'Team / Group' },
  { value: 'photo_url', label: 'Photo URL' },
];

const EVENT_TYPES = ['Church Event', 'Birthday', 'Feast Day', 'Meeting', 'Special Event', 'Team Event'] as const;

const TYPE_COLOURS: Record<string, { bg: string; color: string }> = {
  'Church Event':  { bg: 'rgba(99,102,241,0.15)',  color: '#818cf8' },
  'Birthday':      { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
  'Feast Day':     { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
  'Meeting':       { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
  'Special Event': { bg: 'rgba(251,146,60,0.15)',  color: '#fb923c' },
  'Team Event':    { bg: 'rgba(52,211,153,0.15)',  color: '#34d399' },
};

// ════════════════════════════════════════════
//  STEP INDICATOR (shared)
// ════════════════════════════════════════════
function Steps({ labels, current }: { labels: string[]; current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, maxWidth: 600, margin: '0 auto 28px' }}>
      {labels.map((label, i) => {
        const done    = i + 1 < current;
        const active  = i + 1 === current;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < labels.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#10b981' : active ? 'var(--indigo)' : 'rgba(255,255,255,0.08)',
                color: done || active ? '#fff' : 'var(--text-muted)',
                boxShadow: active ? '0 0 12px var(--indigo-glow)' : 'none',
                transition: 'all 0.2s ease',
              }}>
                {done ? <CheckCircle size={14} strokeWidth={2.5} /> : i + 1}
              </div>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: active ? 'var(--text)' : 'var(--text-muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: '0 8px 16px', borderRadius: 99, background: done ? '#10b981' : 'rgba(255,255,255,0.08)', transition: 'background 0.3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════
//  GOOGLE SHEETS TAB
// ════════════════════════════════════════════
function SheetImport() {
  const router = useRouter();
  const [step, setStep]         = useState<SheetStep>('url');
  const [url, setUrl]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [preview, setPreview]   = useState<PreviewData | null>(null);
  const [columnMap, setColumnMap] = useState<string[]>([]);
  const [conflictMode, setConflictMode] = useState<'skip' | 'overwrite'>('skip');
  const [result, setResult]     = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);

  const stepNum = { url: 1, preview: 2, importing: 3, done: 3 }[step];

  const handlePreview = async () => {
    if (!url.includes('spreadsheets')) { toast.error('Enter a valid Google Sheets URL'); return; }
    setLoading(true);
    const res  = await fetch('/api/members/import-sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, action: 'preview' }) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { toast.error(data.error || 'Failed to read sheet'); return; }
    setPreview(data); setColumnMap(data.detectedMap); setStep('preview');
  };

  const handleImport = async () => {
    if (!preview) return;
    setStep('importing'); setProgress(10);
    const iv = setInterval(() => setProgress(p => Math.min(p + 5, 90)), 800);
    const res = await fetch('/api/members/import-sheet', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetId: preview.sheetId, columnMap, conflictMode, action: 'import' }),
    });
    clearInterval(iv); setProgress(100);
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || 'Import failed'); setStep('preview'); return; }
    setResult(data); setStep('done');
  };

  return (
    <div>
      <Steps labels={['Paste URL', 'Map Columns', 'Done']} current={stepNum} />
      <div className="glass-card" style={{ padding: 32, maxWidth: 760, margin: '0 auto' }}>

        {step === 'url' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 6, color: 'var(--text)' }}>Google Sheet URL</h3>
              <p style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 16, lineHeight: 1.6 }}>
                Paste your Google Sheets link. Make sure the sheet is shared with{' '}
                <code style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                  cyfam-446@velvety-network-468011-t2.iam.gserviceaccount.com
                </code>
              </p>
              <input type="url" className="glass-input" style={{ width: '100%', padding: '11px 14px', fontSize: 14 }}
                placeholder="https://docs.google.com/spreadsheets/d/..." value={url} onChange={e => setUrl(e.target.value)} />
            </div>
            <button onClick={handlePreview} disabled={loading || !url} className="btn-primary-gradient"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: 11, fontSize: 14, opacity: loading || !url ? 0.6 : 1 }}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
              {loading ? 'Reading Sheet…' : 'Validate & Preview'}
            </button>
          </div>
        )}

        {(step === 'preview') && preview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>Map Columns</h3>
                <p style={{ fontSize: 13, color: 'var(--text-sub)' }}>{preview.totalRows} rows detected</p>
              </div>
              <button onClick={() => setStep('url')} style={{ fontSize: 13, color: 'var(--text-sub)', background: 'none', border: 'none', cursor: 'pointer' }}>← Change URL</button>
            </div>
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
              <table className="data-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    {preview.headers.map((h, i) => (
                      <th key={i} style={{ minWidth: 130 }}>
                        <div style={{ marginBottom: 6, color: 'var(--text-sub)' }}>{h}</div>
                        <select className="glass-input" style={{ width: '100%', padding: '4px 6px', fontSize: 11, borderRadius: 6 }}
                          value={columnMap[i] || 'ignore'} onChange={e => { const m = [...columnMap]; m[i] = e.target.value; setColumnMap(m); }}>
                          {FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.slice(0, 4).map((row, i) => (
                    <tr key={i}>{row.map((cell, j) => <td key={j} style={{ fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cell || '—'}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
                If duplicate phone found
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {(['skip', 'overwrite'] as const).map(m => (
                  <button key={m} onClick={() => setConflictMode(m)} style={{
                    flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    border: `1px solid ${conflictMode === m ? 'var(--indigo)' : 'var(--border)'}`,
                    background: conflictMode === m ? 'rgba(99,102,241,0.12)' : 'transparent',
                    color: conflictMode === m ? '#818cf8' : 'var(--text-sub)',
                  }}>
                    {m === 'skip' ? <><SkipForward size={13} style={{ display: 'inline', marginRight: 5 }} />Skip duplicate</> : <><RotateCcw size={13} style={{ display: 'inline', marginRight: 5 }} />Overwrite existing</>}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleImport} className="btn-primary-gradient" style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: 11, fontSize: 14 }}>
              <Upload size={15} /> Import {preview.totalRows} Members
            </button>
          </div>
        )}

        {step === 'importing' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Loader2 size={40} style={{ margin: '0 auto 16px', color: 'var(--indigo)', animation: 'spin 1s linear infinite' }} />
            <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>Importing members…</h3>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--indigo), var(--violet))', width: `${progress}%`, transition: 'width 0.5s ease' }} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>{progress}%</p>
          </div>
        )}

        {step === 'done' && result && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={48} style={{ margin: '0 auto 16px', color: '#10b981' }} />
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: 'var(--text)' }}>Import Complete!</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Imported', value: result.imported, color: '#10b981' },
                { label: 'Skipped',  value: result.skipped,  color: '#f59e0b' },
                { label: 'Errors',   value: result.errors.length, color: '#ef4444' },
              ].map(s => (
                <div key={s.label} className="glass-card" style={{ padding: '16px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {result.errors.length > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: 14, marginBottom: 16, textAlign: 'left', maxHeight: 140, overflowY: 'auto' }}>
                {result.errors.map((e, i) => <p key={i} style={{ fontSize: 12, color: '#f87171', marginBottom: 2 }}>{e}</p>)}
              </div>
            )}
            <button onClick={() => router.push('/members')} className="btn-primary-gradient" style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: 11, fontSize: 14 }}>
              View All Members <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ════════════════════════════════════════════
//  CALENDAR DOCUMENT TAB
// ════════════════════════════════════════════
function CalendarImport() {
  const router = useRouter();
  const [step, setStep]         = useState<CalStep>('upload');
  const [dragging, setDragging] = useState(false);
  const [file, setFile]         = useState<File | null>(null);
  const [events, setEvents]     = useState<ExtractedEvent[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editIdx, setEditIdx]   = useState<number | null>(null);
  const [editBuf, setEditBuf]   = useState<Partial<ExtractedEvent>>({});
  const [savedCount, setSavedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const stepNum = { upload: 1, extracting: 2, review: 2, saving: 3, done: 3 }[step];

  const accept = '.pdf,.doc,.docx,.txt';

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
      toast.error('Please upload a PDF, DOCX, DOC, or TXT file'); return;
    }
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleExtract = async () => {
    if (!file) return;
    setStep('extracting');
    const fd = new FormData();
    fd.append('action', 'extract');
    fd.append('file', file);

    const res  = await fetch('/api/events/import-calendar', { method: 'POST', body: fd });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || 'Extraction failed');
      setStep('upload'); return;
    }
    const extracted: ExtractedEvent[] = data.events;
    setEvents(extracted);
    setSelected(new Set(extracted.map((_, i) => i))); // select all by default
    toast.success(`Extracted ${extracted.length} events!`);
    setStep('review');
  };

  const toggleSelect = (i: number) => {
    setSelected(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });
  };

  const startEdit = (i: number) => { setEditIdx(i); setEditBuf({ ...events[i] }); };
  const saveEdit  = () => {
    if (editIdx === null) return;
    const updated = [...events];
    updated[editIdx] = { ...events[editIdx], ...editBuf } as ExtractedEvent;
    setEvents(updated); setEditIdx(null); setEditBuf({});
  };
  const removeEvent = (i: number) => {
    setEvents(ev => ev.filter((_, idx) => idx !== i));
    setSelected(prev => { const s = new Set([...prev].filter(x => x !== i).map(x => x > i ? x - 1 : x)); return s; });
  };

  const handleSave = async () => {
    const toSave = events.filter((_, i) => selected.has(i));
    if (!toSave.length) { toast.error('Select at least one event'); return; }
    setStep('saving');
    const fd = new FormData();
    fd.append('action', 'save');
    fd.append('events', JSON.stringify(toSave));

    const res  = await fetch('/api/events/import-calendar', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || 'Save failed'); setStep('review'); return; }
    setSavedCount(data.saved); setStep('done');
  };

  return (
    <div>
      <Steps labels={['Upload File', 'Review Events', 'Done']} current={stepNum} />

      {/* ── Upload ── */}
      {(step === 'upload' || step === 'extracting') && (
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => step === 'upload' && fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--indigo)' : file ? '#10b981' : 'var(--border)'}`,
              borderRadius: 16, padding: '48px 32px', textAlign: 'center',
              background: dragging ? 'rgba(99,102,241,0.06)' : file ? 'rgba(16,185,129,0.04)' : 'var(--bg-card)',
              cursor: step === 'upload' ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(20px)',
              boxShadow: dragging ? '0 0 0 3px var(--indigo-glow)' : 'none',
            }}
          >
            {step === 'extracting' ? (
              <>
                <Sparkles size={44} style={{ margin: '0 auto 16px', color: 'var(--indigo)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Analyzing document…</h3>
                <p style={{ fontSize: 13, color: 'var(--text-sub)' }}>Gemini AI is reading and extracting events</p>
                <div style={{ marginTop: 24, background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 6, overflow: 'hidden', maxWidth: 300, margin: '24px auto 0' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--indigo), var(--violet))', width: '70%', animation: 'shimmer-bar 1.5s ease-in-out infinite alternate' }} />
                </div>
              </>
            ) : file ? (
              <>
                <CheckCircle size={44} style={{ margin: '0 auto 16px', color: '#10b981' }} />
                <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{file.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 4 }}>
                  {(file.size / 1024).toFixed(1)} KB · {file.name.split('.').pop()?.toUpperCase()}
                </p>
                <button onClick={e => { e.stopPropagation(); setFile(null); }}
                  style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>
                  Remove
                </button>
              </>
            ) : (
              <>
                <Upload size={44} style={{ margin: '0 auto 16px', color: 'var(--text-muted)', transition: 'color 0.2s' }} />
                <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Drop your calendar document here</h3>
                <p style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 12 }}>or click to browse from your computer</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['PDF', 'DOCX', 'DOC', 'TXT'].map(t => (
                    <span key={t} style={{ padding: '3px 10px', borderRadius: 99, border: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{t}</span>
                  ))}
                </div>
              </>
            )}
            <input ref={fileRef} type="file" accept={accept} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {file && step === 'upload' && (
            <button onClick={handleExtract} className="btn-primary-gradient"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', borderRadius: 12, fontSize: 15, marginTop: 16 }}>
              <Sparkles size={16} /> Extract Events with AI
            </button>
          )}

        </div>
      )}


      {/* ── Review ── */}
      {step === 'review' && (
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Review Extracted Events</h3>
              <p style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 2 }}>
                {selected.size} of {events.length} selected · Deselect or edit before saving
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setSelected(new Set(events.map((_, i) => i)))}
                style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', cursor: 'pointer' }}>
                Select All
              </button>
              <button onClick={() => setSelected(new Set())}
                style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', cursor: 'pointer' }}>
                Deselect All
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
            {events.map((ev, i) => {
              const isSelected = selected.has(i);
              const isEditing  = editIdx === i;
              const tc = TYPE_COLOURS[ev.type] ?? TYPE_COLOURS['Church Event'];
              return (
                <div key={i} className="glass-card" style={{
                  padding: isEditing ? 20 : '14px 18px',
                  border: `1px solid ${isSelected ? 'rgba(99,102,241,0.30)' : 'var(--border)'}`,
                  opacity: isSelected ? 1 : 0.45,
                  transition: 'all 0.15s',
                }}>
                  {isEditing ? (
                    /* Edit form */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4, display: 'block' }}>Title</label>
                          <input className="glass-input" style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}
                            value={editBuf.title ?? ''} onChange={e => setEditBuf(b => ({ ...b, title: e.target.value }))} />
                        </div>
                        <div>
                          <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4, display: 'block' }}>Date & Time</label>
                          <input type="datetime-local" className="glass-input" style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}
                            value={editBuf.event_date?.slice(0, 16) ?? ''} onChange={e => setEditBuf(b => ({ ...b, event_date: e.target.value + ':00' }))} />
                        </div>
                        <div>
                          <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4, display: 'block' }}>Location</label>
                          <input className="glass-input" style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}
                            value={editBuf.location ?? ''} onChange={e => setEditBuf(b => ({ ...b, location: e.target.value }))} />
                        </div>
                        <div>
                          <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4, display: 'block' }}>Type</label>
                          <select className="glass-input" style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}
                            value={editBuf.type ?? 'Church Event'} onChange={e => setEditBuf(b => ({ ...b, type: e.target.value as ExtractedEvent['type'] }))}>
                            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4, display: 'block' }}>Description</label>
                        <textarea className="glass-input" style={{ width: '100%', padding: '8px 12px', fontSize: 13, resize: 'vertical', minHeight: 64 }}
                          value={editBuf.description ?? ''} onChange={e => setEditBuf(b => ({ ...b, description: e.target.value }))} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={saveEdit} className="btn-primary-gradient" style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13 }}>
                          <CheckCircle size={13} /> Save
                        </button>
                        <button onClick={() => { setEditIdx(null); setEditBuf({}); }}
                          style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      {/* Checkbox */}
                      <button onClick={() => toggleSelect(i)}
                        style={{
                          width: 20, height: 20, borderRadius: 6, border: `2px solid ${isSelected ? 'var(--indigo)' : 'var(--border)'}`,
                          background: isSelected ? 'var(--indigo)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginTop: 2,
                        }}>
                        {isSelected && <CheckCircle size={12} strokeWidth={3} style={{ color: '#fff' }} />}
                      </button>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{ev.title}</span>
                          <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: tc.bg, color: tc.color }}>{ev.type}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-sub)' }}>
                            <CalendarDays size={12} /> {new Date(ev.event_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                          {ev.location && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-sub)' }}>
                              <MapPin size={12} /> {ev.location}
                            </span>
                          )}
                          {ev.description && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <AlignLeft size={12} /> {ev.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => startEdit(i)} title="Edit"
                          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'all 0.12s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#818cf8'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.3)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
                        ><Pencil size={13} /></button>
                        <button onClick={() => removeEvent(i)} title="Remove"
                          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'all 0.12s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
                        ><Trash2 size={13} /></button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setStep('upload'); setFile(null); setEvents([]); }}
              style={{ padding: '12px 20px', borderRadius: 11, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-sub)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              ← Upload different file
            </button>
            <button onClick={handleSave} disabled={selected.size === 0} className="btn-primary-gradient"
              style={{ flex: 1, justifyContent: 'center', padding: '12px', borderRadius: 11, fontSize: 14, opacity: selected.size === 0 ? 0.5 : 1 }}>
              <CheckCircle size={15} /> Save {selected.size} Events to Calendar
            </button>
          </div>
        </div>
      )}

      {/* ── Saving ── */}
      {step === 'saving' && (
        <div style={{ textAlign: 'center', padding: '48px 0', maxWidth: 500, margin: '0 auto' }}>
          <Loader2 size={42} style={{ margin: '0 auto 16px', color: 'var(--indigo)', animation: 'spin 1s linear infinite' }} />
          <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>Saving events…</h3>
        </div>
      )}

      {/* ── Done ── */}
      {step === 'done' && (
        <div style={{ textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={40} style={{ color: '#10b981' }} />
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Events Added!</h3>
          <p style={{ fontSize: 14, color: 'var(--text-sub)', marginBottom: 28 }}>
            <strong style={{ color: '#10b981', fontSize: 28 }}>{savedCount}</strong> events were successfully added to your calendar.
          </p>
          <button onClick={() => router.push('/events')} className="btn-primary-gradient"
            style={{ width: '100%', justifyContent: 'center', padding: '13px', borderRadius: 12, fontSize: 15 }}>
            View Events Calendar <ArrowRight size={15} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes shimmer-bar { from { transform: translateX(-100%); } to { transform: translateX(200%); } }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════
//  MAIN PAGE
// ════════════════════════════════════════════
export default function ImportPage() {
  const [tab, setTab] = useState<ActiveTab>('sheet');

  const tabs = [
    { id: 'sheet' as const,    Icon: FileSpreadsheet, label: 'Google Sheets',      sub: 'Import member data' },
    { id: 'calendar' as const, Icon: FileText,        label: 'Calendar Document',  sub: 'AI event extraction' },
  ];

  return (
    <>
      <PageHeader title="Import" subtitle="Bulk import members or extract events from a calendar document." />
      <div style={{ padding: '28px 32px', flex: 1, overflowY: 'auto' }}>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, maxWidth: 560 }}>
          {tabs.map(({ id, Icon, label, sub }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 18px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                border: `1px solid ${active ? 'var(--border-glow)' : 'var(--border)'}`,
                background: active ? 'rgba(99,102,241,0.10)' : 'var(--bg-card)',
                transition: 'all 0.2s ease',
                boxShadow: active ? '0 0 0 3px var(--indigo-glow)' : 'none',
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.05)' }}>
                  <Icon size={18} strokeWidth={1.8} style={{ color: active ? '#818cf8' : 'var(--text-muted)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: active ? 'var(--text)' : 'var(--text-sub)' }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {tab === 'sheet'    && <SheetImport />}
        {tab === 'calendar' && <CalendarImport />}
      </div>
    </>
  );
}

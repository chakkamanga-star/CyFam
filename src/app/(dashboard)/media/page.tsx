'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import PageHeader from '@/components/PageHeader';
import toast from 'react-hot-toast';

type MediaItem = {
  id: string; file_url: string; album_name: string | null;
  file_size: number | null; created_at: string;
  events: { title: string } | null;
};

type MemberPhoto = {
  id: string; name: string; photo_url: string; teams: { name: string } | null;
};

type Event = { id: string; title: string };

// Which album section is active: 'all' | 'member-photos' | specific album name
type AlbumFilter = '' | '__members__' | string;

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [memberPhotos, setMemberPhotos] = useState<MemberPhoto[]>([]);
  const [albums, setAlbums] = useState<string[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [albumFilter, setAlbumFilter] = useState<AlbumFilter>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [albumName, setAlbumName] = useState('');
  const [eventId, setEventId] = useState('');
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '60' });
    if (albumFilter && albumFilter !== '__members__') params.set('album', albumFilter);
    const res = await fetch(`/api/media?${params}`);
    const data = await res.json();
    setItems(data.data || []);
    setAlbums(data.albums || []);
    setTotal(data.count || 0);
    setLoading(false);
  }, [albumFilter]);

  const fetchMemberPhotos = useCallback(async () => {
    const res = await fetch('/api/members?limit=200');
    const data = await res.json();
    const withPhotos = (data.data || []).filter((m: MemberPhoto) => m.photo_url);
    setMemberPhotos(withPhotos);
  }, []);

  // Download via server-side proxy to avoid CORS restrictions on R2
  const downloadPhoto = (url: string, filename: string) => {
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    const a = document.createElement('a');
    a.href = proxyUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => { fetchMedia(); }, [fetchMedia]);
  useEffect(() => { fetchMemberPhotos(); }, [fetchMemberPhotos]);
  useEffect(() => { fetch('/api/events?limit=100').then(r => r.json()).then(d => setEvents(d.data || [])); }, []);

  const uploadFiles = async (files: File[]) => {
    if (!albumName) { toast.error('Enter an album name first'); return; }
    setUploading(true);
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('album_name', albumName);
    if (eventId) formData.append('event_id', eventId);

    const res = await fetch('/api/media', { method: 'POST', body: formData });
    const data = await res.json();
    setUploading(false);

    if (!res.ok) { toast.error('Upload failed'); return; }
    toast.success(`${data.uploaded.length} photos uploaded!`);
    if (data.errors.length) toast.error(`${data.errors.length} failed`);
    fetchMedia();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) uploadFiles(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) uploadFiles(files);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleBulkDelete = async () => {
    if (!selected.size || !confirm(`Delete ${selected.size} photos?`)) return;
    const res = await fetch('/api/media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected] }),
    });
    if (res.ok) { toast.success('Deleted'); setSelected(new Set()); fetchMedia(); }
    else { toast.error('Delete failed'); }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  const showingMembers = albumFilter === '__members__';
  const totalMemberPhotos = memberPhotos.length;

  return (
    <>
      <PageHeader title="Media Gallery" subtitle={showingMembers ? `${totalMemberPhotos} member photos` : `${total} photos & videos`}>
        {selected.size > 0 && !showingMembers && (
          <button onClick={handleBulkDelete} className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25">
            🗑 Delete {selected.size} Selected
          </button>
        )}
      </PageHeader>

      <div className="p-8 flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Upload Panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-semibold text-[15px]">Upload Photos</h3>
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Album Name *</label>
                <input type="text" className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  placeholder="e.g. Christmas 2024" value={albumName}
                  onChange={e => setAlbumName(e.target.value)} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-400 mb-1.5">Tag to Event</label>
                <select className="glass-input w-full px-3 py-2.5 rounded-lg text-sm"
                  value={eventId} onChange={e => setEventId(e.target.value)}>
                  <option value="">No event</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
              </div>

              {/* Drop Zone */}
              <div
                ref={dropRef}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${dragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/20 hover:border-white/30'}`}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="text-xs text-slate-400">Uploading...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl mb-2">📸</div>
                    <p className="text-xs text-slate-400 mb-2">Drag & drop or click to select</p>
                    <label className="btn-primary-gradient px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer inline-block">
                      Choose Files
                      <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileInput} />
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Album Filter Sidebar */}
            <div className="glass-card p-5">
              <h3 className="font-semibold text-[13px] text-slate-400 mb-3">Albums</h3>
              {/* All photos */}
              <button
                onClick={() => { setAlbumFilter(''); setSelected(new Set()); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${albumFilter === '' ? 'bg-indigo-500/15 text-indigo-300 font-semibold' : 'hover:bg-white/5 text-slate-400'}`}
              >
                🖼️ All Photos ({total})
              </button>
              {/* Member Photos virtual album */}
              <button
                onClick={() => { setAlbumFilter('__members__'); setSelected(new Set()); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${albumFilter === '__members__' ? 'bg-purple-500/15 text-purple-300 font-semibold' : 'hover:bg-white/5 text-slate-400'}`}
              >
                👤 Member Photos ({totalMemberPhotos})
              </button>
              {/* Real albums */}
              {albums.map(a => (
                <button key={a} onClick={() => { setAlbumFilter(a); setSelected(new Set()); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors truncate ${albumFilter === a ? 'bg-indigo-500/15 text-indigo-300 font-semibold' : 'hover:bg-white/5 text-slate-400'}`}>
                  📁 {a}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="lg:col-span-3">
            {loading && !showingMembers ? (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : showingMembers ? (
              /* ── Member Photos Grid ── */
              memberPhotos.length === 0 ? (
                <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
                  <div className="text-5xl mb-4">👤</div>
                  <p className="text-slate-400 mb-1">No member photos yet</p>
                  <p className="text-sm text-slate-500">Upload photos via the Members page</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {memberPhotos.map(m => (
                    <div key={m.id} className="relative group">
                      <div
                        className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-white/20 transition-all cursor-pointer"
                        onClick={() => setLightbox({ url: m.photo_url, label: m.name })}
                      >
                        <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-end justify-between p-2 pointer-events-none">
                        <button
                          className="pointer-events-auto w-7 h-7 bg-black/60 hover:bg-indigo-500 rounded-lg flex items-center justify-center text-white text-sm transition-colors"
                          title="Download"
                          onClick={e => { e.stopPropagation(); downloadPhoto(m.photo_url, `${m.name.replace(/\s+/g,'_')}.jpg`); }}
                        >⬇</button>
                        <div className="w-full">
                          <div className="text-[11px] font-semibold text-white truncate text-center">{m.name}</div>
                          {m.teams && <div className="text-[10px] text-white/60 text-center">{m.teams.name}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : items.length === 0 ? (
              <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
                <div className="text-5xl mb-4">🖼️</div>
                <p className="text-slate-400 mb-1">No photos yet</p>
                <p className="text-sm text-slate-500">Upload photos using the panel on the left</p>
              </div>
            ) : (
              /* ── Regular Media Grid ── */
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {items.map(item => (
                  <div key={item.id} className="relative group" onClick={() => toggleSelect(item.id)}>
                    <div className={`aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${selected.has(item.id) ? 'border-indigo-500 scale-95' : 'border-transparent hover:border-white/20'}`}>
                      <img
                        src={item.file_url}
                        alt={item.album_name || ''}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onClick={e => { if (!selected.size) { e.stopPropagation(); setLightbox({ url: item.file_url, label: item.album_name || '' }); } }}
                      />
                    </div>
                    {/* Download button — top right on hover */}
                    {!selected.has(item.id) && (
                      <button
                        className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-indigo-500 rounded-lg items-center justify-center text-white text-sm transition-colors opacity-0 group-hover:opacity-100 hidden group-hover:flex z-10"
                        title="Download"
                        onClick={e => { e.stopPropagation(); downloadPhoto(item.file_url, `photo_${item.id.slice(0,8)}.jpg`); }}
                      >⬇</button>
                    )}
                    {selected.has(item.id) && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                    )}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-end p-2 pointer-events-none">
                      <div className="text-[10px] text-white/80 truncate">{item.album_name} {item.file_size ? `• ${formatSize(item.file_size)}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <div className="absolute -top-10 right-0 flex items-center gap-3">
              <button
                onClick={() => downloadPhoto(lightbox.url, `${lightbox.label.replace(/\s+/g,'_') || 'photo'}.jpg`)}
                className="text-white/70 hover:text-indigo-300 text-sm font-semibold transition-colors flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                title="Download"
              >⬇ Download</button>
              <button
                onClick={() => setLightbox(null)}
                className="text-white/70 hover:text-white text-2xl transition-colors"
              >✕</button>
            </div>
            <img src={lightbox.url} alt={lightbox.label} className="w-full h-full object-contain rounded-xl max-h-[80vh]" />
            {lightbox.label && (
              <div className="text-center text-sm text-white/70 mt-3 font-semibold">{lightbox.label}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { api, convTitle, getToken, nameOf, Conversation, Reel, ReelComment, User } from './api';

const MAX_MB = 50;      // keep in sync with maxReelMB in server/src/config.ts
const MAX_SECONDS = 60; // checked in the browser before upload
const COLORS = ['#0f766e', '#b45309', '#7c3aed', '#be123c', '#0369a1', '#4d7c0f'];

function Pic({ u, size = 36 }: { u: User; size?: number }) {
  if (u.avatar) return <img src={u.avatar} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  const c = COLORS[[...u.username].reduce((h, ch) => h + ch.charCodeAt(0), 0) % COLORS.length];
  return <div className="rounded-full grid place-items-center text-white font-semibold shrink-0" style={{ width: size, height: size, background: c, fontSize: size * 0.4 }}>{nameOf(u).charAt(0).toUpperCase()}</div>;
}

function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration); };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read this video.')); };
    v.src = url;
  });
}

/* ---------------- Upload dialog ---------------- */
function UploadModal({ onClose, onDone }: { onClose: () => void; onDone: (r: Reel) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = async (f?: File) => {
    if (!f) return;
    setErr('');
    if (f.size > MAX_MB * 1048576) return setErr(`That video is ${(f.size / 1048576).toFixed(0)} MB. The limit is ${MAX_MB} MB.`);
    try {
      const d = await readDuration(f);
      if (d > MAX_SECONDS) return setErr(`Reels can be up to ${MAX_SECONDS} seconds. Yours is ${Math.round(d)} seconds.`);
    } catch (e: any) { return setErr(`${e.message} Try an MP4 file.`); }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const upload = () => {
    if (!file) return;
    setBusy(true); setErr(''); setPct(0);
    const form = new FormData();
    form.append('caption', caption);
    form.append('video', file);
    const xhr = new XMLHttpRequest(); // XHR (not fetch) so we can show upload progress
    xhr.open('POST', '/api/reels');
    xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      setBusy(false);
      let data: any = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300) { onDone(data); onClose(); } else setErr(data.error || 'Upload failed.');
    };
    xhr.onerror = () => { setBusy(false); setErr('Network error. Please try again.'); };
    xhr.send(form);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => !busy && onClose()}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 space-y-3 text-slate-800" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">New reel</h2>
        <input ref={input} type="file" hidden accept="video/mp4,video/webm,video/quicktime" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        {!file ? (
          <button onClick={() => input.current?.click()} className="w-full rounded-xl border-2 border-dashed border-slate-300 py-10 text-slate-500 hover:border-teal-600 hover:text-teal-700">
            <div className="text-3xl">🎬</div>
            <div className="mt-1 font-medium">Choose a video</div>
            <div className="text-xs">MP4, WEBM or MOV · up to {MAX_MB} MB · up to {MAX_SECONDS}s</div>
          </button>
        ) : (
          <video src={preview} controls className="mx-auto max-h-64 rounded-xl bg-black" />
        )}
        <textarea className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-600" rows={2} maxLength={200}
          placeholder="Write a caption…" value={caption} onChange={(e) => setCaption(e.target.value)} />
        {busy && <div className="h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-teal-600 transition-all" style={{ width: `${pct}%` }} /></div>}
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2">
          {file && !busy && <button className="px-3 py-2 text-sm text-slate-500" onClick={() => { setFile(null); setPreview(''); }}>Change video</button>}
          <button className="px-4 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-40" disabled={busy} onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 text-sm rounded-lg bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-40" disabled={!file || busy} onClick={upload}>
            {busy ? `Uploading ${pct}%` : 'Post reel'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Share dialog ---------------- */
function ShareModal({ reel, convs, me, onClose, onShared }: { reel: Reel; convs: Conversation[]; me: User; onClose: () => void; onShared: () => void }) {
  const [sent, setSent] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}/?reel=${reel._id}`;
  const send = async (id: string) => {
    try { await api(`/reels/${reel._id}/share`, { body: { conversationId: id } }); setSent((s) => [...s, id]); onShared(); }
    catch (e: any) { alert(e.message); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); } catch { prompt('Copy this link', link); }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 space-y-3 text-slate-800" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">Share reel</h2>
        <div className="flex gap-2">
          <button className="flex-1 rounded-xl bg-slate-100 py-2 text-sm hover:bg-slate-200" onClick={copy}>{copied ? '✓ Link copied' : '🔗 Copy link'}</button>
          {'share' in navigator && <button className="flex-1 rounded-xl bg-slate-100 py-2 text-sm hover:bg-slate-200" onClick={() => navigator.share({ title: 'Reel', url: link }).catch(() => {})}>↗ More…</button>}
        </div>
        <div className="text-xs font-medium text-teal-700">Send in a chat</div>
        <div className="max-h-60 overflow-y-auto divide-y">
          {convs.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No chats yet.</p>}
          {convs.map((c) => (
            <div key={c._id} className="flex items-center justify-between gap-3 py-2">
              <span className="truncate text-sm">{c.type === 'group' ? '👥 ' : ''}{convTitle(c, me._id)}</span>
              <button className="shrink-0 rounded-full bg-teal-700 px-3 py-1 text-xs text-white disabled:bg-slate-300" disabled={sent.includes(c._id)} onClick={() => send(c._id)}>
                {sent.includes(c._id) ? 'Sent ✓' : 'Send'}
              </button>
            </div>
          ))}
        </div>
        <button className="w-full rounded-lg py-2 text-sm text-slate-600 hover:bg-slate-100" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

/* ---------------- Comments ---------------- */
function CommentsSheet({ reel, me, socketRef, onClose }: { reel: Reel; me: User; socketRef?: { current: Socket | null }; onClose: () => void }) {
  const [items, setItems] = useState<ReelComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = async (before?: string) => {
    try {
      const page = await api<ReelComment[]>(`/reels/${reel._id}/comments${before ? `?before=${encodeURIComponent(before)}` : ''}`);
      setItems((p) => { const ids = new Set(p.map((c) => c._id)); return [...p, ...page.filter((c) => !ids.has(c._id))]; });
      setMore(page.length === 20);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  useEffect(() => { // other people's comments appear live
    const s = socketRef?.current;
    if (!s) return;
    const onNew = (d: { id: string; comment: ReelComment }) => { if (d.id === reel._id) setItems((p) => (p.some((c) => c._id === d.comment._id) ? p : [d.comment, ...p])); };
    const onDel = (d: { id: string; commentId: string }) => { if (d.id === reel._id) setItems((p) => p.filter((c) => c._id !== d.commentId)); };
    s.on('reel:comment', onNew);
    s.on('reel:comment-deleted', onDel);
    return () => { s.off('reel:comment', onNew); s.off('reel:comment-deleted', onDel); };
  }, [reel._id, socketRef]);

  const post = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true); setErr('');
    try {
      const c = await api<ReelComment>(`/reels/${reel._id}/comments`, { body: { text: t } });
      setItems((p) => (p.some((x) => x._id === c._id) ? p : [c, ...p]));
      setText('');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const remove = async (c: ReelComment) => {
    try { await api(`/reels/${reel._id}/comments/${c._id}`, { method: 'DELETE' }); setItems((p) => p.filter((x) => x._id !== c._id)); }
    catch (e: any) { alert(e.message); }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="flex h-[70%] w-full max-w-md flex-col rounded-t-3xl bg-white text-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="font-semibold">Comments {reel.commentCount ? `(${reel.commentCount})` : ''}</h2>
          <button className="text-slate-500 hover:text-slate-900" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {loading && <p className="text-center text-sm text-slate-400">Loading…</p>}
          {!loading && items.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No comments yet. Start the conversation.</p>}
          {items.map((c) => (
            <div key={c._id} className="flex gap-3">
              <Pic u={c.author} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{nameOf(c.author)}</span>
                  <span>{timeAgo(c.createdAt)}</span>
                  {(c.author._id === me._id || reel.author._id === me._id) && <button className="ml-auto text-red-500 hover:underline" onClick={() => remove(c)}>Delete</button>}
                </div>
                <p className="text-sm break-words whitespace-pre-wrap">{c.text}</p>
              </div>
            </div>
          ))}
          {more && <button className="w-full text-sm text-teal-700" onClick={() => load(items[items.length - 1]?.createdAt)}>Load more</button>}
        </div>
        {err && <p className="px-5 text-sm text-red-600">{err}</p>}
        <div className="flex items-center gap-2 border-t p-3">
          <input className="flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-600/30" maxLength={300} placeholder="Add a comment…"
            value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && post()} />
          <button className="rounded-full bg-teal-700 px-4 py-2 text-sm text-white disabled:opacity-40" disabled={!text.trim() || busy} onClick={post}>Post</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- One reel ---------------- */
interface ItemProps {
  reel: Reel; mine: boolean; muted: boolean;
  onSeen?: () => void; onLike: () => void; onComment: () => void; onShare: () => void; onDelete: () => void;
}
function ReelItem({ reel, mine, muted, onSeen, onLike, onComment, onShare, onDelete }: ItemProps) {
  const box = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => { if (vid.current) vid.current.muted = muted; }, [muted]);
  useEffect(() => {
    const el = box.current, v = vid.current;
    if (!el || !v) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { v.play().catch(() => {}); setPaused(false); onSeen?.(); }
      else { v.pause(); v.currentTime = 0; setPaused(false); }
    }, { threshold: 0.7 });
    io.observe(el);
    return () => io.disconnect();
  }, []); // eslint-disable-line

  const toggle = () => {
    const v = vid.current; if (!v) return;
    if (v.paused) { v.play(); setPaused(false); } else { v.pause(); setPaused(true); }
  };
  const btn = 'grid place-items-center w-12 h-12 rounded-full bg-black/40 backdrop-blur text-2xl';
  return (
    <div ref={box} className="relative h-full w-full snap-start snap-always bg-black">
      <video ref={vid} src={reel.video.url} loop playsInline muted preload="metadata" className="h-full w-full object-contain" onClick={toggle} />
      {paused && <div className="pointer-events-none absolute inset-0 grid place-items-center text-6xl text-white/80">▶</div>}

      <div className="absolute inset-x-0 bottom-0 p-4 pr-20 pt-20 bg-gradient-to-t from-black/80 to-transparent text-white">
        <div className="flex items-center gap-2"><Pic u={reel.author} /><span className="font-semibold">{nameOf(reel.author)}</span></div>
        {reel.caption && <p className="mt-2 text-sm leading-snug break-words">{reel.caption}</p>}
      </div>

      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 text-white">
        <button onClick={onLike} aria-label="Like" className="flex flex-col items-center gap-1">
          <span className={`${btn} ${reel.liked ? 'text-red-500' : ''}`}>{reel.liked ? '♥' : '♡'}</span>
          <span className="text-xs">{reel.likeCount}</span>
        </button>
        <button onClick={onComment} aria-label="Comments" className="flex flex-col items-center gap-1">
          <span className={btn}>💬</span>
          <span className="text-xs">{reel.commentCount ?? 0}</span>
        </button>
        <button onClick={onShare} aria-label="Share" className="flex flex-col items-center gap-1">
          <span className={btn}>↗</span>
          <span className="text-xs">{reel.shareCount}</span>
        </button>
        {mine && <button onClick={onDelete} aria-label="Delete reel" className={`${btn} text-lg`}>🗑</button>}
      </div>
    </div>
  );
}

/* ---------------- Reels section ---------------- */
export default function Reels({ me, convs, focusId, onBack }: { me: User; convs: Conversation[]; focusId?: string | null; socketRef?: { current: Socket | null }; onBack: () => void }) {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [muted, setMuted] = useState(true); // browsers only allow autoplay when muted
  const [showUpload, setShowUpload] = useState(false);
  const [shareFor, setShareFor] = useState<Reel | null>(null);
  const [commentsFor, setCommentsFor] = useState<Reel | null>(null);
  const sockRef = useRef<Socket | null>(null);
  const [err, setErr] = useState('');
  const busy = useRef(false);
  const latest = useRef<Reel[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  latest.current = reels;

  const loadMore = useCallback(async (first = false) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const last = latest.current[latest.current.length - 1];
      const q = !first && last ? `?before=${encodeURIComponent(last.createdAt)}` : '';
      const page = await api<Reel[]>('/reels' + q);
      setReels((p) => { const ids = new Set(p.map((r) => r._id)); return [...p, ...page.filter((r) => !ids.has(r._id))]; });
      if (page.length < 10) setDone(true);
    } catch (e: any) { setErr(e.message); }
    finally { busy.current = false; setLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      if (focusId) { // opened from a shared link: show that reel first
        try { const r = await api<Reel>(`/reels/${focusId}`); latest.current = [r]; setReels([r]); } catch { /* removed */ }
      }
      await loadMore(true);
    })();
  }, [focusId, loadMore]);

  const patch = (id: string, fn: (r: Reel) => Reel) => setReels((p) => p.map((r) => (r._id === id ? fn(r) : r)));

  useEffect(() => { // live counts from other users
    const s = io({ auth: { token: getToken() } }); // Reels keeps its own live connection, so it never depends on App
    sockRef.current = s;
    const onLike = (d: { id: string; likeCount: number; userId: string; liked: boolean }) =>
      patch(d.id, (x) => ({ ...x, likeCount: d.likeCount, liked: d.userId === me._id ? d.liked : x.liked })); // 'liked' only changes for the person who clicked
    const onCount = (d: { id: string; commentCount: number }) => patch(d.id, (x) => ({ ...x, commentCount: d.commentCount }));
    const onGone = (d: { id: string }) => setReels((p) => p.filter((x) => x._id !== d.id));
    s.on('reel:like', onLike);
    s.on('reel:comment', onCount);
    s.on('reel:comment-deleted', onCount);
    s.on('reel:deleted', onGone);
    return () => { s.disconnect(); sockRef.current = null; };
  }, []); // eslint-disable-line
  const like = async (r: Reel) => {
    patch(r._id, (x) => ({ ...x, liked: !r.liked, likeCount: r.likeCount + (r.liked ? -1 : 1) })); // optimistic
    try {
      const res = await api<{ liked: boolean; likeCount: number }>(`/reels/${r._id}/like`, { method: 'POST', body: {} });
      patch(r._id, (x) => ({ ...x, liked: res.liked, likeCount: res.likeCount }));
    } catch { patch(r._id, (x) => ({ ...x, liked: r.liked, likeCount: r.likeCount })); }
  };
  const del = async (r: Reel) => {
    if (!confirm('Delete this reel? This cannot be undone.')) return;
    try { await api(`/reels/${r._id}`, { method: 'DELETE' }); setReels((p) => p.filter((x) => x._id !== r._id)); }
    catch (e: any) { alert(e.message); }
  };

  const openComments = commentsFor ? reels.find((x) => x._id === commentsFor._id) : undefined; // always the live copy

  return (
    <div className="fixed inset-0 z-30 flex justify-center bg-neutral-950">
      <div className="relative h-full w-full max-w-md bg-black">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-3 text-white bg-gradient-to-b from-black/70 to-transparent">
          <button className="rounded-full bg-black/40 px-3 py-1.5 text-sm backdrop-blur" onClick={onBack}>← Chats</button>
          <span className="font-semibold">Reels</span>
          <div className="flex items-center gap-2">
            <button className="grid place-items-center w-9 h-9 rounded-full bg-black/40 backdrop-blur" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? '🔇' : '🔊'}</button>
            <button className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-black" onClick={() => setShowUpload(true)}>+ Upload</button>
          </div>
        </div>

        <div ref={scroller} className="h-full overflow-y-scroll snap-y snap-mandatory [scrollbar-width:none]">
          {loading && <div className="h-full grid place-items-center text-white/60">Loading reels…</div>}
          {!loading && err && reels.length === 0 && <div className="h-full grid place-items-center px-6 text-center text-red-300">{err}</div>}
          {!loading && !err && reels.length === 0 && (
            <div className="h-full grid place-items-center px-8 text-center text-white/70">
              <div><div className="text-5xl">🎬</div><p className="mt-3 font-medium text-white">No reels yet</p><p className="text-sm">Be the first to share a short video.</p></div>
            </div>
          )}
          {reels.map((r, i) => (
            <ReelItem key={r._id} reel={r} mine={r.author._id === me._id} muted={muted}
              onSeen={i === reels.length - 1 && !done ? () => loadMore() : undefined}
              onLike={() => like(r)} onComment={() => setCommentsFor(r)} onShare={() => setShareFor(r)} onDelete={() => del(r)} />
          ))}
        </div>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onDone={(r) => { setReels((p) => [r, ...p]); scroller.current?.scrollTo({ top: 0 }); }} />}
      {openComments && <CommentsSheet reel={openComments} me={me} socketRef={sockRef} onClose={() => setCommentsFor(null)} />}
      {shareFor && <ShareModal reel={shareFor} convs={convs} me={me} onClose={() => setShareFor(null)}
        onShared={() => patch(shareFor._id, (x) => ({ ...x, shareCount: x.shareCount + 1 }))} />}
    </div>
  );
}
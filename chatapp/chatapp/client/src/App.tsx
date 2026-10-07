import { CSSProperties, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { api, convTitle, nameOf, Attachment, Conversation, Message, User } from './api';
import Reels from './Reels';
import { CallManager, CallButtons } from './Call';

/* ---------- Hardcoded chat wallpapers (add or remove entries here) ---------- */
interface Wallpaper { id: string; name: string; style: CSSProperties }
const dots = (bg: string, dot: string): CSSProperties => ({
  backgroundColor: bg,
  backgroundImage: `radial-gradient(${dot} 1.3px, transparent 1.3px)`,
  backgroundSize: '20px 20px',
});
const grad = (a: string, b: string): CSSProperties => ({ backgroundImage: `linear-gradient(160deg, ${a}, ${b})` });

const WALLPAPERS: Wallpaper[] = [
  { id: 'sand', name: 'Sand dots', style: dots('#efe9dd', '#d8cfbd') },
  { id: 'paper', name: 'Paper', style: { backgroundColor: '#eef1f4' } },
  { id: 'mint', name: 'Mint', style: grad('#d9f7e4', '#a6e3c1') },
  { id: 'ocean', name: 'Ocean', style: grad('#cfe4ff', '#9cc7f0') },
  { id: 'sunset', name: 'Sunset', style: grad('#ffe3c8', '#fbb59a') },
  { id: 'rose', name: 'Rose', style: grad('#fde0ee', '#c7cdf2') },
  { id: 'forest', name: 'Forest', style: grad('#17404a', '#4f8f74') },
  { id: 'night', name: 'Night dots', style: dots('#0f1a20', '#22333d') },
];
const WALLPAPER_KEY = 'chat-wallpaper';

/* ---------- Small helpers ---------- */
const AVATAR_COLORS = ['#0f766e', '#b45309', '#7c3aed', '#be123c', '#0369a1', '#4d7c0f', '#a21caf', '#c2410c'];
function Avatar({ name, src, size = 40, group = false }: { name: string; src?: string; size?: number; group?: boolean }) {
  if (src) return <img src={src} alt={name} className="shrink-0 object-cover rounded-full" style={{ width: size, height: size, borderRadius: group ? size * 0.3 : undefined }} />;
  const color = AVATAR_COLORS[[...name].reduce((h, c) => h + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <div className="shrink-0 grid place-items-center rounded-full text-white font-semibold select-none"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4, borderRadius: group ? size * 0.3 : undefined }}>
      {name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  );
}
const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

const Icon = {
  send: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" /></svg>,
  clip: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m21 11-8.6 8.6a5 5 0 0 1-7-7L14 4a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4L15 7" /></svg>,
  back: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>,
  userPlus: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6" /></svg>,
  more: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>,
  paint: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2s-.6-1.6-.6-2.5c0-1 .8-1.5 1.7-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10.5" cy="7" r="1" /><circle cx="15.5" cy="7.5" r="1" /></svg>,
};

/* ---------- Sign in ---------- */
function Auth({ onAuth }: { onAuth: (u: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>('login');
  const [f, setF] = useState({ username: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);


  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const goVerify = (email: string, msg: string) => { setF((p) => ({ ...p, email })); setOtp(''); setErr(''); setInfo(msg); setCooldown(60); setMode('verify'); };
  const finish = (r: { token: string; user: User }) => {
    localStorage.setItem('token', r.token);
    localStorage.setItem('user', JSON.stringify(r.user));
    onAuth(r.user);
  };
  const submit = async () => {
    setErr(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'register') {
        const r = await api<{ email: string }>('/auth/register', { body: f });
        goVerify(r.email, `We sent a 6-digit code to ${r.email}.`);
      } else if (mode === 'login') {
        finish(await api('/auth/login', { body: { username: f.username, password: f.password } }));
      } else {
        finish(await api('/auth/verify-otp', { body: { email: f.email, otp } }));
      }
    } catch (e: any) {
      if (e.data?.needsVerification) goVerify(e.data.email, `Your email isn't verified yet. We sent a code to ${e.data.email}.`);
      else setErr(e.message);
    } finally { setBusy(false); }
  };
  const resend = async () => {
    try { await api('/auth/resend-otp', { body: { email: f.email } }); setErr(''); setInfo('A new code is on its way.'); setCooldown(60); }
    catch (e: any) { setErr(e.message); }
  };

  const field = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20';
  const enter = (e: React.KeyboardEvent) => e.key === 'Enter' && submit();
  const titles = { login: 'Welcome back', register: 'Create your account', verify: 'Check your email' };
  return (
    <div className="min-h-screen grid place-items-center p-4" style={{ ...grad('#0f3d3e', '#1f7a6d') }}>
      <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-2xl space-y-4">
        <div className="text-center space-y-1">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-teal-700 text-white grid place-items-center text-2xl">{mode === 'verify' ? '✉️' : '💬'}</div>
          <h1 className="text-2xl font-semibold pt-2">{titles[mode]}</h1>
          <p className="text-sm text-slate-500">
            {mode === 'login' && 'Sign in to pick up your conversations.'}
            {mode === 'register' && 'Choose a username and add your email to get started.'}
            {mode === 'verify' && 'Enter the 6-digit code we emailed you.'}
          </p>
        </div>

        {mode !== 'verify' && <input className={field} placeholder="Username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} onKeyDown={enter} />}
        {mode === 'register' && <input className={field} type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} onKeyDown={enter} />}
        {mode !== 'verify' && <input className={field} type="password" placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} onKeyDown={enter} />}
        {mode === 'verify' && (
          <input className={`${field} text-center text-2xl tracking-[0.5em] font-semibold`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
            placeholder="······" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} onKeyDown={enter} />
        )}

        {info && <p className="text-sm text-teal-700">{info}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="w-full rounded-xl bg-teal-700 hover:bg-teal-800 text-white py-3 font-medium transition-colors disabled:opacity-50"
          disabled={busy || (mode === 'verify' && otp.length !== 6)} onClick={submit}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Send verification code' : 'Verify and continue'}
        </button>

        {mode === 'verify' ? (
          <div className="flex justify-between text-sm">
            <button className="text-slate-500 hover:text-slate-800" onClick={() => { setErr(''); setInfo(''); setMode('login'); }}>Back to sign in</button>
            <button className="text-teal-700 disabled:text-slate-400" disabled={cooldown > 0} onClick={resend}>{cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}</button>
          </div>
        ) : (
          <button className="w-full text-sm text-slate-500 hover:text-slate-800" onClick={() => { setErr(''); setMode(mode === 'login' ? 'register' : 'login'); }}>
            {mode === 'login' ? 'New here? Create an account' : 'Already registered? Sign in'}
          </button>
        )}
      </div>
    </div>
  );
}

function VerifyGate({ me, onVerified, onLogout }: { me: User; onVerified: (u: User) => void; onLogout: () => void }) {
  const [email, setEmail] = useState(me.email || '');
  const [step, setStep] = useState<'email' | 'otp'>(me.email ? 'otp' : 'email');
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    setErr(''); setInfo(''); setBusy(true);
    try {
      const r = await api<{ email: string }>('/auth/add-email', { body: { email } });
      setEmail(r.email); setOtp(''); setStep('otp'); setInfo(`We sent a 6-digit code to ${r.email}.`);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const verify = async () => {
    setErr(''); setBusy(true);
    try {
      const r = await api<{ token: string; user: User }>('/auth/verify-otp', { body: { email, otp } });
      localStorage.setItem('token', r.token);
      localStorage.setItem('user', JSON.stringify(r.user));
      onVerified(r.user);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const resend = async () => {
    try { await api('/auth/resend-otp', { body: { email } }); setErr(''); setInfo('A new code is on its way.'); }
    catch (e: any) { setErr(e.message); }
  };
  const input = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20';
  return (
    <div className="min-h-screen grid place-items-center p-4" style={{ ...grad('#0f3d3e', '#1f7a6d') }}>
      <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-2xl space-y-4">
        <div className="text-center space-y-1">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500 text-white grid place-items-center text-2xl">🔒</div>
          <h1 className="text-2xl font-semibold pt-2">{step === 'email' ? 'Add your email' : 'Verify your email'}</h1>
          <p className="text-sm text-slate-500">
            {step === 'email'
              ? `Hi ${me.username}, your account has no verified email yet. Add one and confirm it with a code to unlock chat.`
              : <>Chat stays locked until you verify <b>{email}</b>. Enter the 6-digit code we emailed you.</>}
          </p>
        </div>

        {step === 'email' ? (
          <input className={input} type="email" autoFocus placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && email.trim() && sendCode()} />
        ) : (
          <input className={`${input} text-center text-2xl tracking-[0.5em] font-semibold`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
            placeholder="······" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && otp.length === 6 && verify()} />
        )}

        {info && <p className="text-sm text-teal-700">{info}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}
        {step === 'email' ? (
          <button className="w-full rounded-xl bg-teal-700 hover:bg-teal-800 text-white py-3 font-medium disabled:opacity-50" disabled={busy || !email.trim()} onClick={sendCode}>
            {busy ? 'Please wait…' : 'Send verification code'}
          </button>
        ) : (
          <button className="w-full rounded-xl bg-teal-700 hover:bg-teal-800 text-white py-3 font-medium disabled:opacity-50" disabled={busy || otp.length !== 6} onClick={verify}>
            {busy ? 'Please wait…' : 'Verify and unlock chat'}
          </button>
        )}
        <div className="flex justify-between text-sm">
          <button className="text-slate-500 hover:text-slate-800" onClick={onLogout}>Log out</button>
          {step === 'otp'
            ? <span className="space-x-3"><button className="text-slate-500 hover:text-slate-800" onClick={() => { setErr(''); setInfo(''); setStep('email'); }}>Change email</button><button className="text-teal-700" onClick={resend}>Resend code</button></span>
            : null}
        </div>
      </div>
    </div>
  );
}

function ProfilePanel({ me, onClose, onSaved }: { me: User; onClose: () => void; onSaved: (u: User) => void }) {
  const [name, setName] = useState(me.displayName || '');
  const [about, setAbout] = useState(me.about || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const apply = (u: User) => { localStorage.setItem('user', JSON.stringify(u)); onSaved(u); };
  const run = async (fn: () => Promise<User>, done = false) => {
    setErr(''); setSaved(false); setBusy(true);
    try { apply(await fn()); setSaved(done); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const save = () => run(() => api<User>('/profile', { method: 'PATCH', body: { displayName: name, about } }), true);
  const pickPhoto = (file?: File) => {
    if (!file) return;
    const form = new FormData(); form.append('file', file);
    run(() => api<User>('/profile/avatar', { form }));
  };
  const field = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20';
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Profile</h2>
          <button className="text-slate-500 hover:text-slate-900" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Avatar name={name || me.username} src={me.avatar} size={112} />
            <button className="absolute bottom-0 right-0 grid place-items-center w-9 h-9 rounded-full bg-teal-700 text-white shadow hover:bg-teal-800"
              onClick={() => fileRef.current?.click()} title="Change photo" aria-label="Change photo">📷</button>
            <input ref={fileRef} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          {me.avatar && <button className="text-xs text-red-600 hover:underline" onClick={() => run(() => api<User>('/profile/avatar', { method: 'DELETE' }))}>Remove photo</button>}
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-teal-700">Name</span>
          <input className={field} maxLength={40} placeholder={me.username} value={name} onChange={(e) => setName(e.target.value)} />
          <span className="block text-xs text-slate-400">This is the name people see in chats. Your username stays the same.</span>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-teal-700">About</span>
          <input className={field} maxLength={139} placeholder="Hey there! I am using ChatApp." value={about} onChange={(e) => setAbout(e.target.value)} />
          <span className="block text-right text-xs text-slate-400">{about.length}/139</span>
        </label>

        <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3"><span className="text-slate-500">Username</span><span className="font-medium">@{me.username}</span></div>
          <div className="flex justify-between gap-3 items-center">
            <span className="text-slate-500">Email</span>
            <span className="font-medium truncate">{me.email || 'Not added'}</span>
          </div>
          <div className="flex justify-between gap-3 items-center">
            <span className="text-slate-500">Status</span>
            {me.verified === true
              ? <span className="rounded-full bg-teal-100 text-teal-800 px-2.5 py-0.5 text-xs font-semibold">✓ Verified</span>
              : <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-semibold">Not verified</span>}
          </div>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        {saved && <p className="text-sm text-teal-700">Profile saved.</p>}
        <button className="w-full rounded-xl bg-teal-700 hover:bg-teal-800 text-white py-3 font-medium disabled:opacity-50" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
    </div>
  );
}

function AttachmentView({ a, mine }: { a: Attachment; mine: boolean }) {
  if (a.mime.startsWith('video/')) return <video src={a.url} controls preload="metadata" className="max-w-[16rem] max-h-80 rounded-xl mt-1 bg-black" />;
  return a.mime.startsWith('image/')
    ? <a href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.name} className="max-w-[16rem] max-h-72 rounded-xl mt-1 object-cover" /></a>
    : (
      <a href={a.url} download={a.name} className={`mt-1 flex items-center gap-3 rounded-xl px-3 py-2 ${mine ? 'bg-black/15' : 'bg-slate-100'}`}>
        <span className="text-xl">📄</span>
        <span className="min-w-0">
          <span className="block text-sm font-medium truncate max-w-[12rem]">{a.name}</span>
          <span className="block text-xs opacity-70">{a.size >= 1048576 ? (a.size / 1048576).toFixed(1) + ' MB' : Math.ceil(a.size / 1024) + ' KB'}</span>
        </span>
      </a>
    );
}

/* ---------- App ---------- */
export default function App() {
  const [me, setMe] = useState<User | null>(() => (localStorage.getItem('token') ? JSON.parse(localStorage.getItem('user') || 'null') : null));
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [picked, setPicked] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [typing, setTyping] = useState(false);
  const [showWalls, setShowWalls] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [section, setSection] = useState<'chats' | 'reels'>(() => (new URLSearchParams(location.search).has('reel') ? 'reels' : 'chats'));
  const [focusReel] = useState(() => new URLSearchParams(location.search).get('reel'));
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(() => ('Notification' in window ? Notification.permission : 'denied'));
  const openRef = useRef<(id: string) => void>();
  const [addQ, setAddQ] = useState('');
  const [addResults, setAddResults] = useState<User[]>([]);
  const [addPicked, setAddPicked] = useState<User[]>([]);
  const [wallId, setWallId] = useState(() => localStorage.getItem(WALLPAPER_KEY) || WALLPAPERS[0].id);
  const socket = useRef<Socket | null>(null);
  const activeRef = useRef<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  activeRef.current = activeId;
  const markRead = (id: string) => {
    setConvs((p) => p.map((c) => (c._id === id ? { ...c, unread: 0 } : c)));
    api(`/conversations/${id}/read`, { method: 'POST', body: {} }).catch(() => { });
  };
  const removeConv = (id: string) => {
    setConvs((p) => p.filter((c) => c._id !== id));
    if (activeRef.current === id) { setActiveId(null); setMsgs([]); }
  };

  const wall = WALLPAPERS.find((w) => w.id === wallId) || WALLPAPERS[0];
  const chooseWall = (id: string) => { setWallId(id); localStorage.setItem(WALLPAPER_KEY, id); setShowWalls(false); };

  useEffect(() => {
    if (!me || me.verified !== true) return; // unverified accounts never load chats or open the socket
    api<Conversation[]>('/conversations').then(setConvs);
    const s = io({ auth: { token: localStorage.getItem('token') } });
    socket.current = s;
    s.on('conversation:new', (c: Conversation) => setConvs((p) => (p.some((x) => x._id === c._id) ? p : [c, ...p])));
    s.on('conversation:updated', (c: Conversation) => setConvs((p) => p.map((x) => (x._id === c._id ? { ...x, ...c } : x))));
    s.on('conversation:removed', (d: { id: string }) => removeConv(d.id));
    s.on('profile:updated', (d: { _id: string; displayName?: string; avatar?: string }) => {
      const patch = (u: User): User => (u._id === d._id ? { ...u, displayName: d.displayName, avatar: d.avatar } : u);
      setConvs((p) => p.map((c) => ({ ...c, members: c.members.map(patch) })));
      setMsgs((p) => p.map((m) => ({ ...m, sender: patch(m.sender) })));
    });
    s.on('message:deleted', (d: { id: string }) =>
      setMsgs((p) => p.map((m) => (m._id === d.id ? { ...m, deleted: true, text: '', attachments: [] } : m))));
    s.on('message:new', (m: Message) => {
      const fromOther = m.sender._id !== me._id;
      const viewing = m.conversation === activeRef.current && !document.hidden;
      if (m.conversation === activeRef.current) setMsgs((p) => [...p, m]);
      if (fromOther && viewing) markRead(m.conversation);
      setConvs((p) => {
        const c = p.find((x) => x._id === m.conversation);
        if (!c) return p;
        const unread = fromOther && !viewing ? (c.unread || 0) + 1 : c.unread || 0;
        return [{ ...c, unread, lastMessage: { text: m.text || '📎 file', at: m.createdAt } }, ...p.filter((x) => x !== c)];
      });
      if (fromOther && !viewing && 'Notification' in window && Notification.permission === 'granted') {
        const n = new Notification(nameOf(m.sender), { body: m.text || '📎 File', tag: m.conversation });
        n.onclick = () => { window.focus(); openRef.current?.(m.conversation); n.close(); };
      }
    });
    let t: number;
    s.on('typing', (d: { conversationId: string }) => {
      if (d.conversationId === activeRef.current) { setTyping(true); clearTimeout(t); t = window.setTimeout(() => setTyping(false), 1500); }
    });
    return () => { s.disconnect(); };
  }, [me?._id, me?.verified]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
  useEffect(() => {
    if (!q.trim()) return setResults([]);
    const id = setTimeout(() => api<User[]>(`/users?q=${encodeURIComponent(q)}`).then(setResults), 250);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    if (!showAdd || !addQ.trim()) return setAddResults([]);
    const id = setTimeout(() => api<User[]>(`/users?q=${encodeURIComponent(addQ)}`).then(setAddResults), 250);
    return () => clearTimeout(id);
  }, [addQ, showAdd]);

  useEffect(() => {
    const onVis = () => { if (!document.hidden && activeRef.current) markRead(activeRef.current); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  const totalUnread = convs.reduce((n, c) => n + (c.unread || 0), 0);
  useEffect(() => { document.title = totalUnread ? `(${totalUnread}) ChatApp` : 'ChatApp'; }, [totalUnread]);

  useEffect(() => { if (location.search) history.replaceState(null, '', location.pathname); }, []);
  useEffect(() => {
    if (!me) return;
    api<User>('/auth/me') // keeps the verified flag in sync with the server; drops dead sessions
      .then((u) => { localStorage.setItem('user', JSON.stringify(u)); setMe(u); })
      .catch((e) => { if (e.message === 'Unauthorized') { localStorage.removeItem('token'); localStorage.removeItem('user'); setMe(null); } });
  }, [me?._id]);

  if (!me) return <Auth onAuth={setMe} />;
  if (me.verified === undefined) return <div className="min-h-screen grid place-items-center text-slate-400">Loading…</div>;
  if (me.verified !== true) {
    return <VerifyGate me={me} onVerified={setMe} onLogout={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setMe(null); }} />;
  }

  const closeAdd = () => { setShowAdd(false); setAddQ(''); setAddResults([]); setAddPicked([]); };
  const addMembers = async () => {
    if (!activeId || !addPicked.length) return;
    try {
      const c = await api<Conversation>(`/conversations/${activeId}/members`, { body: { userIds: addPicked.map((u) => u._id) } });
      setConvs((p) => p.map((x) => (x._id === c._id ? { ...x, ...c } : x)));
      closeAdd();
    } catch (e: any) { alert(e.message); }
  };

  const open = async (id: string) => {
    setSection('chats');
    setActiveId(id); setTyping(false); markRead(id);
    setMsgs(await api<Message[]>(`/conversations/${id}/messages`));
  };

  openRef.current = open;
  const startDirect = async (u: User) => {
    const c = await api<Conversation>('/conversations/direct', { body: { userId: u._id } });
    setQ(''); open(c._id);
  };
  const createGroup = async () => {
    if (!groupName.trim() || !picked.length) return;
    const c = await api<Conversation>('/conversations/group', { body: { name: groupName, memberIds: picked.map((p) => p._id) } });
    setPicked([]); setGroupName(''); setQ(''); open(c._id);
  };
  const send = (attachments: Attachment[] = []) => {
    if (!activeId || (!text.trim() && !attachments.length)) return;
    socket.current?.emit('message:send', { conversationId: activeId, text, attachments });
    setText('');
  };
  const onFile = async (file?: File) => {
    if (!file) return;
    const form = new FormData(); form.append('file', file);
    try { send([await api<Attachment>('/upload', { form })]); } catch (e: any) { alert(e.message); }
  };
  const active = convs.find((c) => c._id === activeId);
  const isGroupAdmin = !!active && active.type === 'group' && !!active.admins?.includes(me._id);
  const leaveGroup = async () => {
    setShowMenu(false);
    if (!active || !confirm(`Leave "${active.name}"? You won't get its messages anymore.`)) return;
    try { await api(`/conversations/${active._id}/leave`, { method: 'POST', body: {} }); removeConv(active._id); }
    catch (e: any) { alert(e.message); }
  };
  const deleteGroup = async () => {
    setShowMenu(false);
    if (!active || !confirm(`Delete "${active.name}" for everyone? All its messages and files will be removed permanently.`)) return;
    try { await api(`/conversations/${active._id}`, { method: 'DELETE' }); removeConv(active._id); }
    catch (e: any) { alert(e.message); }
  };
  const deleteMessage = async (id: string) => {
    if (!confirm('Delete this message for everyone?')) return;
    try { await api(`/messages/${id}`, { method: 'DELETE' }); }
    catch (e: any) { alert(e.message); }
  };
  const dark = wall.id === 'night' || wall.id === 'forest';

  return (
    <div className="h-screen flex bg-white text-slate-800">
      {showProfile && <ProfilePanel me={me} onClose={() => setShowProfile(false)} onSaved={setMe} />}
      {section === 'reels' && <Reels me={me} convs={convs} focusId={focusReel} onBack={() => setSection('chats')} />}
        <CallManager me={me} />
      {/* ---- Sidebar ---- */}
      <aside className={`${activeId ? 'hidden md:flex' : 'flex'} w-full md:w-96 border-r border-slate-200 flex-col bg-white`}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button className="flex flex-1 min-w-0 items-center gap-3 text-left" onClick={() => setShowProfile(true)} title="Edit profile">
            <Avatar name={nameOf(me)} src={me.avatar} size={40} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{nameOf(me)} <span className="text-teal-600 text-xs" title="Email verified">✓</span></div>
              <div className="text-xs text-slate-500 truncate">{me.about || 'Hey there! I am using ChatApp.'}</div>
            </div>
          </button>
          <button className="text-sm rounded-full bg-slate-100 hover:bg-slate-200 px-3 py-1" onClick={() => setSection('reels')}>🎬 Reels</button>
          {notifPerm === 'default' && (
            <button className="text-xs rounded-full bg-teal-50 text-teal-800 px-3 py-1" onClick={() => Notification.requestPermission().then(setNotifPerm)}>Enable alerts</button>
          )}
          <button className="text-sm text-slate-500 hover:text-slate-900" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setMe(null); setActiveId(null); }}>Log out</button>
        </div>

        <div className="px-4 pb-3 space-y-2">
          <input className="w-full rounded-full bg-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-600/30"
            placeholder="Search people to chat with" value={q} onChange={(e) => setQ(e.target.value)} />
          {results.map((u) => (
            <div key={u._id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-slate-50">
              <Avatar name={nameOf(u)} src={u.avatar} size={32} />
              <span className="flex-1 text-sm truncate">{nameOf(u)}</span>
              <button className="text-xs rounded-full bg-teal-700 text-white px-3 py-1" onClick={() => startDirect(u)}>Message</button>
              <button className="text-xs rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100"
                onClick={() => !picked.some((p) => p._id === u._id) && setPicked([...picked, u])}>Add to group</button>
            </div>
          ))}
          {picked.length > 0 && (
            <div className="rounded-2xl border border-slate-200 p-3 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {picked.map((p) => (
                  <button key={p._id} onClick={() => setPicked(picked.filter((x) => x._id !== p._id))}
                    className="text-xs rounded-full bg-teal-50 text-teal-800 px-2.5 py-1">{nameOf(p)} ✕</button>
                ))}
              </div>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" placeholder="Group name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              <button className="w-full rounded-lg bg-teal-700 hover:bg-teal-800 text-white py-2 text-sm disabled:opacity-40" disabled={!groupName.trim()} onClick={createGroup}>Create group</button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {convs.length === 0 && <p className="px-6 py-10 text-center text-sm text-slate-400">No chats yet. Search for a username above to say hello.</p>}
          {convs.map((c) => {
            const title = convTitle(c, me._id);
            return (
              <button key={c._id} onClick={() => open(c._id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${c._id === activeId ? 'bg-teal-50' : ''}`}>
                <Avatar name={title} src={c.type === 'direct' ? c.members.find((m) => m._id !== me._id)?.avatar : undefined} size={46} group={c.type === 'group'} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <span className={`truncate ${c.unread ? 'font-semibold' : 'font-medium'}`}>{title}</span>
                    <span className={`text-xs shrink-0 ${c.unread ? 'text-teal-700 font-medium' : 'text-slate-400'}`}>{fmtTime(c.lastMessage?.at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm truncate ${c.unread ? 'text-slate-800' : 'text-slate-500'}`}>{c.lastMessage?.text || (c.type === 'group' ? `${c.members.length} members` : 'Say hello')}</span>
                    {!!c.unread && <span className="shrink-0 min-w-5 h-5 px-1.5 grid place-items-center rounded-full bg-teal-600 text-white text-xs font-semibold">{c.unread > 99 ? '99+' : c.unread}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ---- Chat pane ---- */}
      <main className={`${activeId ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {!active ? (
          <div
            className="flex-1 flex flex-col items-center justify-center px-6 text-center bg-slate-50 bg-cover bg-center"
            style={{ backgroundImage: "linear-gradient(rgba(248,250,252,.9), rgba(248,250,252,.9)), url('/images/img.svg')" }}
          >
            <h2 className="mt-6 text-[40px] font-extrabold tracking-tight text-slate-800">
              Your messages, all in one place
            </h2>
            <p className="mt-2 max-w-sm text-slate-500">
              Pick a conversation from the list, or search for someone by username to start a new chat.
            </p>

            <p className="mt-10 text-xs text-slate-400">🔒 Only verified accounts can chat</p>
          </div>
        ) : (
          <>
            <header className="relative px-3 py-2.5 bg-white border-b border-slate-200 flex items-center gap-3">
              <button className="md:hidden p-1 text-slate-600" onClick={() => setActiveId(null)} aria-label="Back to chats">{Icon.back}</button>
              <Avatar name={convTitle(active, me._id)} src={active.type === 'direct' ? active.members.find((m) => m._id !== me._id)?.avatar : undefined} size={40} group={active.type === 'group'} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{convTitle(active, me._id)}</div>
                <div className="text-xs text-slate-500 truncate">
                  {typing ? 'typing…' : active.type === 'group' ? active.members.map((m) => nameOf(m)).join(', ') : 'Direct message'}
                </div>
              </div>
              <CallButtons conv={active} me={me} />
              {active.type === 'group' && (
                <button onClick={() => { setShowWalls(false); setShowMenu((v) => !v); }} title="Group options" aria-label="Group options"
                  className="p-2 rounded-full text-slate-600 hover:bg-slate-100">{Icon.more}</button>
              )}
              {showMenu && (
                <>
                  <button className="fixed inset-0 z-10 cursor-default" onClick={() => setShowMenu(false)} aria-label="Close menu" />
                  <div className="absolute right-3 top-full mt-2 z-20 w-52 rounded-2xl bg-white py-2 text-sm shadow-xl ring-1 ring-black/5">
                    <button className="w-full px-4 py-2 text-left hover:bg-slate-50" onClick={leaveGroup}>Leave group</button>
                    {isGroupAdmin && <button className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50" onClick={deleteGroup}>Delete group</button>}
                  </div>
                </>
              )}
              {isGroupAdmin && (
                <button onClick={() => setShowAdd(true)} title="Add members" aria-label="Add members"
                  className="p-2 rounded-full text-slate-600 hover:bg-slate-100">{Icon.userPlus}</button>
              )}
              {showAdd && (
                <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4" onClick={closeAdd}>
                  <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div className="font-semibold">Add members to {active.name}</div>
                    <input autoFocus className="w-full rounded-full bg-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-600/30"
                      placeholder="Search people" value={addQ} onChange={(e) => setAddQ(e.target.value)} />
                    {addPicked.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {addPicked.map((p) => (
                          <button key={p._id} onClick={() => setAddPicked(addPicked.filter((x) => x._id !== p._id))}
                            className="text-xs rounded-full bg-teal-50 text-teal-800 px-2.5 py-1">{nameOf(p)} ✕</button>
                        ))}
                      </div>
                    )}
                    <div className="max-h-56 overflow-y-auto">
                      {addResults.map((u) => {
                        const isMember = active.members.some((m) => m._id === u._id);
                        const isPicked = addPicked.some((p) => p._id === u._id);
                        return (
                          <button key={u._id} disabled={isMember}
                            onClick={() => setAddPicked(isPicked ? addPicked.filter((p) => p._id !== u._id) : [...addPicked, u])}
                            className="w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50 disabled:opacity-50">
                            <Avatar name={nameOf(u)} src={u.avatar} size={32} />
                            <span className="flex-1 text-sm truncate">{nameOf(u)}</span>
                            <span className="text-xs text-slate-500">{isMember ? 'Already in group' : isPicked ? '✓ Selected' : 'Select'}</span>
                          </button>
                        );
                      })}
                      {addQ.trim() && addResults.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No users found.</p>}
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100" onClick={closeAdd}>Cancel</button>
                      <button className="rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-sm disabled:opacity-40"
                        disabled={!addPicked.length} onClick={addMembers}>
                        Add {addPicked.length || ''} {addPicked.length === 1 ? 'member' : 'members'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <button onClick={() => setShowWalls((v) => !v)} title="Change chat background" aria-label="Change chat background"
                className="p-2 rounded-full text-slate-600 hover:bg-slate-100">{Icon.paint}</button>

              {showWalls && (
                <>
                  <button className="fixed inset-0 z-10 cursor-default" onClick={() => setShowWalls(false)} aria-label="Close" />
                  <div className="absolute right-3 top-full mt-2 z-20 w-72 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-black/5">
                    <div className="text-sm font-semibold mb-3">Chat background</div>
                    <div className="grid grid-cols-4 gap-3">
                      {WALLPAPERS.map((w) => (
                        <button key={w.id} onClick={() => chooseWall(w.id)} className="text-center group">
                          <span className={`block h-14 rounded-xl ring-2 transition ${w.id === wall.id ? 'ring-teal-600' : 'ring-transparent group-hover:ring-slate-300'}`} style={w.style} />
                          <span className="block mt-1 text-[11px] text-slate-600 leading-tight">{w.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </header>

            <div className="flex-1 overflow-y-auto px-3 md:px-8 py-4" style={wall.style}>
              {msgs.length === 0 && (
                <p className={`mx-auto w-fit rounded-full px-4 py-1.5 text-xs ${dark ? 'bg-white/15 text-white' : 'bg-white/70 text-slate-600'}`}>No messages yet. Send the first one.</p>
              )}
              {msgs.map((m, i) => {
                const mine = m.sender._id === me._id;
                const first = msgs[i - 1]?.sender._id !== m.sender._id;
                return (
                  <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'} ${first ? 'mt-3' : 'mt-0.5'}`}>
                    <div className={`group max-w-[85%] md:max-w-md px-3 py-1.5 shadow-sm rounded-2xl ${mine ? 'bg-teal-700 text-white rounded-br-md' : 'bg-white text-slate-800 rounded-bl-md'}`}>
                      {!mine && active.type === 'group' && first && <div className="text-xs font-semibold text-teal-700">{nameOf(m.sender)}</div>}
                      {m.deleted ? (
                        <div className="italic text-sm opacity-70">This message was deleted</div>
                      ) : (
                        <>
                          {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
                          {m.attachments.map((a) => <AttachmentView key={a.url} a={a} mine={mine} />)}
                        </>
                      )}
                      <div className="flex items-center justify-end gap-2 text-[10px] opacity-60 mt-0.5">
                        {!m.deleted && (mine || isGroupAdmin) && (
                          <button onClick={() => deleteMessage(m._id)} className="underline md:opacity-0 md:group-hover:opacity-100 transition-opacity">Delete</button>
                        )}
                        <span>{fmtTime(m.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottom} />
            </div>

            <footer className="p-3 bg-white border-t border-slate-200 flex gap-2 items-center">
              <label className="p-2 rounded-full text-slate-600 hover:bg-slate-100 cursor-pointer" title="Attach a file or image">
                {Icon.clip}
                <input type="file" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              <input className="flex-1 rounded-full bg-slate-100 px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-600/30" placeholder="Type a message" value={text}
                onChange={(e) => { setText(e.target.value); socket.current?.emit('typing', { conversationId: activeId }); }}
                onKeyDown={(e) => e.key === 'Enter' && send()} />
              <button className="p-3 rounded-full bg-teal-700 hover:bg-teal-800 text-white transition-colors disabled:opacity-40" disabled={!text.trim()} onClick={() => send()} aria-label="Send">{Icon.send}</button>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
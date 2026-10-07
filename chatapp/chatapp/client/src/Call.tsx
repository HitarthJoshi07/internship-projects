import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken, nameOf, Conversation, User } from './api';

/* Voice + video calling with WebRTC (browser built-ins, no extra library).
   Socket.IO only carries the "signalling" messages; audio/video flows directly between the two browsers. */

const bus = new EventTarget(); // lets the call buttons talk to <CallManager> without extra props
const iceServers: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
const env = (import.meta as any).env || {};
// For production add a TURN server (needed when users are behind strict networks). Put these in client/.env:
// VITE_TURN_URL=turn:your.server:3478  VITE_TURN_USER=...  VITE_TURN_PASS=...
if (env.VITE_TURN_URL) iceServers.push({ urls: env.VITE_TURN_URL, username: env.VITE_TURN_USER, credential: env.VITE_TURN_PASS });

type Phase = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected';
interface ActiveCall { id?: string; peer: User; convId: string; video: boolean; incoming: boolean }

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const COLORS = ['#0f766e', '#b45309', '#7c3aed', '#be123c', '#0369a1', '#4d7c0f'];
function Face({ u, size }: { u: User; size: number }) {
  if (u.avatar) return <img src={u.avatar} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  const c = COLORS[[...u.username].reduce((h, ch) => h + ch.charCodeAt(0), 0) % COLORS.length];
  return <div className="rounded-full grid place-items-center font-semibold text-white" style={{ width: size, height: size, background: c, fontSize: size * 0.4 }}>{nameOf(u).charAt(0).toUpperCase()}</div>;
}

/* ---------- Buttons for the chat header (direct chats only) ---------- */
export function CallButtons({ conv, me }: { conv: Conversation; me: User }) {
  if (conv.type !== 'direct') return null;
  const peer = conv.members.find((m) => m._id !== me._id);
  if (!peer) return null;
  const go = (video: boolean) => bus.dispatchEvent(new CustomEvent('start', { detail: { peer, convId: conv._id, video } }));
  const cls = 'p-2 rounded-full text-slate-600 hover:bg-slate-100';
  return (
    <>
      <button className={cls} onClick={() => go(false)} title="Voice call" aria-label="Voice call">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
      </button>
      <button className={cls} onClick={() => go(true)} title="Video call" aria-label="Video call">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11" /><rect x="2" y="6" width="14" height="12" rx="2" /></svg>
      </button>
    </>
  );
}

/* Simple ringtone made with the Web Audio API (no sound file needed) */
function useRing(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx: AudioContext = new Ctx();
    ctx.resume().catch(() => {});
    const beep = () => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 480;
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
      o.start(); o.stop(ctx.currentTime + 0.7);
    };
    beep();
    const id = setInterval(beep, 2000);
    return () => { clearInterval(id); ctx.close().catch(() => {}); };
  }, [on]);
}

/* ---------- The call engine + full-screen call UI. Mount once in App. ---------- */
export function CallManager({ me }: { me: User }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [notice, setNotice] = useState('');
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [secs, setSecs] = useState(0);
  const [swapped, setSwapped] = useState(false);   // true = your own view is the big one
  const [split, setSplit] = useState(false);       // side-by-side layout
  const [mirror, setMirror] = useState(true);      // only the front camera is mirrored
  const [canFlip, setCanFlip] = useState(false);   // more than one camera available
  const [flipping, setFlipping] = useState(false);
  const sock = useRef<Socket | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const queued = useRef<RTCIceCandidateInit[]>([]);
  const callRef = useRef<ActiveCall | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const remoteVid = useRef<HTMLVideoElement>(null);
  const localVid = useRef<HTMLVideoElement>(null);

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(''), 3500); };
  const update = (p: Phase, c: ActiveCall | null) => { phaseRef.current = p; callRef.current = c; setPhase(p); setCall(c); };

  const cleanup = useCallback((msg = '') => {
    local.current?.getTracks().forEach((t) => t.stop()); local.current = null;
    pc.current?.close(); pc.current = null; queued.current = [];
    if (remoteVid.current) remoteVid.current.srcObject = null;
    setMuted(false); setCamOff(false); setSecs(0);
    setSwapped(false); setSplit(false); setMirror(true); setCanFlip(false); setFlipping(false);
    phaseRef.current = 'idle'; callRef.current = null; setPhase('idle'); setCall(null);
    if (msg) { setNotice(msg); setTimeout(() => setNotice(''), 3500); }
  }, []);

  const getMedia = async (video: boolean) => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Calls need HTTPS (or localhost) and a supported browser.');
    try {
      local.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: video ? { facingMode: 'user' } : false });
    } catch {
      throw new Error(video ? 'Allow camera and microphone access to make video calls.' : 'Allow microphone access to make calls.');
    }
    const track = local.current?.getVideoTracks()[0];
    if (track) {
      setMirror(track.getSettings().facingMode !== 'environment');
      navigator.mediaDevices.enumerateDevices()
        .then((d) => setCanFlip(d.filter((x) => x.kind === 'videoinput').length > 1))
        .catch(() => {});
    }
  };

  const makePC = (callId: string) => {
    const p = new RTCPeerConnection({ iceServers });
    local.current?.getTracks().forEach((t) => p.addTrack(t, local.current!));
    p.onicecandidate = (e) => { if (e.candidate) sock.current?.emit('call:signal', { callId, data: { candidate: e.candidate.toJSON() } }); };
    p.ontrack = (e) => { if (remoteVid.current) remoteVid.current.srcObject = e.streams[0] ?? new MediaStream([e.track]); };
    p.onconnectionstatechange = () => {
      if (p.connectionState === 'connected') { phaseRef.current = 'connected'; setPhase('connected'); }
      if (p.connectionState === 'failed') { sock.current?.emit('call:end', { callId }); cleanup('Connection failed. Check your network and try again.'); }
    };
    pc.current = p;
    return p;
  };

  const start = async (peer: User, convId: string, video: boolean) => {
    if (phaseRef.current !== 'idle') return;
    try { await getMedia(video); } catch (e: any) { return flash(e.message); }
    update('calling', { peer, convId, video, incoming: false });
    sock.current?.emit('call:invite', { conversationId: convId, video }, (r: any) => {
      if (!r?.ok) return cleanup(r?.error || 'Could not start the call.');
      if (!callRef.current) { sock.current?.emit('call:end', { callId: r.callId }); return; } // caller already cancelled
      callRef.current = { ...callRef.current, id: r.callId };
      setCall(callRef.current);
    });
  };
  const startRef = useRef(start);
  startRef.current = start;

  useEffect(() => {
    const onStart = (e: Event) => { const d = (e as CustomEvent).detail; startRef.current(d.peer, d.convId, d.video); };
    bus.addEventListener('start', onStart);

    const s = io({ auth: { token: getToken() } }); // own connection, independent from the chat socket
    sock.current = s;

    s.on('call:incoming', (d: any) => {
      if (phaseRef.current !== 'idle') { s.emit('call:end', { callId: d.callId }); return; }
      update('ringing', { id: d.callId, peer: d.from, convId: d.conversationId, video: d.video, incoming: true });
    });
    s.on('call:accepted', async ({ callId }: { callId: string }) => { // caller: the other side picked up, send the offer
      if (callRef.current?.id !== callId) return;
      update('connecting', callRef.current);
      const p = makePC(callId);
      await p.setLocalDescription(await p.createOffer());
      s.emit('call:signal', { callId, data: { sdp: p.localDescription } });
    });
    s.on('call:signal', async ({ callId, data }: { callId: string; data: any }) => {
      const p = pc.current;
      if (!p || callRef.current?.id !== callId) return;
      if (data.sdp) {
        await p.setRemoteDescription(data.sdp);
        for (const c of queued.current.splice(0)) await p.addIceCandidate(c).catch(() => {});
        if (data.sdp.type === 'offer') {
          await p.setLocalDescription(await p.createAnswer());
          s.emit('call:signal', { callId, data: { sdp: p.localDescription } });
        }
      } else if (data.candidate) {
        if (p.remoteDescription) await p.addIceCandidate(data.candidate).catch(() => {});
        else queued.current.push(data.candidate); // arrived before the offer/answer, keep it for later
      }
    });
    s.on('call:ended', ({ callId, reason }: { callId: string; reason: string }) => {
      if (callRef.current?.id !== callId) return;
      const text: Record<string, string> = { rejected: 'Call declined', cancelled: 'Call cancelled', timeout: 'No answer', handled: 'Answered on another device', ended: 'Call ended', disconnect: 'Call ended' };
      cleanup(text[reason] ?? 'Call ended');
    });

    return () => { bus.removeEventListener('start', onStart); s.disconnect(); cleanup(); };
  }, [cleanup]);

  useEffect(() => { if (localVid.current && local.current) localVid.current.srcObject = local.current; }, [phase, call]);
  useEffect(() => {
    if (phase !== 'connected') return;
    const id = setInterval(() => setSecs((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);
  useRing(phase === 'ringing');

  const accept = async () => {
    const c = callRef.current;
    if (!c?.id) return;
    try { await getMedia(c.video); } catch (e: any) { sock.current?.emit('call:end', { callId: c.id }); return cleanup(e.message); }
    makePC(c.id); // ready before the offer arrives
    update('connecting', c);
    sock.current?.emit('call:accept', { callId: c.id });
  };
  const hangup = () => { // also used to cancel while calling and to decline while ringing
    const c = callRef.current;
    if (c?.id) sock.current?.emit('call:end', { callId: c.id });
    cleanup();
  };
  const toggleMic = () => { local.current?.getAudioTracks().forEach((t) => (t.enabled = muted)); setMuted(!muted); };
  const toggleCam = () => { local.current?.getVideoTracks().forEach((t) => (t.enabled = camOff)); setCamOff(!camOff); };

  const flipCamera = async () => { // front <-> back (or next camera on a laptop), without dropping the call
    const stream = local.current;
    const old = stream?.getVideoTracks()[0];
    if (!stream || !old || flipping) return;
    setFlipping(true);
    try {
      const cur = old.getSettings();
      const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
      const tries: MediaTrackConstraints[] = [];
      if (cur.facingMode) tries.push({ facingMode: { exact: cur.facingMode === 'environment' ? 'user' : 'environment' } });
      if (cams.length > 1) tries.push({ deviceId: { exact: cams[(cams.findIndex((c) => c.deviceId === cur.deviceId) + 1) % cams.length].deviceId } });
      if (!tries.length) return flash('No other camera found.');

      old.stop(); // phones can only open one camera at a time
      let next: MediaStreamTrack | undefined;
      for (const video of tries) {
        try { next = (await navigator.mediaDevices.getUserMedia({ video })).getVideoTracks()[0]; break; } catch { /* try the next option */ }
      }
      if (!next) { // could not switch: reopen the old camera so the call keeps working
        next = (await navigator.mediaDevices.getUserMedia({ video: cur.deviceId ? { deviceId: { exact: cur.deviceId } } : true })).getVideoTracks()[0];
        flash('Could not switch the camera.');
      }
      next.enabled = !camOff;
      stream.removeTrack(old);
      stream.addTrack(next);
      const sender = pc.current?.getSenders().find((x) => x.track?.kind === 'video');
      await sender?.replaceTrack(next); // the other person sees the new camera, no reconnect needed
      setMirror(next.getSettings().facingMode !== 'environment');
      if (localVid.current) { localVid.current.srcObject = null; localVid.current.srcObject = stream; }
    } catch { flash('Could not switch the camera.'); }
    finally { setFlipping(false); }
  };

  const status = phase === 'calling' ? 'Calling…' : phase === 'ringing' ? `Incoming ${call?.video ? 'video' : 'voice'} call` : phase === 'connecting' ? 'Connecting…' : fmt(secs);
  const round = 'grid place-items-center w-12 h-12 md:w-14 md:h-14 rounded-full text-xl md:text-2xl disabled:opacity-40';
  const idle = 'bg-white/15 hover:bg-white/25';
  const videoCall = !!call?.video;
  const connected = phase === 'connected';
  const bigIsRemote = connected && !swapped; // before connecting, your own preview fills the screen

  const place = (isRemote: boolean) => { // which video sits where
    const first = isRemote === bigIsRemote;
    if (split) return first ? 'absolute left-0 top-0 h-1/2 w-full md:h-full md:w-1/2 object-cover' : 'absolute bottom-0 right-0 h-1/2 w-full md:h-full md:w-1/2 object-cover';
    return first ? 'absolute inset-0 h-full w-full object-cover' : 'absolute right-4 top-4 z-10 h-40 w-28 md:h-56 md:w-40 rounded-2xl object-cover shadow-xl ring-1 ring-white/30 cursor-pointer';
  };
  const tapSmall = (isRemote: boolean) => { if (!split && connected && isRemote !== bigIsRemote) setSwapped((v) => !v); };

  return (
    <>
      {notice && <div className="fixed top-4 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{notice}</div>}
      {phase !== 'idle' && call && (
        <div className="fixed inset-0 z-[60] flex flex-col text-white" style={{ background: 'linear-gradient(160deg,#0f3d3e,#0b1f2a)' }}>
          <video ref={remoteVid} autoPlay playsInline onClick={() => tapSmall(true)}
            className={videoCall && connected ? place(true) : 'absolute h-0 w-0 opacity-0'} />
          {videoCall && phase !== 'ringing' && (
            <video ref={localVid} autoPlay playsInline muted onClick={() => tapSmall(false)}
              className={`${place(false)} bg-black ${mirror ? '[transform:scaleX(-1)]' : ''}`} />
          )}

          {videoCall && phase !== 'ringing' ? (
            <div className="absolute left-4 top-4 z-10 drop-shadow-lg">
              <div className="font-semibold">{nameOf(call.peer)}</div>
              <div className="text-sm opacity-90">{status}</div>
            </div>
          ) : (
            <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <Face u={call.peer} size={128} />
              <div className="text-2xl font-semibold">{nameOf(call.peer)}</div>
              <div className="text-white/70">{status}</div>
            </div>
          )}

          <div className="relative z-10 mt-auto flex flex-wrap items-center justify-center gap-3 p-6 md:gap-5 md:p-8 bg-gradient-to-t from-black/60 to-transparent">
            {phase === 'ringing' ? (
              <>
                <button className={`${round} bg-red-600 hover:bg-red-700`} onClick={hangup} aria-label="Decline">✕</button>
                <button className={`${round} bg-emerald-500 hover:bg-emerald-600`} onClick={accept} aria-label="Accept">{videoCall ? '🎥' : '📞'}</button>
              </>
            ) : (
              <>
                <button className={`${round} ${muted ? 'bg-white text-slate-900' : idle}`} onClick={toggleMic} aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute' : 'Mute'}>{muted ? '🔇' : '🎤'}</button>
                {videoCall && <button className={`${round} ${camOff ? 'bg-white text-slate-900' : idle}`} onClick={toggleCam} aria-label="Toggle camera" title="Camera on/off">{camOff ? '🚫' : '📷'}</button>}
                {videoCall && canFlip && <button className={`${round} ${idle}`} disabled={flipping} onClick={flipCamera} aria-label="Flip camera" title="Flip camera">🔄</button>}
                {videoCall && connected && !split && <button className={`${round} ${idle}`} onClick={() => setSwapped((v) => !v)} aria-label="Swap views" title="Swap big and small view">⇄</button>}
                {videoCall && connected && <button className={`${round} ${split ? 'bg-white text-slate-900' : idle}`} onClick={() => setSplit((v) => !v)} aria-label="Toggle split view" title={split ? 'Back to small preview' : 'Side-by-side view'}>◫</button>}
                <button className={`${round} bg-red-600 hover:bg-red-700`} onClick={hangup} aria-label="End call">✕</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
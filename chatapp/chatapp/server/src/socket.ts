import crypto from 'crypto';
import { Server } from 'socket.io';
import { z } from 'zod';
import { verifyToken, isVerified } from './auth';
import { Conversation, Message, User } from './models';

const sendSchema = z.object({
  conversationId: z.string(),
  text: z.string().max(5000).default(''),
  attachments: z.array(z.object({
    url: z.string().startsWith('/uploads/'), name: z.string(), mime: z.string(), size: z.number(),
  })).max(10).default([]),
});

interface Call {
  id: string; convId: string; caller: string; callee: string;
  callerSock: string; calleeSock?: string; video: boolean; answeredAt?: number; timer?: NodeJS.Timeout;
}

export function setupSocket(io: Server) {
  const calls = new Map<string, Call>();
  const busy = new Map<string, string>(); // userId -> callId, so nobody gets two calls at once

  async function logCall(c: Call, text: string) { // call history shows up in the chat like WhatsApp
    const msg = await Message.create({ conversation: c.convId, sender: c.caller, text });
    await Conversation.updateOne({ _id: c.convId }, { lastMessage: { text, at: new Date(), sender: c.caller } });
    io.to(`conv:${c.convId}`).emit('message:new', await msg.populate('sender', 'username displayName avatar'));
  }

  function finish(c: Call, reason: string) {
    if (!calls.delete(c.id)) return; // already finished
    clearTimeout(c.timer);
    busy.delete(c.caller); busy.delete(c.callee);
    io.to(c.callerSock).to(`user:${c.callee}`).emit('call:ended', { callId: c.id, reason });
    const kind = c.video ? 'video' : 'voice';
    let text: string;
    if (c.answeredAt) {
      const sec = Math.round((Date.now() - c.answeredAt) / 1000);
      text = `📞 ${c.video ? 'Video' : 'Voice'} call · ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    } else text = reason === 'rejected' ? `📞 Declined ${kind} call` : `📞 Missed ${kind} call`;
    logCall(c, text).catch(console.error);
  }

  io.use(async (socket, next) => {
    try {
      const id = verifyToken(String(socket.handshake.auth.token));
      const u = await User.findById(id).select('verified email');
      if (!isVerified(u)) return next(new Error('unverified'));
      socket.data.userId = id;
      next();
    } catch { next(new Error('unauthorized')); }
  });

  io.on('connection', async (socket) => {
    const userId: string = socket.data.userId;
    socket.join(`user:${userId}`);
    const convs = await Conversation.find({ members: userId }).select('_id');
    convs.forEach((c) => socket.join(`conv:${c._id}`));

    socket.on('message:send', async (payload, ack?: (r: any) => void) => {
      const p = sendSchema.safeParse(payload);
      if (!p.success || (!p.data.text.trim() && !p.data.attachments.length)) return ack?.({ error: 'Invalid message' });
      const conv = await Conversation.findOne({ _id: p.data.conversationId, members: userId });
      if (!conv) return ack?.({ error: 'Not a member' });

      const msg = await Message.create({ conversation: conv._id, sender: userId, text: p.data.text, attachments: p.data.attachments });
      conv.lastMessage = { text: p.data.text || `📎 ${p.data.attachments[0]?.name}`, at: new Date(), sender: msg.sender as any };
      await conv.save();

      const full = await msg.populate('sender', 'username displayName avatar');
      io.to(`conv:${conv._id}`).emit('message:new', full);
      ack?.({ ok: true });
    });

    /* ----- Voice / video calls (1-to-1, direct chats only) ----- */
    socket.on('call:invite', async (payload: unknown, ack?: (r: any) => void) => {
      const p = z.object({ conversationId: z.string(), video: z.boolean() }).safeParse(payload);
      if (!p.success) return ack?.({ error: 'Invalid call' });
      const conv = await Conversation.findOne({ _id: p.data.conversationId, type: 'direct', members: userId });

      if (!conv) return ack?.({ error: 'Calls work in direct chats only' });
      const callee = conv.members.map(String).find((id) => id !== userId)!;

      if (busy.has(userId)) return ack?.({ error: 'You are already in a call' });
      if (busy.has(callee)) return ack?.({ error: 'They are on another call' });

      if (!(await io.in(`user:${callee}`).fetchSockets()).length) return ack?.({ error: 'They are offline right now' });

      const call: Call = { id: crypto.randomUUID(), convId: String(conv._id), caller: userId, callee, callerSock: socket.id, video: p.data.video };
      call.timer = setTimeout(() => finish(call, 'timeout'), 40_000); // nobody answered
      calls.set(call.id, call); busy.set(userId, call.id); busy.set(callee, call.id);
      const from = await User.findById(userId).select('username displayName avatar').lean();
      io.to(`user:${callee}`).emit('call:incoming', { callId: call.id, conversationId: call.convId, video: call.video, from });
      ack?.({ ok: true, callId: call.id });
    });

    socket.on('call:accept', ({ callId }: { callId: string }) => {
      const c = calls.get(callId);
      if (!c || c.callee !== userId || c.answeredAt) return;
      clearTimeout(c.timer);
      c.answeredAt = Date.now(); c.calleeSock = socket.id;
      socket.to(`user:${userId}`).emit('call:ended', { callId, reason: 'handled' }); // stop ringing on their other tabs
      io.to(c.callerSock).emit('call:accepted', { callId });
    });

    socket.on('call:signal', ({ callId, data }: { callId: string; data: unknown }) => { // relay offer / answer / ICE
      const c = calls.get(callId);
      if (!c) return;
      const to = socket.id === c.callerSock ? c.calleeSock : socket.id === c.calleeSock ? c.callerSock : undefined;
      if (to) io.to(to).emit('call:signal', { callId, data });
    });

    socket.on('call:end', ({ callId }: { callId: string }) => { // hang up, cancel or decline
      const c = calls.get(callId);
      if (!c || (c.caller !== userId && c.callee !== userId)) return;
      finish(c, c.answeredAt ? 'ended' : userId === c.caller ? 'cancelled' : 'rejected');
    });

    socket.on('disconnect', () => {
      for (const c of [...calls.values()]) if (c.callerSock === socket.id || c.calleeSock === socket.id) finish(c, 'disconnect');
    });

    socket.on('reels:join', () => socket.join('reels'));   // only people viewing Reels get live like/comment updates
    socket.on('reels:leave', () => socket.leave('reels'));

    socket.on('typing', ({ conversationId }: { conversationId: string }) => {
      if (socket.rooms.has(`conv:${conversationId}`)) socket.to(`conv:${conversationId}`).emit('typing', { conversationId, userId });
    });
  });
}
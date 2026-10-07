import { Router } from 'express';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthReq, requireAuth, requireVerified, isVerified, VERIFIED_QUERY } from './auth';
import { config } from './config';
import { Conversation, Message, Reel, ReelComment, User } from './models';

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const BLOCKED = /\.(exe|bat|cmd|sh|msi|js|html|svg)$/i; // never serve executable/active content
const PUBLIC = 'username displayName avatar'; // what other users are allowed to see about someone
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_r, f, cb) => cb(null, crypto.randomUUID() + path.extname(f.originalname).toLowerCase()),
});
const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_r, f, cb) => cb(null, /^image\/(png|jpe?g|webp|gif)$/.test(f.mimetype) && /\.(png|jpe?g|webp|gif)$/i.test(f.originalname)),
});
const upload = multer({
  storage,
  limits: { fileSize: config.maxFileMB * 1024 * 1024 },
  fileFilter: (_r, f, cb) => cb(null, !BLOCKED.test(f.originalname)),
});

const REEL_DIR = path.join(UPLOAD_DIR, 'reels'); // separate folder: deleting a chat message never deletes a reel's video
fs.mkdirSync(REEL_DIR, { recursive: true });
const reelUpload = multer({
  storage: multer.diskStorage({
    destination: REEL_DIR,
    filename: (_r, f, cb) => cb(null, crypto.randomUUID() + path.extname(f.originalname).toLowerCase()),
  }),
  limits: { fileSize: config.maxReelMB * 1024 * 1024 },
  fileFilter: (_r, f, cb) => cb(null, /^video\/(mp4|webm|quicktime)$/.test(f.mimetype) && /\.(mp4|webm|mov)$/i.test(f.originalname)),
});
const toReel = (x: any, me: string) => {
  const { likes, ...rest } = x; // never send the full list of who liked
  return { ...rest, commentCount: rest.commentCount || 0, liked: (likes || []).some((id: any) => String(id) === me) };
};

export function apiRouter(io: Server) {
  const r = Router();
  r.use(requireAuth, requireVerified); // every chat, user, upload and message route needs a verified account
  const uid = (req: any) => (req as AuthReq).userId;

  /* ---------- Reels ---------- */
  r.get('/reels', async (req, res) => {
    const filter: any = {};
    if (req.query.before) filter.createdAt = { $lt: new Date(String(req.query.before)) };
    const reels = await Reel.find(filter).sort({ createdAt: -1 }).limit(10).populate('author', PUBLIC).lean();
    res.json(reels.map((x) => toReel(x, uid(req))));
  });

  r.get('/reels/:id', async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'Reel not found' });
    const reel = await Reel.findById(req.params.id).populate('author', PUBLIC).lean();
    if (!reel) return res.status(404).json({ error: 'Reel not found' });
    res.json(toReel(reel, uid(req)));
  });

  r.post('/reels', reelUpload.single('video'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: `Choose an MP4, WEBM or MOV video up to ${config.maxReelMB} MB` });
    const caption = String(req.body.caption || '').trim().slice(0, 200);
    const reel = await Reel.create({
      author: uid(req), caption,
      video: { url: `/uploads/reels/${req.file.filename}`, mime: req.file.mimetype, size: req.file.size },
    });
    const full = await Reel.findById(reel._id).populate('author', PUBLIC).lean();
    res.status(201).json(toReel(full, uid(req)));
  });

  r.post('/reels/:id/like', async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'Reel not found' });
    const me = uid(req);
    const add = await Reel.updateOne({ _id: req.params.id, likes: { $ne: me } }, { $addToSet: { likes: me }, $inc: { likeCount: 1 } });
    const liked = add.modifiedCount > 0;
    if (!liked) {
      const rm = await Reel.updateOne({ _id: req.params.id, likes: me }, { $pull: { likes: me }, $inc: { likeCount: -1 } });
      if (!rm.modifiedCount) return res.status(404).json({ error: 'Reel not found' });
    }
    const reel = await Reel.findById(req.params.id).select('likeCount');
    const likeCount = reel?.likeCount ?? 0;
    // 'liked' in this event only applies to userId; clients must not copy it onto their own heart
    io.emit('reel:like', { id: req.params.id, likeCount, userId: me, liked });
    res.json({ liked, likeCount });
  });

  r.post('/reels/:id/share', async (req, res) => {
    const { conversationId } = z.object({ conversationId: z.string() }).parse(req.body);
    if (!Types.ObjectId.isValid(req.params.id) || !Types.ObjectId.isValid(conversationId)) return res.status(404).json({ error: 'Not found' });
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ error: 'Reel not found' });
    const conv = await Conversation.findOne({ _id: conversationId, members: uid(req) });
    if (!conv) return res.status(403).json({ error: 'You are not in that chat' });

    const v: any = reel.video;
    const msg = await Message.create({
      conversation: conv._id, sender: uid(req),
      text: `🎬 Shared a reel${reel.caption ? ': ' + reel.caption : ''}`.slice(0, 5000),
      attachments: [{ url: v.url, name: 'reel', mime: v.mime, size: v.size }],
    });
    await Conversation.updateOne({ _id: conv._id }, { lastMessage: { text: '🎬 Reel', at: new Date(), sender: uid(req) } });
    await Reel.updateOne({ _id: reel._id }, { $inc: { shareCount: 1 } });
    io.to(`conv:${conv._id}`).emit('message:new', await msg.populate('sender', PUBLIC));
    res.json({ ok: true });
  });

  r.get('/reels/:id/comments', async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'Reel not found' });
    const filter: any = { reel: req.params.id };
    if (req.query.before) filter.createdAt = { $lt: new Date(String(req.query.before)) };
    res.json(await ReelComment.find(filter).sort({ createdAt: -1 }).limit(20).populate('author', PUBLIC).lean());
  });

  r.post('/reels/:id/comments', async (req, res) => {
    const p = z.object({ text: z.string().trim().min(1).max(300) }).safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'A comment must be 1 to 300 characters' });
    if (!Types.ObjectId.isValid(req.params.id) || !(await Reel.exists({ _id: req.params.id }))) return res.status(404).json({ error: 'Reel not found' });
    const c = await ReelComment.create({ reel: req.params.id, author: uid(req), text: p.data.text });
    const bumped = await Reel.findByIdAndUpdate(req.params.id, { $inc: { commentCount: 1 } }, { new: true }).select('commentCount');
    const full = await ReelComment.findById(c._id).populate('author', PUBLIC).lean();
    io.emit('reel:comment', { id: req.params.id, commentCount: bumped?.commentCount ?? 0, comment: full });
    res.status(201).json(full);
  });

  r.delete('/reels/:id/comments/:cid', async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id) || !Types.ObjectId.isValid(req.params.cid)) return res.status(404).json({ error: 'Not found' });
    const c = await ReelComment.findOne({ _id: req.params.cid, reel: req.params.id });
    if (!c) return res.status(404).json({ error: 'Comment not found' });
    const reel = await Reel.findById(req.params.id).select('author');
    const allowed = String(c.author) === uid(req) || (!!reel && String(reel.author) === uid(req)); // comment author or reel owner
    if (!allowed) return res.status(403).json({ error: 'You cannot delete this comment' });
    await c.deleteOne();
    const upd = await Reel.findByIdAndUpdate(req.params.id, { $inc: { commentCount: -1 } }, { new: true }).select('commentCount');
    io.emit('reel:comment-deleted', { id: req.params.id, commentId: String(c._id), commentCount: Math.max(0, Number(upd?.commentCount ?? 0)) });
    res.json({ ok: true });
  });

  r.delete('/reels/:id', async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'Reel not found' });
    const reel = await Reel.findOne({ _id: req.params.id, author: uid(req) });
    if (!reel) return res.status(403).json({ error: 'You can only delete your own reels' });
    const url = (reel.video as any)?.url as string | undefined;
    await reel.deleteOne();
    await ReelComment.deleteMany({ reel: reel._id });
    io.emit('reel:deleted', { id: String(reel._id) });
    if (url) fs.promises.unlink(path.join(REEL_DIR, path.basename(url))).catch(() => {});
    res.json({ ok: true });
  });

  /* ---------- Profile ---------- */
  const PROFILE = 'username email verified displayName about avatar';
  const toProfile = (u: any) => ({ _id: u._id, username: u.username, email: u.email, verified: isVerified(u), displayName: u.displayName, about: u.about, avatar: u.avatar });
  const removeUpload = (url?: string | null) => { if (url) fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(url))).catch(() => {}); };
  const broadcastProfile = async (u: any) => { // tell everyone who shares a chat with this user
    const rooms = (await Conversation.find({ members: u._id }).select('_id')).map((c) => `conv:${c._id}`);
    if (rooms.length) io.to(rooms).emit('profile:updated', { _id: String(u._id), displayName: u.displayName, avatar: u.avatar });
  };

  r.patch('/profile', async (req, res) => {
    const b = z.object({ displayName: z.string().trim().max(40), about: z.string().trim().max(139) }).parse(req.body);
    const u = await User.findByIdAndUpdate(uid(req), { displayName: b.displayName, about: b.about }, { new: true }).select(PROFILE);
    if (!u) return res.status(404).json({ error: 'User not found' });
    await broadcastProfile(u);
    res.json(toProfile(u));
  });

  r.post('/profile/avatar', avatarUpload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Choose a PNG, JPG, WEBP or GIF image (max 5 MB)' });
    const old = await User.findById(uid(req)).select('avatar');
    const u = await User.findByIdAndUpdate(uid(req), { avatar: `/uploads/${req.file.filename}` }, { new: true }).select(PROFILE);
    removeUpload(old?.avatar);
    await broadcastProfile(u);
    res.json(toProfile(u));
  });

  r.delete('/profile/avatar', async (req, res) => {
    const old = await User.findById(uid(req)).select('avatar');
    const u = await User.findByIdAndUpdate(uid(req), { $unset: { avatar: 1 } }, { new: true }).select(PROFILE);
    removeUpload(old?.avatar);
    await broadcastProfile(u);
    res.json(toProfile(u));
  });

  r.get('/users', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    res.json(await User.find({ username: new RegExp(esc, 'i'), ...VERIFIED_QUERY, _id: { $ne: uid(req) } }).select(PUBLIC).limit(10));
  });

  r.get('/conversations', async (req, res) => {
    const me = uid(req);
    const convs = await Conversation.find({ members: me }).select('+reads').populate('members', PUBLIC).sort({ updatedAt: -1 }).lean();
    const out = await Promise.all(convs.map(async (c: any) => {
      const readAt = c.reads?.[me] || new Date(0);
      const unread = await Message.countDocuments({ conversation: c._id, sender: { $ne: me }, deleted: { $ne: true }, createdAt: { $gt: readAt } });
      const { reads, ...rest } = c;
      return { ...rest, unread };
    }));
    res.json(out);
  });

  r.post('/conversations/:id/read', async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'Not found' });
    await Conversation.updateOne({ _id: req.params.id, members: uid(req) }, { $set: { [`reads.${uid(req)}`]: new Date() } });
    res.json({ ok: true });
  });

  const announce = async (convId: string, memberIds: string[]) => {
    const conv = await Conversation.findById(convId).populate('members', PUBLIC);
    for (const m of memberIds) {
      io.in(`user:${m}`).socketsJoin(`conv:${convId}`);
      io.to(`user:${m}`).emit('conversation:new', conv);
    }
    return conv;
  };

  r.post('/conversations/direct', async (req, res) => {
    const { userId } = z.object({ userId: z.string() }).parse(req.body);
    const me = uid(req);
    if (!Types.ObjectId.isValid(userId) || userId === me || !(await User.exists({ _id: userId, ...VERIFIED_QUERY })))
      return res.status(404).json({ error: 'User not found or has not verified their email yet' });
    const directKey = [me, userId].sort().join('_');
    let conv = await Conversation.findOne({ directKey });
    if (!conv) conv = await Conversation.create({ type: 'direct', members: [me, userId], directKey });
    res.json(await announce(String(conv._id), [me, userId]));
  });

  r.post('/conversations/group', async (req, res) => {
    const b = z.object({ name: z.string().min(1).max(60), memberIds: z.array(z.string()).min(1) }).parse(req.body);
    const me = uid(req);
    const valid = (await User.find({ _id: { $in: b.memberIds.filter((id) => Types.ObjectId.isValid(id)) }, ...VERIFIED_QUERY }).select('_id')).map((u) => String(u._id));
    if (!valid.length) return res.status(400).json({ error: 'Pick at least one verified member' });
    const members = [...new Set([me, ...valid])];
    const conv = await Conversation.create({ type: 'group', name: b.name, members, admins: [me] });
    res.json(await announce(String(conv._id), members));
  });

  r.post('/conversations/:id/members', async (req, res) => {
    const { userIds } = z.object({ userIds: z.array(z.string()).min(1).max(100) }).parse(req.body);
    const conv = await Conversation.findOne({ _id: req.params.id, type: 'group', admins: uid(req) });
    if (!conv) return res.status(403).json({ error: 'Only group admins can add members' });

    const existing = conv.members.map(String);
    const candidates = userIds.filter((id) => Types.ObjectId.isValid(id) && !existing.includes(id));
    const fresh = (await User.find({ _id: { $in: candidates }, ...VERIFIED_QUERY }).select('_id')).map((u) => String(u._id));
    if (!fresh.length) return res.status(400).json({ error: 'Those users are already in the group' });

    const joined = Object.fromEntries(fresh.map((id) => [`reads.${id}`, new Date()])); // history before joining isn't "unread"
    await Conversation.updateOne({ _id: conv._id }, { $addToSet: { members: { $each: fresh } }, $set: joined });
    const updated = await Conversation.findById(conv._id).populate('members', PUBLIC);
    for (const id of fresh) {
      io.in(`user:${id}`).socketsJoin(`conv:${conv._id}`);
      io.to(`user:${id}`).emit('conversation:new', updated);
    }
    for (const id of existing) io.to(`user:${id}`).emit('conversation:updated', updated);
    res.json(updated);
  });

  r.get('/conversations/:id/messages', async (req, res) => {
    if (!(await Conversation.exists({ _id: req.params.id, members: uid(req) }))) return res.status(403).json({ error: 'Forbidden' });
    const filter: any = { conversation: req.params.id };
    if (req.query.before) filter.createdAt = { $lt: new Date(String(req.query.before)) };
    const msgs = await Message.find(filter).sort({ createdAt: -1 }).limit(30).populate('sender', PUBLIC);
    res.json(msgs.reverse());
  });

  r.post('/upload', upload.single('file'), (req, res) => {
    const f = req.file;
    if (!f) return res.status(400).json({ error: 'File missing or type not allowed' });
    res.json({ url: `/uploads/${f.filename}`, name: f.originalname, mime: f.mimetype, size: f.size });
  });

  const unlinkFiles = (msgs: any[]) => {
    for (const m of msgs) for (const a of m.attachments || []) {
      if (a.url) fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(a.url))).catch(() => {});
    }
  };
  const wipeConversation = async (id: any) => {
    unlinkFiles(await Message.find({ conversation: id }).select('attachments'));
    await Message.deleteMany({ conversation: id });
    await Conversation.deleteOne({ _id: id });
  };

  r.post('/conversations/:id/leave', async (req, res) => {
    const me = uid(req);
    const conv = await Conversation.findOne({ _id: req.params.id, type: 'group', members: me });
    if (!conv) return res.status(404).json({ error: 'Group not found' });
    const remaining = conv.members.map(String).filter((id) => id !== me);
    io.to(`user:${me}`).emit('conversation:removed', { id: String(conv._id) });
    io.in(`user:${me}`).socketsLeave(`conv:${conv._id}`);
    if (!remaining.length) { await wipeConversation(conv._id); return res.json({ ok: true }); }
    let admins = conv.admins.map(String).filter((id) => id !== me);
    if (!admins.length) admins = [remaining[0]]; // hand over admin rights so the group is never orphaned
    await Conversation.updateOne({ _id: conv._id }, { members: remaining, admins });
    const updated = await Conversation.findById(conv._id).populate('members', PUBLIC);
    for (const id of remaining) io.to(`user:${id}`).emit('conversation:updated', updated);
    res.json({ ok: true });
  });

  r.delete('/conversations/:id', async (req, res) => {
    const conv = await Conversation.findOne({ _id: req.params.id, type: 'group', admins: uid(req) });
    if (!conv) return res.status(403).json({ error: 'Only group admins can delete a group' });
    await wipeConversation(conv._id);
    for (const id of conv.members.map(String)) {
      io.to(`user:${id}`).emit('conversation:removed', { id: String(conv._id) });
      io.in(`user:${id}`).socketsLeave(`conv:${conv._id}`);
    }
    res.json({ ok: true });
  });

  r.delete('/messages/:id', async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'Message not found' });
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    const conv = await Conversation.findOne({ _id: msg.conversation, members: uid(req) });
    if (!conv) return res.status(403).json({ error: 'Forbidden' });
    const isAdmin = conv.type === 'group' && conv.admins.map(String).includes(uid(req));
    if (String(msg.sender) !== uid(req) && !isAdmin) return res.status(403).json({ error: 'You can only delete your own messages' });
    if (msg.deleted) return res.json({ ok: true });

    unlinkFiles([msg]);
    await Message.updateOne({ _id: msg._id }, { deleted: true, text: '', attachments: [] });
    const latest = await Message.findOne({ conversation: conv._id }).sort({ createdAt: -1 }).select('_id');
    if (latest && String(latest._id) === String(msg._id)) {
      await Conversation.updateOne({ _id: conv._id }, { 'lastMessage.text': 'This message was deleted' });
      const updated = await Conversation.findById(conv._id).populate('members', PUBLIC);
      io.to(`conv:${conv._id}`).emit('conversation:updated', updated);
    }
    io.to(`conv:${conv._id}`).emit('message:deleted', { id: String(msg._id), conversation: String(conv._id) });
    res.json({ ok: true });
  });

  return r;
}
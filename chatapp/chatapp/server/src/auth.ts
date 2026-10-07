import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { config } from './config';
import { User } from './models';
import { sendOtpMail } from './mail';

export interface AuthReq extends Request { userId: string }

export const signToken = (id: string) => jwt.sign({ id }, config.jwtSecret, { expiresIn: '7d' });
export const verifyToken = (t: string) => (jwt.verify(t, config.jwtSecret) as { id: string }).id;

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const h = req.headers.authorization || '';
    (req as AuthReq).userId = verifyToken(h.replace('Bearer ', ''));
    next();
  } catch { res.status(401).json({ error: 'Unauthorized' }); }
}

// "Verified" means: explicitly verified AND has an email. Accounts with no email are never verified.
export const isVerified = (u: any) => u?.verified === true && !!u?.email;
export const VERIFIED_QUERY = { verified: true, email: { $exists: true } };

// Chat access = valid token AND verified email. A logged-in but unverified user gets 403 here.
export async function requireVerified(req: Request, res: Response, next: NextFunction) {
  const u = await User.findById((req as AuthReq).userId).select('verified email');
  if (!u) return res.status(401).json({ error: 'Unauthorized' });
  if (!isVerified(u)) return res.status(403).json({ error: 'Please verify your email to use chat', code: 'EMAIL_NOT_VERIFIED' });
  next();
}

const creds = z.object({ username: z.string().min(3).max(30), password: z.string().min(6).max(100) });
const emailField = z.string().trim().toLowerCase().email();
export const authRouter = Router();

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const hashOtp = (otp: string) => crypto.createHmac('sha256', config.jwtSecret).update(otp).digest('hex');
const session = (u: any) => ({ token: signToken(String(u._id)), user: { _id: u._id, username: u.username, email: u.email, verified: isVerified(u), displayName: u.displayName, about: u.about, avatar: u.avatar } });

async function issueOtp(user: any) {
  const otp = String(crypto.randomInt(100000, 1000000));
  user.otpHash = hashOtp(otp);            // only a hash is stored, never the code itself
  user.otpExpires = new Date(Date.now() + OTP_TTL_MS);
  user.otpAttempts = 0;
  user.otpSentAt = new Date();
  await user.save();
  await sendOtpMail(user.email, otp);
}

authRouter.post('/register', async (req, res) => {
  const p = creds.extend({ email: emailField }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Enter a valid email, a username of 3+ characters and a password of 6+ characters' });
  const { username, email, password } = p.data;
  const match = { $or: [{ username }, { email }] };
  if (await User.exists({ ...match, verified: { $ne: false } })) return res.status(409).json({ error: 'Username or email already in use' });
  await User.deleteMany({ ...match, verified: false }); // abandoned, never-verified signups don't block the name
  const user = await User.create({ username, email, passwordHash: await bcrypt.hash(password, 10), verified: false });
  try { await issueOtp(user); }
  catch (e) { console.error(e); return res.status(502).json({ error: 'Could not send the verification email. Please try again.' }); }
  res.json({ needsVerification: true, email });
});

authRouter.post('/verify-otp', async (req, res) => {
  const p = z.object({ email: emailField, otp: z.string().regex(/^\d{6}$/) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Enter the 6-digit code' });
  const user = await User.findOne({ email: p.data.email, verified: { $ne: true } });
  if (!user || !user.otpHash || !user.otpExpires) return res.status(400).json({ error: 'Invalid or expired code' });
  if (user.otpExpires < new Date()) return res.status(400).json({ error: 'Code expired. Request a new one.' });
  if ((user.otpAttempts || 0) >= MAX_ATTEMPTS) return res.status(429).json({ error: 'Too many wrong attempts. Request a new code.' });
  const ok = crypto.timingSafeEqual(Buffer.from(hashOtp(p.data.otp)), Buffer.from(user.otpHash));
  if (!ok) {
    await User.updateOne({ _id: user._id }, { $inc: { otpAttempts: 1 } });
    return res.status(400).json({ error: 'Incorrect code' });
  }
  await User.updateOne({ _id: user._id }, { verified: true, $unset: { otpHash: 1, otpExpires: 1, otpSentAt: 1, otpAttempts: 1 } });
  user.verified = true; // the copy in memory is stale; the DB was updated just above
  res.json(session(user));
});

authRouter.post('/resend-otp', async (req, res) => {
  const p = z.object({ email: emailField }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid email' });
  const user = await User.findOne({ email: p.data.email, verified: { $ne: true } });
  if (user) {
    const wait = RESEND_COOLDOWN_MS - (Date.now() - (user.otpSentAt?.getTime() || 0));
    if (wait > 0) return res.status(429).json({ error: `Please wait ${Math.ceil(wait / 1000)}s before requesting another code` });
    try { await issueOtp(user); }
    catch (e) { console.error(e); return res.status(502).json({ error: 'Could not send the email. Please try again.' }); }
  }
  res.json({ ok: true }); // same answer for unknown emails so this can't be used to probe accounts
});

authRouter.post('/login', async (req, res) => {
  const p = creds.safeParse(req.body);
  const u = p.success && await User.findOne({ username: p.data.username });
  if (!u || !(await bcrypt.compare(p.data.password, u.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' });
  if (!isVerified(u) && u.email) { // unverified accounts may log in, but chat stays locked
    const recentlySent = Date.now() - (u.otpSentAt?.getTime() || 0) < RESEND_COOLDOWN_MS;
    if (!recentlySent) { try { await issueOtp(u); } catch (e) { console.error(e); } }
  }
  res.json(session(u));
});

// Lets the client learn its current verified status (allowed even when unverified)
authRouter.get('/me', requireAuth, async (req, res) => {
  const u = await User.findById((req as AuthReq).userId).select('username email verified displayName about avatar');
  if (!u) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ _id: u._id, username: u.username, email: u.email, verified: isVerified(u), displayName: u.displayName, about: u.about, avatar: u.avatar });
});

// For accounts with no email (e.g. created before OTP existed): attach an email and send a code.
authRouter.post('/add-email', requireAuth, async (req, res) => {
  const p = z.object({ email: emailField }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Enter a valid email address' });
  const { email } = p.data;
  const user = await User.findById((req as AuthReq).userId);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (isVerified(user)) return res.status(400).json({ error: 'Your account is already verified' });
  if (user.email === email && Date.now() - (user.otpSentAt?.getTime() || 0) < RESEND_COOLDOWN_MS)
    return res.status(429).json({ error: 'A code was just sent. Please wait a minute before requesting another.' });

  await User.deleteMany({ email, verified: false, _id: { $ne: user._id } }); // abandoned signup holding this email
  if (await User.exists({ email, _id: { $ne: user._id } })) return res.status(409).json({ error: 'That email is already used by another account' });

  user.set('verified', undefined); // back to "not verified" until the code is confirmed
  user.email = email;
  try { await issueOtp(user); }
  catch (e) { console.error(e); return res.status(502).json({ error: 'Could not send the email. Please try again.' }); }
  res.json({ email });
});
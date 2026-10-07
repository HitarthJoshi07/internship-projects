import { Schema, model, Types } from 'mongoose';

const userSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  passwordHash: { type: String, required: true },
  email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
  displayName: { type: String, trim: true, maxlength: 40 },
  about: { type: String, trim: true, maxlength: 139 },
  avatar: String, // /uploads/<file>
  verified: Boolean, // no default on purpose: accounts created before OTP existed count as verified
  otpHash: String,
  otpExpires: Date,
  otpAttempts: Number,
  otpSentAt: Date,
}, { timestamps: true });

const conversationSchema = new Schema({
  type: { type: String, enum: ['direct', 'group'], required: true },
  name: String,
  members: [{ type: Types.ObjectId, ref: 'User', index: true }],
  admins: [{ type: Types.ObjectId, ref: 'User' }],
  directKey: { type: String, unique: true, sparse: true }, // "idA_idB" sorted -> one DM per pair
  reads: { type: Map, of: Date, select: false }, // userId -> when they last opened this chat
  lastMessage: { text: String, at: Date, sender: { type: Types.ObjectId, ref: 'User' } },
}, { timestamps: true });

const messageSchema = new Schema({
  conversation: { type: Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '', maxlength: 5000 },
  deleted: { type: Boolean, default: false },
  attachments: [{ url: String, name: String, mime: String, size: Number }],
}, { timestamps: true });
messageSchema.index({ conversation: 1, createdAt: -1 });

const reelSchema = new Schema({
  author: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  caption: { type: String, default: '', maxlength: 200 },
  video: { url: String, mime: String, size: Number },
  likes: [{ type: Types.ObjectId, ref: 'User' }], // fine for an MVP; move to a separate collection at large scale
  likeCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  shareCount: { type: Number, default: 0 },
}, { timestamps: true });
reelSchema.index({ createdAt: -1 });

export const User = model('User', userSchema);
const reelCommentSchema = new Schema({
  reel: { type: Types.ObjectId, ref: 'Reel', required: true },
  author: { type: Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 300 },
}, { timestamps: true });
reelCommentSchema.index({ reel: 1, createdAt: -1 });

export const Reel = model('Reel', reelSchema);
export const ReelComment = model('ReelComment', reelCommentSchema);
export const Conversation = model('Conversation', conversationSchema);
export const Message = model('Message', messageSchema);
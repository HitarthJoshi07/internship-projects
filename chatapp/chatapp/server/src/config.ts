import 'dotenv/config';
export const config = {
  port: Number(process.env.PORT || 4000),
  mongo: process.env.MONGO_URI || 'mongodb://localhost:27017/chatapp',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  maxFileMB: 10,
  maxReelMB: 50, // max size of one reel video (also set MAX_MB in client/src/Reels.tsx)
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || process.env.SMTP_USER || 'ChatApp <no-reply@chatapp.local>',
  },
};
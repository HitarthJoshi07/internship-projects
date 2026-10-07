import 'express-async-errors';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { config } from './config';
import { authRouter } from './auth';
import { apiRouter, UPLOAD_DIR } from './routes';
import { setupSocket } from './socket';

async function main() {
  await mongoose.connect(config.mongo);
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: config.clientOrigin } });

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: '100kb' }));
  // nosniff + attachment for non-images so uploaded files can't run in the browser
  app.use('/uploads', express.static(UPLOAD_DIR, {
    setHeaders: (res, p) => { if (!/\.(png|jpe?g|gif|webp|mp4|webm|mov)$/i.test(p)) res.setHeader('Content-Disposition', 'attachment'); },
  }));
  app.use('/api/auth', authRouter);
  app.use('/api', apiRouter(io));
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error(err);
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File is too large' });
    res.status(err.name === 'ZodError' ? 400 : 500).json({ error: err.message || 'Server error' });
  });

  setupSocket(io);
  server.listen(config.port, () => console.log(`API on :${config.port}`));
}
main();
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { transporter } = require('./utils/mailer');

const app = express();
connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('/api/health', async (req, res) => {
  try {
    await transporter.verify();
    res.json({ ok: true, smtp: 'connected' });
  } catch (error) {
    console.error('SMTP health check failed:', error.message);
    res.status(503).json({ ok: false, smtp: 'unavailable', message: error.message });
  }
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/mail', require('./routes/mail'));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err instanceof require('multer').MulterError ? 400 : 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '../client/dist/index.html'), err => {
    if (err) next();
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`));

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is already in use. Stop the existing server or run with another port, for example: $env:PORT=5001; npm run dev`,
    );
    process.exitCode = 1;
    return;
  }

  console.error('Server failed to start:', error);
  process.exitCode = 1;
});

const router = require('express').Router();
const multer = require('multer');
const Papa = require('papaparse');
const auth = require('../middleware/auth');
const { sendBulk } = require('../utils/mailer');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_, file, cb) =>
    file.originalname.endsWith('.csv')
      ? cb(null, true) : cb(new Error('Only CSV files allowed')),
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Send bulk mail (manual list + optional CSV)
router.post('/send', auth, upload.single('csvfile'), async (req, res) => {
  try {
    const { subject, html, manualEmails } = req.body;
    if (!subject || !html)
      return res.status(400).json({ message: 'Subject and body required' });

    let recipients = [];

    // Manual emails (comma / newline separated)
    if (manualEmails) {
      manualEmails.split(/[\n,;]+/).map(e => e.trim())
        .filter(email => emailPattern.test(email))
        .forEach(e => recipients.push({ email: e }));
    }

    // CSV upload: expects columns email,name (name optional)
    if (req.file) {
      const parsed = Papa.parse(req.file.buffer.toString(), {
        header: true, skipEmptyLines: true,
      });
      parsed.data.forEach(row => {
        const email = (row.email || row.Email || '').trim();
        if (email && emailPattern.test(email)) {
          recipients.push({ email, name: row.name || row.Name || '' });
        }
      });
    }

    // De-duplicate
    const seen = new Set();
    recipients = recipients.filter(r =>
      seen.has(r.email.toLowerCase()) ? false :
        (seen.add(r.email.toLowerCase()), true));

    if (!recipients.length)
      return res.status(400).json({ message: 'No valid recipients found' });

    const results = await sendBulk(recipients, subject, html);
    res.json({
      message: `Sent ${results.sent.length}, failed ${results.failed.length}`,
      ...results,
    });
  } catch (e) {
    console.error('Bulk mail send failed:', e);
    res.status(500).json({ message: e.message || 'Unable to send email' });
  }
});

module.exports = router;

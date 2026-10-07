const router = require('express').Router();
const Template = require('../models/Template');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    res.json(await Template.find({ user: req.user.id }).sort({ createdAt: -1 }));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, subject, html } = req.body;
    if (!name || !subject || !html)
      return res.status(400).json({ message: 'name, subject, html required' });
    res.status(201).json(
      await Template.create({ user: req.user.id, name, subject, html }));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Template.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!deleted) return res.status(404).json({ message: 'Template not found' });
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(400).json({ message: 'Invalid template id' });
  }
});

module.exports = router;

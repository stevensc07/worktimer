const express = require('express');
const authRoutes = require('./authRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const activityRoutes = require('./activityRoutes');
const metricsRoutes = require('./metricsRoutes');
const taskRoutes = require('./taskRoutes');
const userRoutes = require('./userRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({ ok: true, message: 'API operativa' });
});

router.use('/auth', authRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/activities', activityRoutes);
router.use('/metrics', metricsRoutes);
router.use('/tasks', taskRoutes);
router.use('/users', userRoutes);

module.exports = router;

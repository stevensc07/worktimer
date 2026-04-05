const express = require('express');
const {
  getHoursMetrics,
  getWorkersOverview,
  getActiveLocations
} = require('../controllers/metricsController');
const { authRequired, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/hours', authRequired, authorizeRoles('OBRERO', 'SUPERVISOR'), getHoursMetrics);
router.get('/workers-overview', authRequired, authorizeRoles('SUPERVISOR'), getWorkersOverview);
router.get('/active-locations', authRequired, authorizeRoles('SUPERVISOR'), getActiveLocations);

module.exports = router;

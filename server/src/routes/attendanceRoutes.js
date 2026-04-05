const express = require('express');
const {
  checkIn,
  checkOut,
  getMyCurrentSession
} = require('../controllers/attendanceController');
const { authRequired, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authRequired);
router.get('/current', getMyCurrentSession);
router.post('/check-in', authorizeRoles('OBRERO', 'SUPERVISOR'), checkIn);
router.post('/check-out', authorizeRoles('OBRERO', 'SUPERVISOR'), checkOut);

module.exports = router;

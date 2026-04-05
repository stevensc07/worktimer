const express = require('express');
const { listWorkers } = require('../controllers/userController');
const { authRequired, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/workers', authRequired, authorizeRoles('SUPERVISOR'), listWorkers);

module.exports = router;

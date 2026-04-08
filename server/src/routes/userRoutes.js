const express = require('express');
const { listWorkers, createUser } = require('../controllers/userController');
const { authRequired, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/workers', authRequired, authorizeRoles('SUPERVISOR'), listWorkers);
router.post('/', authRequired, authorizeRoles('SUPERVISOR'), createUser);

module.exports = router;

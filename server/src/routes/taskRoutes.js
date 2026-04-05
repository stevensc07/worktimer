const express = require('express');
const { createTask, listMyTasks, updateTaskStatus } = require('../controllers/taskController');
const { authRequired, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authRequired);
router.post('/', authorizeRoles('OBRERO', 'SUPERVISOR'), createTask);
router.get('/me', authorizeRoles('OBRERO', 'SUPERVISOR'), listMyTasks);
router.patch('/:id/status', authorizeRoles('OBRERO', 'SUPERVISOR'), updateTaskStatus);

module.exports = router;

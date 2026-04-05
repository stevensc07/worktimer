const express = require('express');
const multer = require('multer');
const { authRequired, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadActivityPhoto } = require('../controllers/activityController');

const router = express.Router();

const upload = multer({
  // memoryStorage permite enviar el buffer directo al servicio de Drive sin archivo temporal.
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

router.post(
  '/upload-activity-photo',
  authRequired,
  authorizeRoles('OBRERO', 'SUPERVISOR'),
  upload.single('photo'),
  uploadActivityPhoto
);

module.exports = router;

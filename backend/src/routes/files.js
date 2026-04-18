const express = require('express');
const multer = require('multer');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { upload, download, createLink } = require('../controllers/file.controller');

// Configure multer for memory storage (files < 50MB)
const uploadMiddleware = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Protected routes (require JWT auth)
router.post('/upload', verifyToken, uploadMiddleware.single('file'), upload);
router.get('/:id/download', verifyToken, download);
router.post('/:id/link', verifyToken, createLink);

module.exports = router;
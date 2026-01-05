const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  submitScreening,
  getScreeningHistory,
  getLatestScreening,
} = require('../controllers/screeningController');

// All screening routes require authentication
router.post('/submit', authMiddleware, submitScreening);
router.get('/history', authMiddleware, getScreeningHistory);
router.get('/latest', authMiddleware, getLatestScreening);

module.exports = router;

// FILE 3: backend/src/routes/volunteerRoutes.js
// ============================================================================

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  getStats,
  getChatHistory,
  getChatTranscript,
  skipChatRequest,
  addChatNotes,
  updateChatStats,
} = require('../controllers/volunteerController');

// All routes require authentication
router.use(authMiddleware);

// Profile Management
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Stats & Analytics
router.get('/stats', getStats);

// Chat History
router.get('/chat-history', getChatHistory);
router.get('/chat-history/:chatSessionId/transcript', getChatTranscript);
router.post('/chat-history/:chatSessionId/notes', addChatNotes);

// Chat Actions
router.post('/chat/skip', skipChatRequest);
router.post('/chat/stats/update', updateChatStats);

module.exports = router;


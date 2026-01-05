const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const ChatSession = require('../models/ChatSession');

// GET CHAT HISTORY FOR STUDENT
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await ChatSession.find({ studentId: userId })
      .populate('volunteerId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Chat history retrieved',
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET SPECIFIC CHAT SESSION
router.get('/session/:sessionId', authMiddleware, async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.sessionId)
      .populate('studentId', 'name email')
      .populate('volunteerId', 'name email');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.status(200).json({
      message: 'Chat session retrieved',
      session,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET VOLUNTEER'S CHAT SESSIONS
router.get('/volunteer/sessions', authMiddleware, async (req, res) => {
  try {
    const volunteerId = req.user.id;

    const sessions = await ChatSession.find({ volunteerId })
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Volunteer chat sessions retrieved',
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

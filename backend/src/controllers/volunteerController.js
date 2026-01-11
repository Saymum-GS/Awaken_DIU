// FILE 2: backend/src/controllers/volunteerController.js
// ============================================================================

const Volunteer = require('../models/Volunteer');
const ChatSession = require('../models/ChatSession');
const User = require('../models/User');

// ✅ CREATE OR GET VOLUNTEER PROFILE
exports.getProfile = async (req, res) => {
  try {
    const volunteerId = req.user.id;

    let volunteer = await Volunteer.findOne({ userId: volunteerId }).populate(
      'userId',
      'name email'
    );

    if (!volunteer) {
      // Create new volunteer profile
      volunteer = new Volunteer({
        userId: volunteerId,
      });
      await volunteer.save();
    }

    res.status(200).json({
      message: 'Volunteer profile retrieved',
      volunteer,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ UPDATE VOLUNTEER PROFILE
exports.updateProfile = async (req, res) => {
  try {
    const volunteerId = req.user.id;
    const { specialization, bio, phone, availabilityHours, workingDays } =
      req.body;

    const volunteer = await Volunteer.findOneAndUpdate(
      { userId: volunteerId },
      {
        specialization,
        bio,
        phone,
        availabilityHours,
        workingDays,
      },
      { new: true }
    );

    res.status(200).json({
      message: 'Volunteer profile updated',
      volunteer,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ GET VOLUNTEER STATS
exports.getStats = async (req, res) => {
  try {
    const volunteerId = req.user.id;

    const volunteer = await Volunteer.findOne({ userId: volunteerId });

    if (!volunteer) {
      return res.status(404).json({ error: 'Volunteer profile not found' });
    }

    res.status(200).json({
      message: 'Volunteer stats retrieved',
      stats: {
        totalChats: volunteer.totalChatsHandled,
        todayChats: volunteer.todaysChats,
        avgDuration: volunteer.avgChatDuration,
        escalations: volunteer.totalEscalations,
        avgRating: volunteer.avgRating,
        isOnline: volunteer.isOnline,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ GET CHAT HISTORY
exports.getChatHistory = async (req, res) => {
  try {
    const volunteerId = req.user.id;
    const limit = req.query.limit || 20;

    const chatHistory = await ChatSession.find({ volunteerId })
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      message: 'Chat history retrieved',
      count: chatHistory.length,
      chatHistory,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ GET SPECIFIC CHAT TRANSCRIPT
exports.getChatTranscript = async (req, res) => {
  try {
    const { chatSessionId } = req.params;

    const chatSession = await ChatSession.findById(chatSessionId)
      .populate('studentId', 'name email')
      .populate('volunteerId', 'name email');

    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.status(200).json({
      message: 'Chat transcript retrieved',
      session: chatSession,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ DECLINE/SKIP CHAT REQUEST
exports.skipChatRequest = async (req, res) => {
  try {
    const { sessionId } = req.body;

    // Update chat session to mark as skipped
    const chatSession = await ChatSession.findByIdAndUpdate(
      sessionId,
      { status: 'skipped' },
      { new: true }
    );

    res.status(200).json({
      message: 'Chat request skipped',
      chatSession,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ ADD VOLUNTEER NOTES TO CHAT
exports.addChatNotes = async (req, res) => {
  try {
    const { chatSessionId } = req.params;
    const { notes } = req.body;

    const chatSession = await ChatSession.findByIdAndUpdate(
      chatSessionId,
      { volunteerNotes: notes },
      { new: true }
    );

    res.status(200).json({
      message: 'Chat notes saved',
      chatSession,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ UPDATE VOLUNTEER STATS AFTER CHAT ENDS
exports.updateChatStats = async (req, res) => {
  try {
    const volunteerId = req.user.id;
    const { duration, escalated } = req.body;

    const volunteer = await Volunteer.findOneAndUpdate(
      { userId: volunteerId },
      {
        $inc: {
          totalChatsHandled: 1,
          todaysChats: 1,
          totalEscalations: escalated ? 1 : 0,
        },
      },
      { new: true }
    );

    // Update average duration
    if (volunteer.avgChatDuration === 0) {
      volunteer.avgChatDuration = duration;
    } else {
      volunteer.avgChatDuration =
        (volunteer.avgChatDuration + duration) / 2;
    }

    await volunteer.save();

    res.status(200).json({
      message: 'Chat stats updated',
      stats: {
        totalChats: volunteer.totalChatsHandled,
        todayChats: volunteer.todaysChats,
        avgDuration: volunteer.avgChatDuration,
        escalations: volunteer.totalEscalations,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    screeningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Screening',
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
    status: {
      type: String,
      enum: ['waiting', 'active', 'ended', 'escalated'],
      default: 'waiting',
    },
    messages: [
      {
        sender: {
          type: String,
          enum: ['student', 'volunteer'],
        },
        senderName: String,
        text: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    escalated: Boolean,
    escalationReason: String,
    volunteerNotes: String,
    startTime: Date,
    endTime: Date,
    duration: Number, // in seconds
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

module.exports = ChatSession;   

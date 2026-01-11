// FILE 1: backend/src/models/Volunteer.js
// ============================================================================

const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    specialization: {
      type: String,
      enum: ['Depression', 'Anxiety', 'Stress', 'Relationships', 'General'],
      default: 'General',
    },
    bio: String,
    phone: String,
    totalChatsHandled: {
      type: Number,
      default: 0,
    },
    todaysChats: {
      type: Number,
      default: 0,
    },
    totalEscalations: {
      type: Number,
      default: 0,
    },
    avgChatDuration: {
      type: Number, // in minutes
      default: 0,
    },
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    availabilityHours: {
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '21:00' },
    },
    workingDays: {
      type: [Number], // 0=Sunday to 6=Saturday
      default: [0, 1, 2, 3, 4, 5, 6],
    },
    chatHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatSession',
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Reset daily chats at midnight
volunteerSchema.pre('save', function (next) {
  const now = new Date();
  const lastUpdate = this.updatedAt;

  if (lastUpdate && now.getDate() !== lastUpdate.getDate()) {
    this.todaysChats = 0;
  }

  next();
});

module.exports = mongoose.model('Volunteer', volunteerSchema);

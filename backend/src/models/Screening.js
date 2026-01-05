const mongoose = require('mongoose');

const screeningSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    phq9: {
      answers: [
        {
          type: Number,
          min: 0,
          max: 3,
        },
      ], // 9 items, each 0-3
      score: Number,
      severity: {
        type: String,
        enum: ['minimal', 'mild', 'moderate', 'severe'],
      },
    },
    gad7: {
      answers: [
        {
          type: Number,
          min: 0,
          max: 3,
        },
      ], // 7 items, each 0-3
      score: Number,
      severity: {
        type: String,
        enum: ['minimal', 'mild', 'moderate', 'severe'],
      },
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    suicidalIdeation: Boolean, // PHQ-9 item 9
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Screening = mongoose.model('Screening', screeningSchema);

module.exports = Screening;

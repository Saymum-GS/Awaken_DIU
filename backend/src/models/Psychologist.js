const mongoose = require('mongoose');

const psychologistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    specialization: {
      type: String,
      enum: ['Depression', 'Anxiety', 'Suicidal Ideation', 'Stress', 'General'],
      default: 'General',
    },
    bio: String,
    phone: String,
    consultationFee: {
      type: Number,
      default: 500, // BDT
    },
    maxAppointmentsPerDay: {
      type: Number,
      default: 5,
    },
    workingDays: {
      type: [Number], // 0=Sunday, 6=Saturday (Bangladesh week)
      default: [0, 1, 2, 3, 4], // Sunday to Thursday
    },
    workingHours: {
      startTime: {
        type: String,
        default: '10:00', // HH:MM format
      },
      endTime: {
        type: String,
        default: '18:00',
      },
    },
    appointmentDuration: {
      type: Number,
      default: 30, // minutes
    },
    status: {
      type: String,
      enum: ['available', 'busy', 'offline'],
      default: 'offline',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Psychologist = mongoose.model('Psychologist', psychologistSchema);

module.exports = Psychologist;

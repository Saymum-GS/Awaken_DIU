const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getAvailablePsychologists,
  getAvailableSlots,
  bookAppointment,
  confirmAppointment,
  cancelAppointment,
  getStudentAppointments,
  getPsychologistSchedule,
  completeAppointment,
} = require('../controllers/bookingController');

// Public: Get available psychologists
router.get('/psychologists/available', getAvailablePsychologists);

// Public: Get available time slots
router.get('/slots/available', getAvailableSlots);

// Student: Book appointment
router.post('/book', authMiddleware, bookAppointment);

// Student: Get own appointments
router.get('/my-appointments', authMiddleware, getStudentAppointments);

// Student: Cancel appointment
router.put('/:appointmentId/cancel', authMiddleware, cancelAppointment);

// Psychologist: Confirm appointment
router.put('/:appointmentId/confirm', authMiddleware, confirmAppointment);

// Psychologist: Get schedule
router.get('/schedule/my-schedule', authMiddleware, getPsychologistSchedule);

// Psychologist: Mark appointment as completed
router.put('/:appointmentId/complete', authMiddleware, completeAppointment);

module.exports = router;

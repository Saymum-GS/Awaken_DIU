const Appointment = require('../models/Appointment');
const Psychologist = require('../models/Psychologist');

// Helper: Check if a time slot is available
const isSlotAvailable = async (psychologistId, appointmentDate, startTime, endTime) => {
  const conflicts = await Appointment.findOne({
    psychologistId,
    appointmentDate: {
      $gte: new Date(appointmentDate).setHours(0, 0, 0, 0),
      $lt: new Date(appointmentDate).setHours(23, 59, 59, 999),
    },
    status: { $ne: 'cancelled' },
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
      },
    ],
  });

  return !conflicts;
};

// Helper: Generate available time slots for a day
const generateTimeSlots = async (psychologistId, date) => {
  const psychologist = await Psychologist.findById(psychologistId);
  if (!psychologist) return [];

  const dayOfWeek = new Date(date).getDay();

  // Check if it's a working day
  if (!psychologist.workingDays.includes(dayOfWeek)) {
    return [];
  }

  const slots = [];
  const [startHour, startMin] = psychologist.workingHours.startTime.split(':').map(Number);
  const [endHour, endMin] = psychologist.workingHours.endTime.split(':').map(Number);
  const duration = psychologist.appointmentDuration;

  let currentHour = startHour;
  let currentMin = startMin;

  const endTotalMin = endHour * 60 + endMin;

  while (currentHour * 60 + currentMin + duration <= endTotalMin) {
    const startTime = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
    const slotEndMin = currentHour * 60 + currentMin + duration;
    const endTime = `${String(Math.floor(slotEndMin / 60)).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`;

    // Check if slot is available
    const available = await isSlotAvailable(psychologistId, date, startTime, endTime);

    slots.push({
      startTime,
      endTime,
      available,
    });

    currentMin += duration;
    if (currentMin >= 60) {
      currentHour += Math.floor(currentMin / 60);
      currentMin = currentMin % 60;
    }
  }

  return slots;
};

// ✅ 1. GET AVAILABLE PSYCHOLOGISTS
exports.getAvailablePsychologists = async (req, res) => {
  try {
    const psychologists = await Psychologist.find({ status: 'available' })
      .populate('userId', 'name email')
      .select('userId specialization bio consultationFee workingHours');

    res.status(200).json({
      message: 'Available psychologists retrieved',
      count: psychologists.length,
      psychologists,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ 2. GET AVAILABLE SLOTS FOR A PSYCHOLOGIST
exports.getAvailableSlots = async (req, res) => {
  try {
    const { psychologistId, date } = req.query;

    if (!psychologistId || !date) {
      return res.status(400).json({ error: 'psychologistId and date required' });
    }

    const slots = await generateTimeSlots(psychologistId, new Date(date));

    res.status(200).json({
      message: 'Available slots retrieved',
      date,
      psychologistId,
      slots,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ 3. BOOK APPOINTMENT
exports.bookAppointment = async (req, res) => {
  try {
    const { psychologistId, appointmentDate, startTime, endTime, notes } = req.body;
    const studentId = req.user.id;

    // Validation
    if (!psychologistId || !appointmentDate || !startTime || !endTime) {
      return res.status(400).json({ error: 'All booking fields required' });
    }

    // Check if psychologist exists
    const psychologist = await Psychologist.findById(psychologistId);
    if (!psychologist) {
      return res.status(404).json({ error: 'Psychologist not found' });
    }

    // Check if slot is available
    const available = await isSlotAvailable(psychologistId, appointmentDate, startTime, endTime);
    if (!available) {
      return res.status(400).json({ error: 'Time slot not available' });
    }

    // Create appointment
    const appointment = new Appointment({
      studentId,
      psychologistId,
      appointmentDate: new Date(appointmentDate),
      startTime,
      endTime,
      notes,
      consultationFee: psychologist.consultationFee,
    });

    await appointment.save();

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: {
        id: appointment._id,
        date: appointment.appointmentDate,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        psychologist: psychologist.userId,
        status: appointment.status,
        fee: appointment.consultationFee,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ 4. CONFIRM APPOINTMENT (Psychologist)
exports.confirmAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status: 'confirmed' },
      { new: true }
    ).populate('studentId', 'name email');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.status(200).json({
      message: 'Appointment confirmed',
      appointment,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ 5. CANCEL APPOINTMENT
exports.cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status: 'cancelled', notes: reason || appointment.notes },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.status(200).json({
      message: 'Appointment cancelled',
      appointment,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ 6. GET STUDENT'S APPOINTMENTS
exports.getStudentAppointments = async (req, res) => {
  try {
    const studentId = req.user.id;

    const appointments = await Appointment.find({ studentId })
      .populate('psychologistId')
      .sort({ appointmentDate: -1 });

    res.status(200).json({
      message: 'Student appointments retrieved',
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ 7. GET PSYCHOLOGIST'S SCHEDULE
exports.getPsychologistSchedule = async (req, res) => {
  try {
    const psychologistId = req.user.psychologistId || req.query.psychologistId;

    const appointments = await Appointment.find({
      psychologistId,
      status: { $ne: 'cancelled' },
    })
      .populate('studentId', 'name email')
      .sort({ appointmentDate: 1 });

    res.status(200).json({
      message: 'Psychologist schedule retrieved',
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ 8. COMPLETE APPOINTMENT (Mark as done)
exports.completeAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { psychologistNotes } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        status: 'completed',
        psychologistNotes,
        paymentStatus: 'paid',
      },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.status(200).json({
      message: 'Appointment completed',
      appointment,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

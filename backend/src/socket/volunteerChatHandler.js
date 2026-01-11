// FILE 4: backend/src/socket/volunteerChatHandler.js
// ============================================================================

const ChatSession = require('../models/ChatSession');
const Volunteer = require('../models/Volunteer');

const activeVolunteers = new Map(); // volunteerId -> { socketId, name, busy }
const waitingQueue = []; // Array of waiting students

// VOLUNTEER EVENTS
const setupVolunteerHandlers = (io, socket) => {
  // ✅ VOLUNTEER GOES ONLINE
  socket.on('volunteer-online', async (data) => {
    try {
      const { volunteerId, name } = data;

      activeVolunteers.set(volunteerId, {
        socketId: socket.id,
        name,
        busy: false,
        onlineSince: new Date(),
      });

      // Update database
      await Volunteer.findOneAndUpdate(
        { userId: volunteerId },
        { isOnline: true }
      );

      socket.join(`volunteer-${volunteerId}`);
      console.log(`🟢 Volunteer online: ${name}`);

      // Notify all clients of volunteer count
      io.emit('volunteer-count', {
        count: activeVolunteers.size,
        timestamp: new Date(),
      });

      // Try to match with waiting students
      matchStudentsToVolunteers(io);
    } catch (error) {
      console.error('Error in volunteer-online:', error);
    }
  });

  // ✅ VOLUNTEER GOES OFFLINE
  socket.on('volunteer-offline', async (data) => {
    try {
      const { volunteerId } = data;

      await Volunteer.findOneAndUpdate(
        { userId: volunteerId },
        { isOnline: false }
      );

      activeVolunteers.delete(volunteerId);
      socket.leave(`volunteer-${volunteerId}`);
      console.log(`🔴 Volunteer offline: ${volunteerId}`);

      io.emit('volunteer-count', {
        count: activeVolunteers.size,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error in volunteer-offline:', error);
    }
  });

  // ✅ VOLUNTEER ACCEPTS CHAT
  socket.on('volunteer-accept-chat', async (data) => {
    try {
      const { volunteerId, sessionId, volunteerName } = data;

      const chatSession = await ChatSession.findByIdAndUpdate(
        sessionId,
        {
          volunteerId,
          status: 'active',
          startTime: new Date(),
        },
        { new: true }
      );

      // Mark volunteer as busy
      const volunteer = activeVolunteers.get(volunteerId);
      if (volunteer) {
        volunteer.busy = true;
      }

      // Join volunteer to chat room
      socket.join(`chat-${sessionId}`);

      // Notify student that volunteer joined
      io.to(`student-${chatSession.studentId}`).emit('volunteer-joined', {
        volunteerName,
        sessionId,
      });

      console.log(`✅ Chat accepted: ${volunteerName}`);

      // Remove from waiting queue
      const index = waitingQueue.findIndex(
        (w) => w.sessionId === sessionId
      );
      if (index !== -1) {
        waitingQueue.splice(index, 1);
      }
    } catch (error) {
      console.error('Error in volunteer-accept-chat:', error);
      socket.emit('error', { message: 'Failed to accept chat' });
    }
  });

  // ✅ VOLUNTEER ENDS CHAT
  socket.on('end-chat', async (data) => {
    try {
      const { sessionId, volunteerId, notes } = data;

      const chatSession = await ChatSession.findByIdAndUpdate(
        sessionId,
        {
          status: 'ended',
          endTime: new Date(),
          volunteerNotes: notes,
        },
        { new: true }
      );

      const duration = Math.floor(
        (chatSession.endTime - chatSession.startTime) / 60000
      );

      // Mark volunteer as available again
      const volunteer = activeVolunteers.get(volunteerId);
      if (volunteer) {
        volunteer.busy = false;
      }

      // Update volunteer stats
      await Volunteer.findOneAndUpdate(
        { userId: volunteerId },
        {
          $inc: { totalChatsHandled: 1, todaysChats: 1 },
        }
      );

      // Notify both parties
      io.to(`student-${chatSession.studentId}`).emit('chat-ended', {
        sessionId,
        message: 'Chat ended by volunteer',
      });

      io.to(`volunteer-${volunteerId}`).emit('chat-ended', {
        sessionId,
        duration,
      });

      console.log(`🏁 Chat ended: ${sessionId} (${duration}m)`);

      // Try to match next student
      matchStudentsToVolunteers(io);
    } catch (error) {
      console.error('Error in end-chat:', error);
      socket.emit('error', { message: 'Failed to end chat' });
    }
  });

  // ✅ VOLUNTEER ESCALATES CHAT
  socket.on('escalate-chat', async (data) => {
    try {
      const { sessionId, reason } = data;

      const chatSession = await ChatSession.findByIdAndUpdate(
        sessionId,
        {
          status: 'escalated',
          escalated: true,
          escalationReason: reason,
        },
        { new: true }
      );

      // Notify both parties
      io.to(`chat-${sessionId}`).emit('chat-escalated', {
        message: 'Chat escalated to psychologist',
        reason,
      });

      // Update volunteer stats
      await Volunteer.findOneAndUpdate(
        { userId: chatSession.volunteerId },
        { $inc: { totalEscalations: 1 } }
      );

      console.log(`⬆️ Chat escalated: ${sessionId}`);
    } catch (error) {
      console.error('Error in escalate-chat:', error);
      socket.emit('error', { message: 'Failed to escalate chat' });
    }
  });
};

// HELPER: Match students to volunteers
const matchStudentsToVolunteers = (io) => {
  while (waitingQueue.length > 0) {
    // Find available volunteer (prioritize less busy ones)
    let availableVolunteer = null;
    for (const [volunteerId, volunteer] of activeVolunteers) {
      if (!volunteer.busy) {
        availableVolunteer = { volunteerId, ...volunteer };
        break;
      }
    }

    if (!availableVolunteer) {
      break; // No available volunteers
    }

    const student = waitingQueue.shift();

    // Notify volunteer of new chat request
    io.to(availableVolunteer.socketId).emit('new-chat-request', {
      sessionId: student.sessionId,
      studentName: student.studentName,
      riskLevel: student.riskLevel,
      timestamp: new Date(),
    });

    console.log(
      `🔗 Matched: ${student.studentName} ↔ ${availableVolunteer.name}`
    );
  }
};

module.exports = setupVolunteerHandlers;

const ChatSession = require('../models/ChatSession');
const User = require('../models/User');

// Store active volunteers and waiting students in memory
const activeVolunteers = new Map(); // volunteerId -> { userId, socketId }
const waitingQueue = []; // Array of { studentId, socketId, sessionId }

const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    // VOLUNTEER GOES ONLINE
    socket.on('volunteer-online', async (data) => {
      try {
        const { volunteerId, name } = data;

        activeVolunteers.set(volunteerId, {
          socketId: socket.id,
          name,
          busy: false,
        });

        socket.join(`volunteer-${volunteerId}`);
        console.log(`🟢 Volunteer online: ${name} (${volunteerId})`);

        // Broadcast volunteer count to admin
        io.emit('volunteer-count', activeVolunteers.size);

        // Try to match with waiting students
        matchStudentsToVolunteers(io);
      } catch (error) {
        console.error('Error volunteer-online:', error);
      }
    });

    // VOLUNTEER GOES OFFLINE
    socket.on('volunteer-offline', (volunteerId) => {
      activeVolunteers.delete(volunteerId);
      socket.leave(`volunteer-${volunteerId}`);
      console.log(`🔴 Volunteer offline: ${volunteerId}`);
      io.emit('volunteer-count', activeVolunteers.size);
    });

    // STUDENT REQUESTS CHAT
    socket.on('student-request-chat', async (data) => {
      try {
        const { studentId, screeningId, riskLevel, studentName } = data;

        // Create chat session
        const chatSession = new ChatSession({
          studentId,
          screeningId,
          riskLevel,
          status: 'waiting',
          startTime: new Date(),
        });

        await chatSession.save();

        // Add to waiting queue
        waitingQueue.push({
          studentId,
          socketId: socket.id,
          sessionId: chatSession._id.toString(),
          riskLevel,
          studentName,
        });

        socket.join(`student-${studentId}`);

        console.log(`📞 Student waiting for chat: ${studentName}`);

        // Try to match
        matchStudentsToVolunteers(io);

        // Notify student they're in queue
        socket.emit('chat-status', {
          status: 'waiting',
          message: 'Looking for a volunteer...',
          sessionId: chatSession._id,
        });
      } catch (error) {
        console.error('Error student-request-chat:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // SEND MESSAGE IN CHAT
    socket.on('send-message', async (data) => {
      try {
        const { sessionId, sender, senderName, text } = data;

        // Find session and add message
        const session = await ChatSession.findById(sessionId);
        if (!session) {
          socket.emit('error', { message: 'Chat session not found' });
          return;
        }

        session.messages.push({
          sender,
          senderName,
          text,
          timestamp: new Date(),
        });

        await session.save();

        // Broadcast to both student and volunteer
        io.to(`student-${session.studentId}`).emit('receive-message', {
          sender,
          senderName,
          text,
          timestamp: new Date(),
        });

        if (session.volunteerId) {
          io.to(`volunteer-${session.volunteerId}`).emit('receive-message', {
            sender,
            senderName,
            text,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error('Error send-message:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // VOLUNTEER ACCEPTS CHAT
    socket.on('volunteer-accept-chat', async (data) => {
      try {
        const { volunteerId, sessionId, volunteerName } = data;

        // Update session
        const session = await ChatSession.findById(sessionId);
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        session.volunteerId = volunteerId;
        session.status = 'active';
        await session.save();

        // Mark volunteer as busy
        const volunteer = activeVolunteers.get(volunteerId);
        if (volunteer) {
          volunteer.busy = true;
        }

        // Join volunteer to chat room
        socket.join(`student-${session.studentId}`);
        socket.join(`volunteer-${volunteerId}`);

        // Notify both
        io.to(`student-${session.studentId}`).emit('volunteer-joined', {
          volunteerName,
          sessionId,
        });

        io.to(`volunteer-${volunteerId}`).emit('student-joined', {
          sessionId,
          studentName: session.messages[0]?.senderName || 'Anonymous',
        });

        console.log(`✅ Chat started: ${volunteerName} ↔ Student`);

        // Remove from waiting queue
        const index = waitingQueue.findIndex(
          (w) => w.sessionId === sessionId
        );
        if (index !== -1) {
          waitingQueue.splice(index, 1);
        }
      } catch (error) {
        console.error('Error volunteer-accept-chat:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // ESCALATE CHAT TO PSYCHOLOGIST
    socket.on('escalate-chat', async (data) => {
      try {
        const { sessionId, reason } = data;

        const session = await ChatSession.findById(sessionId);
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        session.status = 'escalated';
        session.escalated = true;
        session.escalationReason = reason;
        await session.save();

        // Notify both parties
        io.to(`student-${session.studentId}`).emit('chat-escalated', {
          message: 'Your case has been escalated to a psychologist',
          sessionId,
        });

        if (session.volunteerId) {
          io.to(`volunteer-${session.volunteerId}`).emit('chat-escalated', {
            message: 'Chat escalated to psychologist',
            sessionId,
          });

          // Mark volunteer as available again
          const volunteer = activeVolunteers.get(session.volunteerId);
          if (volunteer) {
            volunteer.busy = false;
          }
        }

        console.log(`⚠️  Chat escalated: ${sessionId}`);
      } catch (error) {
        console.error('Error escalate-chat:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // END CHAT
    socket.on('end-chat', async (data) => {
      try {
        const { sessionId, volunteerId, notes } = data;

        const session = await ChatSession.findById(sessionId);
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        session.status = 'ended';
        session.endTime = new Date();
        session.duration = Math.floor(
          (session.endTime - session.startTime) / 1000
        );
        if (notes) session.volunteerNotes = notes;
        await session.save();

        // Notify both parties
        io.to(`student-${session.studentId}`).emit('chat-ended', {
          sessionId,
          message: 'Chat session has ended',
        });

        if (volunteerId) {
          io.to(`volunteer-${volunteerId}`).emit('chat-ended', {
            sessionId,
            message: 'Chat session has ended',
          });

          // Mark volunteer as available
          const volunteer = activeVolunteers.get(volunteerId);
          if (volunteer) {
            volunteer.busy = false;
          }
        }

        console.log(`🏁 Chat ended: ${sessionId}`);

        // Try to match next student
        matchStudentsToVolunteers(io);
      } catch (error) {
        console.error('Error end-chat:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // DISCONNECT
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);
      io.emit('volunteer-count', activeVolunteers.size);
    });
  });
};

// Match waiting students with available volunteers
const matchStudentsToVolunteers = (io) => {
  while (waitingQueue.length > 0) {
    // Find available volunteer
    let availableVolunteer = null;
    for (const [volunteerId, volunteer] of activeVolunteers) {
      if (!volunteer.busy) {
        availableVolunteer = {
          volunteerId,
          ...volunteer,
        };
        break;
      }
    }

    if (!availableVolunteer) {
      // No available volunteers
      break;
    }

    // Get first student from queue
    const student = waitingQueue.shift();

    // Notify volunteer of waiting student
    io.to(availableVolunteer.socketId).emit('new-chat-request', {
      sessionId: student.sessionId,
      studentName: student.studentName,
      riskLevel: student.riskLevel,
      waitTime: Math.floor((Date.now() - student.timestamp) / 1000) || 0,
    });

    console.log(
      `🔗 Matched: ${student.studentName} ↔ ${availableVolunteer.name}`
    );
  }
};

module.exports = initializeSocket;

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

// Simulated API calls (replace with real axios calls)
const mockAPI = {
  getVolunteerStats: async () => ({
    totalChats: 12,
    todayChats: 3,
    avgDuration: 8.5,
    escalations: 2,
    avgRating: 4.5,
  }),
};

// ============================================================================
// VOLUNTEER DASHBOARD - MODULE 13
// ============================================================================

export default function VolunteerDashboard() {
  // ========== SOCKET & AUTH ==========
  const socketRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  // ========== MAIN STATE ==========
  const [volunteerState, setVolunteerState] = useState({
    status: 'offline', // offline | online | in-chat
    currentChat: null,
    messages: [],
    waitingQueue: [],
    chatHistory: [],
  });

  // ========== STATS STATE ==========
  const [stats, setStats] = useState({
    totalChats: 0,
    todayChats: 0,
    avgDuration: 0,
    escalations: 0,
    avgRating: 0,
  });

  // ========== UI STATE ==========
  const [inputMessage, setInputMessage] = useState('');
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [selectedHistoryChat, setSelectedHistoryChat] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const messagesEndRef = useRef(null);

  // ========== SCROLL TO BOTTOM ==========
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [volunteerState.messages]);

  // ========== SOCKET INITIALIZATION ==========
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

    const socket = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Socket: Connect
    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket');
    });

    // Socket: New Chat Request
    socket.on('new-chat-request', (data) => {
      setVolunteerState((prev) => ({
        ...prev,
        waitingQueue: [
          ...prev.waitingQueue,
          {
            sessionId: data.sessionId,
            studentName: data.studentName,
            riskLevel: data.riskLevel,
            timestamp: Date.now(),
            waitTime: 0,
          },
        ],
      }));
    });

    // Socket: Student Joined
    socket.on('student-joined', (data) => {
      setVolunteerState((prev) => ({
        ...prev,
        status: 'in-chat',
        currentChat: {
          sessionId: data.sessionId,
          studentName: data.studentName || 'Student',
          startTime: Date.now(),
        },
        messages: [
          {
            type: 'system',
            text: `Connected with ${data.studentName || 'Student'}`,
            timestamp: new Date(),
          },
        ],
        waitingQueue: prev.waitingQueue.filter(
          (chat) => chat.sessionId !== data.sessionId
        ),
      }));
    });

    // Socket: Receive Message
    socket.on('receive-message', (data) => {
      setVolunteerState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            type: 'message',
            sender: data.sender,
            senderName: data.senderName,
            text: data.text,
            timestamp: new Date(data.timestamp),
          },
        ],
      }));
    });

    // Socket: Chat Escalated
    socket.on('chat-escalated', (data) => {
      setVolunteerState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            type: 'system',
            text: 'This chat has been escalated to a psychologist.',
            timestamp: new Date(),
          },
        ],
        status: 'online',
        currentChat: null,
      }));
      setStats((prev) => ({
        ...prev,
        escalations: prev.escalations + 1,
      }));
    });

    // Socket: Chat Ended
    socket.on('chat-ended', (data) => {
      const duration = volunteerState.currentChat?.startTime
        ? Math.floor((Date.now() - volunteerState.currentChat.startTime) / 60000)
        : 0;

      const completedChat = {
        ...volunteerState.currentChat,
        messages: volunteerState.messages,
        duration,
        endTime: new Date(),
      };

      setVolunteerState((prev) => ({
        ...prev,
        status: 'online',
        currentChat: null,
        messages: [],
        chatHistory: [completedChat, ...prev.chatHistory],
      }));

      setStats((prev) => ({
        ...prev,
        totalChats: prev.totalChats + 1,
        todayChats: prev.todayChats + 1,
      }));
    });

    // Socket: Error
    socket.on('error', (data) => {
      console.error('Socket error:', data.message);
    });

    // Socket: Disconnect
    socket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // ========== LOAD STATS ON MOUNT ==========
  useEffect(() => {
    const loadStats = async () => {
      const data = await mockAPI.getVolunteerStats();
      setStats(data);
    };
    loadStats();
  }, []);

  // ========== HANDLERS ==========

  const handleGoOnline = () => {
    socketRef.current?.emit('volunteer-online', {
      volunteerId: user.id,
      name: user.name,
    });
    setVolunteerState((prev) => ({ ...prev, status: 'online' }));
  };

  const handleGoOffline = () => {
    setVolunteerState((prev) => ({
      ...prev,
      status: 'offline',
      waitingQueue: [],
    }));
  };

  const handleAcceptChat = (chat) => {
    socketRef.current?.emit('volunteer-accept-chat', {
      volunteerId: user.id,
      sessionId: chat.sessionId,
      volunteerName: user.name,
    });
    setConfirmAction(null);
  };

  const handleDeclineChat = (sessionId) => {
    // Remove from queue and optionally notify
    setVolunteerState((prev) => ({
      ...prev,
      waitingQueue: prev.waitingQueue.filter(
        (chat) => chat.sessionId !== sessionId
      ),
    }));
    setConfirmAction(null);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !volunteerState.currentChat) return;

    socketRef.current?.emit('send-message', {
      sessionId: volunteerState.currentChat.sessionId,
      sender: 'volunteer',
      senderName: user.name,
      text: inputMessage,
    });

    setInputMessage('');
  };

  const handleEscalateChat = () => {
    socketRef.current?.emit('escalate-chat', {
      sessionId: volunteerState.currentChat.sessionId,
      reason: 'Volunteer escalated to psychologist',
    });
    setConfirmAction(null);
  };

  const handleEndChat = () => {
    socketRef.current?.emit('end-chat', {
      sessionId: volunteerState.currentChat.sessionId,
      volunteerId: user.id,
      notes: 'Chat ended by volunteer',
    });
    setConfirmAction(null);
  };

  // ========== RENDER: OFFLINE STATE ==========
  if (volunteerState.status === 'offline') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md p-8 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Volunteer Dashboard
          </h1>
          <p className="text-gray-600 mb-2">Welcome, {user.name}!</p>
          <p className="text-sm text-gray-500 mb-8">
            You're currently offline. Go online to help students in need.
          </p>

          <button
            onClick={handleGoOnline}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 rounded-lg transition transform hover:scale-105"
          >
            🟢 Go Online
          </button>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-gray-600 mb-2">
              <strong>Total Chats Handled:</strong>
            </p>
            <p className="text-2xl font-bold text-blue-600">
              {stats.totalChats}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ========== RENDER: IN-CHAT STATE ==========
  if (volunteerState.status === 'in-chat' && volunteerState.currentChat) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* HEADER */}
        <div className="bg-white shadow-lg">
          <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                💬 Chatting with {volunteerState.currentChat.studentName}
              </h1>
              <p className="text-sm text-green-600 font-semibold">
                ● Online - Chat Active
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setConfirmAction({
                    type: 'escalate',
                    message: 'Are you sure you want to escalate this chat to a psychologist?',
                  })
                }
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                ⬆️ Escalate
              </button>
              <button
                onClick={() =>
                  setConfirmAction({
                    type: 'end',
                    message: 'Are you sure you want to end this chat?',
                  })
                }
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                ❌ End Chat
              </button>
            </div>
          </div>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 overflow-y-auto">
          {volunteerState.messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-4 flex ${
                msg.sender === 'volunteer' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.type === 'system'
                    ? 'bg-gray-200 text-gray-800 text-center w-full text-sm italic'
                    : msg.sender === 'volunteer'
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-300 text-gray-800'
                }`}
              >
                {msg.type !== 'system' && (
                  <p className="text-xs font-semibold mb-1 opacity-90">
                    {msg.senderName}
                  </p>
                )}
                <p className="text-sm">{msg.text}</p>
                <p className="text-xs mt-1 opacity-70">
                  {msg.timestamp?.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT */}
        <div className="bg-white shadow-lg border-t p-4">
          <div className="max-w-5xl mx-auto flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your response..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleSendMessage}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== RENDER: ONLINE STATE ==========
  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Volunteer Dashboard
            </h1>
            <p className="text-sm text-green-600 font-semibold">
              🟢 Online and Available
            </p>
          </div>
          <button
            onClick={handleGoOffline}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition transform hover:scale-105"
          >
            🔴 Go Offline
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-3 gap-6">
        {/* LEFT: STATS SIDEBAR */}
        <div className="col-span-1 space-y-4">
          {/* Stats Cards */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              Total Chats Handled
            </h3>
            <p className="text-3xl font-bold text-blue-600">
              {stats.totalChats}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              Today's Chats
            </h3>
            <p className="text-3xl font-bold text-green-600">
              {stats.todayChats}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              Avg Duration
            </h3>
            <p className="text-3xl font-bold text-purple-600">
              {stats.avgDuration}m
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              Escalations
            </h3>
            <p className="text-3xl font-bold text-orange-600">
              {stats.escalations}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              Avg Rating
            </h3>
            <p className="text-3xl font-bold text-yellow-600">
              {stats.avgRating} ⭐
            </p>
          </div>

          {/* Chat History Button */}
          <button
            onClick={() => setShowChatHistory(!showChatHistory)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition"
          >
            📋 {showChatHistory ? 'Hide' : 'View'} Chat History
          </button>
        </div>

        {/* RIGHT: CHAT QUEUE OR HISTORY */}
        <div className="col-span-2">
          {showChatHistory ? (
            // CHAT HISTORY VIEW
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                📜 Chat History
              </h2>

              {volunteerState.chatHistory.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No chats completed yet.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {volunteerState.chatHistory.map((chat, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedHistoryChat(chat)}
                      className={`p-4 rounded-lg cursor-pointer transition ${
                        selectedHistoryChat === chat
                          ? 'bg-blue-100 border-2 border-blue-600'
                          : 'bg-gray-50 border border-gray-200 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-800">
                            {chat.studentName}
                          </p>
                          <p className="text-xs text-gray-600">
                            {chat.messages?.length || 0} messages • {chat.duration} min
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {chat.endTime?.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedHistoryChat && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-bold text-gray-800 mb-4">
                    Chat Transcript: {selectedHistoryChat.studentName}
                  </h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {selectedHistoryChat.messages?.map((msg, idx) => (
                      <div key={idx} className="text-sm">
                        <p className="text-xs font-semibold text-gray-600">
                          {msg.senderName}
                        </p>
                        <p className="text-gray-700">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // WAITING QUEUE VIEW
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Waiting Requests ({volunteerState.waitingQueue.length})
              </h2>

              {volunteerState.waitingQueue.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">😊</div>
                  <p className="text-gray-600 font-semibold">
                    No waiting students right now.
                  </p>
                  <p className="text-sm text-gray-500">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {volunteerState.waitingQueue
                    .sort((a, b) => {
                      const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
                      return (
                        riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
                      );
                    })
                    .map((chat) => (
                      <div
                        key={chat.sessionId}
                        className="p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200 hover:border-blue-400 transition"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-800">
                              {chat.studentName}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Waiting since:{' '}
                              {new Date(chat.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-bold text-white ${
                              chat.riskLevel === 'HIGH'
                                ? 'bg-red-600'
                                : chat.riskLevel === 'MEDIUM'
                                ? 'bg-yellow-600'
                                : 'bg-green-600'
                            }`}
                          >
                            Risk: {chat.riskLevel}
                          </span>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() =>
                              setConfirmAction({
                                type: 'accept',
                                chat,
                                message: `Accept chat with ${chat.studentName}?`,
                              })
                            }
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                          >
                            ✅ Accept
                          </button>
                          <button
                            onClick={() =>
                              setConfirmAction({
                                type: 'decline',
                                chat,
                                message: `Decline chat with ${chat.studentName}?`,
                              })
                            }
                            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                          >
                            ⏭️ Skip
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {confirmAction.type === 'accept'
                ? '✅ Accept Chat'
                : confirmAction.type === 'decline'
                ? '⏭️ Skip Chat'
                : confirmAction.type === 'escalate'
                ? '⬆️ Escalate Chat'
                : '❌ End Chat'}
            </h3>
            <p className="text-gray-600 mb-6">{confirmAction.message}</p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === 'accept')
                    handleAcceptChat(confirmAction.chat);
                  else if (confirmAction.type === 'decline')
                    handleDeclineChat(confirmAction.chat.sessionId);
                  else if (confirmAction.type === 'escalate')
                    handleEscalateChat();
                  else handleEndChat();
                }}
                className={`flex-1 text-white font-semibold py-2 rounded-lg transition ${
                  confirmAction.type === 'decline' ||
                  confirmAction.type === 'end'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

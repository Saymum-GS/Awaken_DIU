import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getUser } from '../utils/auth';

export default function VolunteerDashboard() {
  const user = getUser();
  const socketRef = useRef(null);

  // State
  const [status, setStatus] = useState('offline'); // offline, online, in-chat
  const [waitingChats, setWaitingChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [totalChatsHandled, setTotalChatsHandled] = useState(0);
  const messagesEndRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize socket
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    socketRef.current = io(socketUrl, {
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    // Socket event listeners
    socketRef.current.on('connect', () => {
      console.log('Volunteer connected to WebSocket');
    });

    // New chat request from student
    socketRef.current.on('new-chat-request', (data) => {
      console.log('New chat request:', data);
      setWaitingChats((prev) => [
        ...prev,
        {
          sessionId: data.sessionId,
          studentName: data.studentName,
          riskLevel: data.riskLevel,
          waitTime: data.waitTime || 0,
        },
      ]);
    });

    // Student joined after volunteer accepts
    socketRef.current.on('student-joined', (data) => {
      setCurrentChat({
        sessionId: data.sessionId,
        studentName: data.studentName || 'Student',
      });
      setStatus('in-chat');
      setMessages([
        {
          text: `Connected with ${data.studentName || 'Student'}`,
          sender: 'system',
          timestamp: new Date(),
        },
      ]);
      // Remove from waiting list
      setWaitingChats((prev) =>
        prev.filter((chat) => chat.sessionId !== data.sessionId)
      );
    });

    // Receive message
    socketRef.current.on('receive-message', (data) => {
      setMessages((prev) => [
        ...prev,
        {
          text: data.text,
          sender: data.sender,
          senderName: data.senderName,
          timestamp: new Date(data.timestamp),
        },
      ]);
    });

    // Chat ended
    socketRef.current.on('chat-ended', (data) => {
      setMessages((prev) => [
        ...prev,
        {
          text: 'Chat session ended',
          sender: 'system',
          timestamp: new Date(),
        },
      ]);
      setCurrentChat(null);
      setChatStatus('online');
      setTotalChatsHandled((prev) => prev + 1);
      setInputMessage('');
    });

    // Chat escalated
    socketRef.current.on('chat-escalated', (data) => {
      setMessages((prev) => [
        ...prev,
        {
          text: 'This chat has been escalated to a psychologist',
          sender: 'system',
          timestamp: new Date(),
        },
      ]);
      setCurrentChat(null);
      setChatStatus('online');
      setTotalChatsHandled((prev) => prev + 1);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Go online
  const handleGoOnline = () => {
    socketRef.current.emit('volunteer-online', {
      volunteerId: user.id,
      name: user.name,
    });
    setStatus('online');
  };

  // Go offline
  const handleGoOffline = () => {
    setStatus('offline');
  };

  // Accept chat request
  const handleAcceptChat = (chat) => {
    socketRef.current.emit('volunteer-accept-chat', {
      volunteerId: user.id,
      sessionId: chat.sessionId,
      volunteerName: user.name,
    });
    setCurrentChat(chat);
    setStatus('in-chat');
    setMessages([
      {
        text: `You accepted a chat with ${chat.studentName}`,
        sender: 'system',
        timestamp: new Date(),
      },
    ]);
  };

  // Send message
  const handleSendMessage = () => {
    if (!inputMessage.trim() || !currentChat) return;

    socketRef.current.emit('send-message', {
      sessionId: currentChat.sessionId,
      sender: 'volunteer',
      senderName: user.name,
      text: inputMessage,
    });

    setInputMessage('');
  };

  // End chat
  const handleEndChat = () => {
    socketRef.current.emit('end-chat', {
      sessionId: currentChat.sessionId,
      volunteerId: user.id,
      notes: 'Volunteer ended chat',
    });
    setCurrentChat(null);
    setChatStatus('online');
    setInputMessage('');
  };

  // Escalate chat
  const handleEscalate = () => {
    socketRef.current.emit('escalate-chat', {
      sessionId: currentChat.sessionId,
      reason: 'Volunteer escalated to psychologist',
    });
  };

  // Offline view
  if (status === 'offline') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md p-8 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Volunteer Dashboard
          </h1>
          <p className="text-gray-600 mb-6">
            Welcome {user.name}! You're currently offline. Go online to help students.
          </p>
          <button
            onClick={handleGoOnline}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition"
          >
            Go Online
          </button>
          <p className="text-xs text-gray-500 mt-4">
            You have helped <strong>{totalChatsHandled}</strong> students today.
          </p>
        </div>
      </div>
    );
  }

  // In chat view
  if (status === 'in-chat' && currentChat) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Chatting with {currentChat.studentName}
              </h1>
              <p className="text-sm text-green-600">● Online</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEscalate}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-semibold"
              >
                Escalate
              </button>
              <button
                onClick={handleEndChat}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-semibold"
              >
                End Chat
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 overflow-y-auto">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-4 flex ${
                msg.sender === 'volunteer' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.sender === 'system'
                    ? 'bg-gray-200 text-gray-800 text-center w-full'
                    : msg.sender === 'volunteer'
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-300 text-gray-800'
                }`}
              >
                {msg.sender !== 'system' && (
                  <p className="text-xs font-semibold mb-1">
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

        {/* Input */}
        <div className="bg-white shadow border-t p-4">
          <div className="max-w-4xl mx-auto flex gap-2">
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
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Online with waiting chats view
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Volunteer Dashboard
            </h1>
            <p className="text-sm text-green-600">● Online and Available</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Chats Handled Today</p>
            <p className="text-3xl font-bold text-green-600">
              {totalChatsHandled}
            </p>
          </div>
          <button
            onClick={handleGoOffline}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Go Offline
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Waiting Chats */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Waiting Requests ({waitingChats.length})
          </h2>

          {waitingChats.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-4xl mb-4">😊</div>
              <p className="text-gray-600">
                No waiting students right now. You're all caught up!
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {waitingChats.map((chat) => (
                <div
                  key={chat.sessionId}
                  className="bg-white rounded-lg shadow p-6 flex justify-between items-center"
                >
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      {chat.studentName}
                    </h3>
                    <div className="flex gap-4 mt-2">
                      <span
                        className={`text-sm font-semibold px-3 py-1 rounded ${
                          chat.riskLevel === 'HIGH'
                            ? 'bg-red-100 text-red-800'
                            : chat.riskLevel === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        Risk: {chat.riskLevel}
                      </span>
                      <span className="text-sm text-gray-600">
                        Waiting: {Math.floor(chat.waitTime / 60)}m
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAcceptChat(chat)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
                  >
                    Accept Chat
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { screeningAPI } from '../services/api';
import { getUser } from '../utils/auth';

export default function ChatPage() {
  const navigate = useNavigate();
  const user = getUser();
  const socketRef = useRef(null);

  // State
  const [chatStatus, setChatStatus] = useState('idle'); // idle, waiting, connected, ended
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [volunteerInfo, setVolunteerInfo] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [riskLevel, setRiskLevel] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize socket connection
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socket = io(socketUrl, {
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    // Remove old listeners
    socket.off('connect');
    socket.off('chat-status');
    socket.off('volunteer-joined');
    socket.off('receive-message');
    socket.off('chat-escalated');
    socket.off('chat-ended');
    socket.off('error');

    // Socket event listeners
    socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('chat-status', (data) => {
      setChatStatus(data.status);
      setSessionId(data.sessionId);
      if (data.status === 'waiting') {
        setMessages([
          {
            text: 'Connecting you with a volunteer...',
            sender: 'system',
            timestamp: new Date(),
          },
        ]);
      }
    });

    socket.on('volunteer-joined', (data) => {
      setVolunteerInfo({
        name: data.volunteerName,
        sessionId: data.sessionId,
      });
      setChatStatus('connected');
      setMessages((prev) => [
        ...prev,
        {
          text: `${data.volunteerName} has joined the chat`,
          sender: 'system',
          timestamp: new Date(),
        },
      ]);
    });

    socket.on('receive-message', (data) => {
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

    socket.on('chat-escalated', (data) => {
      setMessages((prev) => [
        ...prev,
        {
          text: 'This chat has been escalated to a psychologist. A professional will contact you soon.',
          sender: 'system',
          timestamp: new Date(),
        },
      ]);
      setChatStatus('escalated');
    });

    socket.on('chat-ended', (data) => {
      setMessages((prev) => [
        ...prev,
        {
          text: 'Chat session has ended. Thank you for using our service.',
          sender: 'system',
          timestamp: new Date(),
        },
      ]);
      setChatStatus('ended');
    });

    socket.on('error', (data) => {
      setError(data.message || 'An error occurred');
    });

    socketRef.current = socket;

    return () => {
      socket.off('connect');
      socket.off('chat-status');
      socket.off('volunteer-joined');
      socket.off('receive-message');
      socket.off('chat-escalated');
      socket.off('chat-ended');
      socket.off('error');
      socket.disconnect();
    };
  }, []);

  // Get latest screening
  useEffect(() => {
    const getScreening = async () => {
      try {
        const response = await screeningAPI.getLatest();
        setRiskLevel(response.data.screening.riskLevel);
      } catch (err) {
        console.error('Failed to get screening:', err);
      }
    };
    getScreening();
  }, []);

  // Request chat with volunteer
  const handleRequestChat = () => {
    setLoading(true);
    setError('');

    socketRef.current.emit('student-request-chat', {
      studentId: user.id,
      screeningId: sessionId,
      riskLevel: riskLevel,
      studentName: user.name,
    });

    setChatStatus('waiting');
    setLoading(false);
  };

  // Send message
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    socketRef.current.emit('send-message', {
      sessionId,
      sender: 'student',
      senderName: user.name,
      text: inputMessage,
    });

    setInputMessage('');
  };

  // End chat
  const handleEndChat = () => {
    socketRef.current.emit('end-chat', {
      sessionId,
      volunteerId: volunteerInfo?.volunteerId,
    });
  };

  // Escalate chat
  const handleEscalate = () => {
    socketRef.current.emit('escalate-chat', {
      sessionId,
      reason: 'Student requested escalation',
    });
  };

  // Idle state - waiting to connect
  if (chatStatus === 'idle') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md p-8 text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Chat Support
          </h2>
          <p className="text-gray-600 mb-6">
            Connect with a trained volunteer to talk about your concerns.
          </p>

          {riskLevel && (
            <div className={`p-3 rounded mb-6 ${
              riskLevel === 'HIGH' ? 'bg-red-100' :
              riskLevel === 'MEDIUM' ? 'bg-yellow-100' :
              'bg-green-100'
            }`}>
              <p className="text-sm font-semibold">
                Risk Level: <span className="font-bold uppercase">{riskLevel}</span>
              </p>
            </div>
          )}

          <button
            onClick={handleRequestChat}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect with Volunteer'}
          </button>

          <p className="text-xs text-gray-500 mt-4">
            All conversations are confidential and secure.
          </p>
        </div>
      </div>
    );
  }

  // Waiting state
  if (chatStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md p-8 text-center">
          <div className="inline-block animate-spin text-4xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Looking for a Volunteer
          </h2>
          <p className="text-gray-600 mb-6">
            Please wait while we connect you with the next available volunteer...
          </p>
          <p className="text-sm text-gray-500">
            This usually takes 1-2 minutes.
          </p>
        </div>
      </div>
    );
  }

  // Chat connected or ended state
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Chat Support
            </h1>
            {volunteerInfo && (
              <p className="text-sm text-gray-600">
                Connected with {volunteerInfo.name}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {chatStatus === 'connected' && (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-4 flex ${
              msg.sender === 'student' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.sender === 'system'
                  ? 'bg-gray-200 text-gray-800 text-center w-full'
                  : msg.sender === 'student'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-300 text-gray-800'
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

      {/* Input Area */}
      {chatStatus === 'connected' && (
        <div className="bg-white shadow border-t p-4">
          <div className="max-w-4xl mx-auto flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Ended State Message */}
      {chatStatus === 'ended' && (
        <div className="bg-gray-200 p-4 text-center">
          <button
            onClick={() => navigate('/screening')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
          >
            Return to Home
          </button>
        </div>
      )}
    </div>
  );
}

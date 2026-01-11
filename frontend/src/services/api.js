import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach JWT token to every request (if present)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* =========================
   AUTH API
========================= */
export const authAPI = {
  signup: (email, password, name, role = 'student') =>
    api.post('/auth/signup', { email, password, name, role }),

  login: (email, password) =>
    api.post('/auth/login', { email, password }),
};

/* =========================
   SCREENING API
========================= */
export const screeningAPI = {
  submit: (phq9Answers, gad7Answers) =>
    api.post('/screening/submit', { phq9Answers, gad7Answers }),

  getHistory: () =>
    api.get('/screening/history'),

  getLatest: () =>
    api.get('/screening/latest'),
};

/* =========================
   BOOKING API
========================= */
export const bookingAPI = {
  getAvailablePsychologists: () =>
    api.get('/booking/psychologists/available'),

  getAvailableSlots: (psychologistId, date) =>
    api.get('/booking/slots/available', {
      params: { psychologistId, date },
    }),

  bookAppointment: (
    psychologistId,
    appointmentDate,
    startTime,
    endTime,
    notes
  ) =>
    api.post('/booking/book', {
      psychologistId,
      appointmentDate,
      startTime,
      endTime,
      notes,
    }),

  getMyAppointments: () =>
    api.get('/booking/my-appointments'),

  cancelAppointment: (appointmentId, reason) =>
    api.put(`/booking/${appointmentId}/cancel`, { reason }),
};

/* =========================
   CHAT API
========================= */
export const chatAPI = {
  getHistory: () =>
    api.get('/chat/history'),

  getSession: (sessionId) =>
    api.get(`/chat/session/${sessionId}`),

  getVolunteerSessions: () =>
    api.get('/chat/volunteer/sessions'),
};

/* =========================
   VOLUNTEER API (NEW)
========================= */
export const volunteerAPI = {
  getProfile: () =>
    api.get('/volunteer/profile'),

  updateProfile: (data) =>
    api.put('/volunteer/profile', data),

  getStats: () =>
    api.get('/volunteer/stats'),

  getChatHistory: (limit = 20) =>
    api.get('/volunteer/chat-history', {
      params: { limit },
    }),

  getChatTranscript: (chatId) =>
    api.get(`/volunteer/chat-history/${chatId}/transcript`),

  skipChat: (sessionId) =>
    api.post('/volunteer/chat/skip', { sessionId }),

  addNotes: (chatId, notes) =>
    api.post(`/volunteer/chat-history/${chatId}/notes`, { notes }),

  updateStats: (data) =>
    api.post('/volunteer/chat/stats/update', data),
};

/* =========================
   ADMIN API
========================= */
export const adminAPI = {
  getDashboard: () =>
    api.get('/admin/dashboard'),

  getHighRiskAlerts: () =>
    api.get('/admin/alerts/high-risk'),

  getRecentChats: () =>
    api.get('/admin/activity/recent-chats'),

  getVolunteerPerformance: () =>
    api.get('/admin/volunteers/performance'),

  getScreeningTrends: () =>
    api.get('/admin/trends/screenings'),

  getPlatformStatus: () =>
    api.get('/admin/status/platform'),
};

export default api;

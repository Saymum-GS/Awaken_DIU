import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API calls
export const authAPI = {
  signup: (email, password, name, role = 'student') =>
    api.post('/auth/signup', { email, password, name, role }),

  login: (email, password) =>
    api.post('/auth/login', { email, password }),
};

// Screening API calls
export const screeningAPI = {
  submit: (phq9Answers, gad7Answers) =>
    api.post('/screening/submit', { phq9Answers, gad7Answers }),

  getHistory: () =>
    api.get('/screening/history'),

  getLatest: () =>
    api.get('/screening/latest'),
};

// Booking API calls
export const bookingAPI = {
  getAvailablePsychologists: () =>
    api.get('/booking/psychologists/available'),

  getAvailableSlots: (psychologistId, date) =>
    api.get('/booking/slots/available', { params: { psychologistId, date } }),

  bookAppointment: (psychologistId, appointmentDate, startTime, endTime, notes) =>
    api.post('/booking/book', { psychologistId, appointmentDate, startTime, endTime, notes }),

  getMyAppointments: () =>
    api.get('/booking/my-appointments'),

  cancelAppointment: (appointmentId, reason) =>
    api.put(`/booking/${appointmentId}/cancel`, { reason }),
};

// Chat API calls
export const chatAPI = {
  getHistory: () =>
    api.get('/chat/history'),

  getSession: (sessionId) =>
    api.get(`/chat/session/${sessionId}`),

  getVolunteerSessions: () =>
    api.get('/chat/volunteer/sessions'),
};

// Admin API calls
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

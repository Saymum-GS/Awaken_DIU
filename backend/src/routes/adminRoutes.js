const express = require('express');
const router = express.Router();
const adminAuthMiddleware = require('../middleware/adminAuth');
const {
  getDashboardMetrics,
  getHighRiskAlerts,
  getRecentChats,
  getVolunteerPerformance,
  getScreeningTrends,
  getPlatformStatus,
} = require('../controllers/adminController');

// All admin routes require admin authentication
router.get('/dashboard', adminAuthMiddleware, getDashboardMetrics);
router.get('/alerts/high-risk', adminAuthMiddleware, getHighRiskAlerts);
router.get('/activity/recent-chats', adminAuthMiddleware, getRecentChats);
router.get('/volunteers/performance', adminAuthMiddleware, getVolunteerPerformance);
router.get('/trends/screenings', adminAuthMiddleware, getScreeningTrends);
router.get('/status/platform', adminAuthMiddleware, getPlatformStatus);

module.exports = router;

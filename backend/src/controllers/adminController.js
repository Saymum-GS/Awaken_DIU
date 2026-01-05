const User = require('../models/User');
const Screening = require('../models/Screening');
const ChatSession = require('../models/ChatSession');

// ✅ 1. DASHBOARD METRICS
exports.getDashboardMetrics = async (req, res) => {
  try {
    // Count users by role
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalVolunteers = await User.countDocuments({ role: 'volunteer' });
    const totalPsychologists = await User.countDocuments({ role: 'psychologist' });
    const total = totalStudents + totalVolunteers + totalPsychologists;

    // Screening metrics
    const totalScreenings = await Screening.countDocuments();
    const todayScreenings = await Screening.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });

    // Risk level breakdown
    const byRisk = await Screening.aggregate([
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 },
        },
      },
    ]);

    const riskBreakdown = {
      low: byRisk.find(r => r._id === 'low')?.count || 0,
      medium: byRisk.find(r => r._id === 'medium')?.count || 0,
      high: byRisk.find(r => r._id === 'high')?.count || 0,
    };

    const suicidalIdeationCount = await Screening.countDocuments({
      suicidalIdeation: true,
    });

    // Chat metrics
    const totalChats = await ChatSession.countDocuments();
    const activeChats = await ChatSession.countDocuments({ status: 'active' });
    const waitingChats = await ChatSession.countDocuments({ status: 'waiting' });
    const todayChats = await ChatSession.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });
    const escalations = await ChatSession.countDocuments({ escalated: true });
    const todayEscalations = await ChatSession.countDocuments({
      escalated: true,
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });

    // Average chat duration
    const avgDurationResult = await ChatSession.aggregate([
      { $match: { duration: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgDuration: { $avg: '$duration' } } },
    ]);
    const averageDuration = avgDurationResult[0]?.avgDuration || 0;

    res.status(200).json({
      message: 'Dashboard metrics retrieved',
      metrics: {
        users: {
          totalStudents,
          totalVolunteers,
          totalPsychologists,
          total,
        },
        screenings: {
          total: totalScreenings,
          today: todayScreenings,
          byRisk: riskBreakdown,
          suicidalIdeation: suicidalIdeationCount,
        },
        chats: {
          total: totalChats,
          active: activeChats,
          waiting: waitingChats,
          today: todayChats,
          escalations,
          todayEscalations,
          averageDuration: Math.round(averageDuration),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ 2. HIGH RISK ALERTS
exports.getHighRiskAlerts = async (req, res) => {
  try {
    const highRiskScreenings = await Screening.find({ riskLevel: 'high' })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      message: 'High risk alerts retrieved',
      count: highRiskScreenings.length,
      alerts: highRiskScreenings,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ 3. RECENT CHAT ACTIVITY
exports.getRecentChats = async (req, res) => {
  try {
    const recentChats = await ChatSession.find()
      .populate('studentId', 'name email')
      .populate('volunteerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      message: 'Recent chat activity retrieved',
      count: recentChats.length,
      chats: recentChats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ 4. VOLUNTEER PERFORMANCE
exports.getVolunteerPerformance = async (req, res) => {
  try {
    const volunteerStats = await ChatSession.aggregate([
      { $match: { volunteerId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$volunteerId',
          totalChats: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
          escalations: {
            $sum: { $cond: ['$escalated', 1, 0] },
          },
        },
      },
      { $sort: { totalChats: -1 } },
      { $limit: 20 },
    ]);

    // Populate volunteer details
    const enrichedStats = await Promise.all(
      volunteerStats.map(async (stat) => {
        const volunteer = await User.findById(stat._id, 'name email');
        return {
          volunteerId: stat._id,
          volunteerName: volunteer?.name || 'Unknown',
          volunteerEmail: volunteer?.email || 'N/A',
          totalChats: stat.totalChats,
          averageDuration: Math.round(stat.avgDuration || 0),
          escalations: stat.escalations,
        };
      })
    );

    res.status(200).json({
      message: 'Volunteer performance retrieved',
      count: enrichedStats.length,
      volunteers: enrichedStats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ 5. SCREENING TRENDS (Last 7 days)
exports.getScreeningTrends = async (req, res) => {
  try {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const trends = await Screening.aggregate([
      {
        $match: {
          createdAt: { $gte: last7Days },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
          highRisk: {
            $sum: { $cond: [{ $eq: ['$riskLevel', 'high'] }, 1, 0] },
          },
          suicidalIdeation: {
            $sum: { $cond: ['$suicidalIdeation', 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      message: 'Screening trends retrieved (last 7 days)',
      trends,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ 6. PLATFORM STATUS
exports.getPlatformStatus = async (req, res) => {
  try {
    res.status(200).json({
      message: 'Platform is operational',
      status: 'online',
      timestamp: new Date(),
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

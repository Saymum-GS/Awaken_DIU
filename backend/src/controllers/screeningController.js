const Screening = require('../models/Screening');

// Calculate PHQ-9 severity
const calculatePHQ9Severity = (score) => {
  if (score <= 4) return 'minimal';
  if (score <= 9) return 'mild';
  if (score <= 14) return 'moderate';
  return 'severe';
};

// Calculate GAD-7 severity
const calculateGAD7Severity = (score) => {
  if (score <= 4) return 'minimal';
  if (score <= 9) return 'mild';
  if (score <= 14) return 'moderate';
  return 'severe';
};

// Calculate risk level based on scores and suicidal ideation
const calculateRiskLevel = (phq9Score, gad7Score, suicidalIdeation) => {
  // HIGH RISK: Suicidal ideation OR very high scores
  if (suicidalIdeation || phq9Score >= 20 || gad7Score >= 15) {
    return 'high';
  }

  // MEDIUM RISK: Moderate to high scores
  if (phq9Score >= 10 || gad7Score >= 10) {
    return 'medium';
  }

  // LOW RISK: Low scores
  return 'low';
};

// SUBMIT SCREENING
exports.submitScreening = async (req, res) => {
  try {
    const { phq9Answers, gad7Answers } = req.body;
    const userId = req.user.id; // From JWT token

    // Validate input
    if (!phq9Answers || !gad7Answers) {
      return res.status(400).json({ error: 'PHQ-9 and GAD-7 answers required' });
    }

    if (phq9Answers.length !== 9) {
      return res.status(400).json({ error: 'PHQ-9 must have 9 answers' });
    }

    if (gad7Answers.length !== 7) {
      return res.status(400).json({ error: 'GAD-7 must have 7 answers' });
    }

    // Calculate scores (sum of all answers)
    const phq9Score = phq9Answers.reduce((sum, val) => sum + val, 0);
    const gad7Score = gad7Answers.reduce((sum, val) => sum + val, 0);

    // Get suicidal ideation (PHQ-9 item 9 is the last item)
    const suicidalIdeation = phq9Answers[8] > 0; // Item 9 (index 8)

    // Calculate severities
    const phq9Severity = calculatePHQ9Severity(phq9Score);
    const gad7Severity = calculateGAD7Severity(gad7Score);

    // Calculate risk level
    const riskLevel = calculateRiskLevel(phq9Score, gad7Score, suicidalIdeation);

    // Create screening record
    const screening = new Screening({
      userId,
      phq9: {
        answers: phq9Answers,
        score: phq9Score,
        severity: phq9Severity,
      },
      gad7: {
        answers: gad7Answers,
        score: gad7Score,
        severity: gad7Severity,
      },
      riskLevel,
      suicidalIdeation,
    });

    await screening.save();

    res.status(201).json({
      message: 'Screening submitted successfully',
      screening: {
        id: screening._id,
        phq9Score,
        phq9Severity,
        gad7Score,
        gad7Severity,
        riskLevel,
        suicidalIdeation,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET SCREENING HISTORY
exports.getScreeningHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const screenings = await Screening.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Screening history retrieved',
      count: screenings.length,
      screenings,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET LATEST SCREENING
exports.getLatestScreening = async (req, res) => {
  try {
    const userId = req.user.id;

    const screening = await Screening.findOne({ userId }).sort({
      createdAt: -1,
    });

    if (!screening) {
      return res.status(404).json({ error: 'No screening found' });
    }

    res.status(200).json({
      message: 'Latest screening retrieved',
      screening,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

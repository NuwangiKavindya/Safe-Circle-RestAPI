const SusFeedback = require('../models/SusFeedback');

/**
 * Calculate standard SUS score (0 - 100) from 10 Likert items
 */
function calculateSusScore(q) {
  const oddSum = (q.q1 - 1) + (q.q3 - 1) + (q.q5 - 1) + (q.q7 - 1) + (q.q9 - 1);
  const evenSum = (5 - q.q2) + (5 - q.q4) + (5 - q.q6) + (5 - q.q8) + (5 - q.q10);
  return parseFloat(((oddSum + evenSum) * 2.5).toFixed(1));
}

/**
 * Get SUS Grade from numeric score
 */
function getSusGrade(score) {
  if (score >= 84.1) return 'A+ (Superior Usability)';
  if (score >= 80.3) return 'A (Excellent Usability)';
  if (score >= 74.0) return 'B (Good Usability)';
  if (score >= 68.0) return 'C (Above Average Usability)';
  if (score >= 51.0) return 'D (OK Usability)';
  return 'F (Poor Usability)';
}

/**
 * @desc    Submit a new SUS survey evaluation
 * @route   POST /api/sus/submit
 * @access  Public / Private
 */
exports.submitSusFeedback = async (req, res) => {
  try {
    const {
      participantId,
      participantRole,
      task1TimeSec,
      task2TimeSec,
      task3TimeSec,
      task4TimeSec,
      task5TimeSec,
      q1, q2, q3, q4, q5, q6, q7, q8, q9, q10,
      comments,
    } = req.body;

    if (!participantId || !q1 || !q2 || !q3 || !q4 || !q5 || !q6 || !q7 || !q8 || !q9 || !q10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide participantId and all 10 SUS questions (q1-q10).',
      });
    }

    const qObj = { q1, q2, q3, q4, q5, q6, q7, q8, q9, q10 };
    const susScore = calculateSusScore(qObj);

    const feedback = await SusFeedback.create({
      participantId,
      participantRole: participantRole || 'Student',
      task1TimeSec: task1TimeSec || 45.0,
      task2TimeSec: task2TimeSec || 25.0,
      task3TimeSec: task3TimeSec || 30.0,
      task4TimeSec: task4TimeSec || 20.0,
      task5TimeSec: task5TimeSec || 35.0,
      ...qObj,
      susScore,
      comments,
    });

    res.status(201).json({
      success: true,
      data: feedback,
      susScore,
      grade: getSusGrade(susScore),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Get aggregated SUS study results & statistics
 * @route   GET /api/sus/results
 * @access  Public / Private
 */
exports.getSusSummary = async (req, res) => {
  try {
    const feedbacks = await SusFeedback.findAll();
    if (feedbacks.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        meanSusScore: 0,
        grade: 'N/A',
      });
    }

    const scores = feedbacks.map(f => f.susScore);
    const sum = scores.reduce((a, b) => a + b, 0);
    const meanSusScore = parseFloat((sum / scores.length).toFixed(1));

    // Calculate Standard Deviation
    const sqDiffs = scores.map(s => Math.pow(s - meanSusScore, 2));
    const stdDev = parseFloat(Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      meanSusScore,
      stdDev,
      grade: getSusGrade(meanSusScore),
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

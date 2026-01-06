import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { screeningAPI } from '../services/api';
import { getUser } from '../utils/auth';

export default function ScreeningPage() {
  const navigate = useNavigate();
  const user = getUser();

  // PHQ-9 Questions
  const phq9Questions = [
    'Little interest or pleasure in doing things',
    'Feeling down, depressed, or hopeless',
    'Trouble falling or staying asleep, or sleeping too much',
    'Feeling tired or having little energy',
    'Poor appetite or overeating',
    'Feeling bad about yourself — or that you are a failure or have let your family down',
    'Trouble concentrating on things, such as reading the newspaper or watching television',
    'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
    'Thoughts that you would be better off dead or of hurting yourself in some way',
  ];

  // GAD-7 Questions
  const gad7Questions = [
    'Feeling nervous, anxious or on edge',
    'Not being able to stop or control worrying',
    'Worrying too much about different things',
    'Trouble relaxing',
    'Being so restless that it is hard to sit still',
    'Becoming easily annoyed or irritable',
    'Feeling afraid as if something awful might happen',
  ];

  // State for answers
  const [phq9Answers, setPhq9Answers] = useState(new Array(9).fill(0));
  const [gad7Answers, setGad7Answers] = useState(new Array(7).fill(0));
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculate PHQ-9 score
  const phq9Score = phq9Answers.reduce((sum, val) => sum + val, 0);
  const phq9Severity = getSeverity(phq9Score, 'phq9');

  // Calculate GAD-7 score
  const gad7Score = gad7Answers.reduce((sum, val) => sum + val, 0);
  const gad7Severity = getSeverity(gad7Score, 'gad7');

  // Suicidal ideation check (PHQ-9 item 9)
  const suicidalIdeation = phq9Answers[8] > 0;

  // Calculate overall risk level
  const riskLevel = calculateRiskLevel(phq9Score, gad7Score, suicidalIdeation);

  // Get severity level
  function getSeverity(score, type) {
    if (type === 'phq9') {
      if (score <= 4) return 'Minimal';
      if (score <= 9) return 'Mild';
      if (score <= 14) return 'Moderate';
      return 'Severe';
    } else {
      // GAD-7
      if (score <= 4) return 'Minimal';
      if (score <= 9) return 'Mild';
      if (score <= 14) return 'Moderate';
      return 'Severe';
    }
  }

  // Calculate risk level
  function calculateRiskLevel(phq9, gad7, suicidal) {
    if (suicidal || phq9 >= 20 || gad7 >= 15) return 'HIGH';
    if (phq9 >= 10 || gad7 >= 10) return 'MEDIUM';
    return 'LOW';
  }

  // Get risk color
  function getRiskColor(level) {
    if (level === 'HIGH') return 'text-red-600 bg-red-50';
    if (level === 'MEDIUM') return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  }

  // Handle PHQ-9 answer change
  const handlePhq9Change = (index, value) => {
    const newAnswers = [...phq9Answers];
    newAnswers[index] = value;
    setPhq9Answers(newAnswers);
  };

  // Handle GAD-7 answer change
  const handleGad7Change = (index, value) => {
    const newAnswers = [...gad7Answers];
    newAnswers[index] = value;
    setGad7Answers(newAnswers);
  };

  // Submit screening
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await screeningAPI.submit(phq9Answers, gad7Answers);
      setSubmitted(true);

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/chat');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit screening. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Screening Submitted!
          </h2>
          <p className="text-gray-600 mb-4">
            Thank you for completing the mental health screening.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to chat support...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Mental Health Screening
          </h1>
          <p className="text-gray-600">
            Please answer the following questions honestly. Your responses will help us provide better support.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Screening Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* PHQ-9 Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              PHQ-9: Depression Screening
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Over the last 2 weeks, how often have you been bothered by any of the following problems?
            </p>

            {phq9Questions.map((question, index) => (
              <div key={index} className="mb-6 pb-6 border-b last:border-b-0">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {index + 1}. {question}
                  {index === 8 && (
                    <span className="text-red-600 font-bold"> ⚠️</span>
                  )}
                </label>
                <div className="flex gap-4">
                  {[0, 1, 2, 3].map((value) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`phq9-${index}`}
                        value={value}
                        checked={phq9Answers[index] === value}
                        onChange={() => handlePhq9Change(index, value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-600">
                        {value === 0 && 'Not at all'}
                        {value === 1 && 'Several days'}
                        {value === 2 && 'More than half'}
                        {value === 3 && 'Nearly every day'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* PHQ-9 Score Display */}
            <div className="mt-6 p-4 bg-blue-50 rounded">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">PHQ-9 Score</p>
                  <p className="text-3xl font-bold text-blue-600">{phq9Score}/27</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Severity Level</p>
                  <p className="text-xl font-bold text-blue-600">{phq9Severity}</p>
                </div>
              </div>
            </div>
          </div>

          {/* GAD-7 Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              GAD-7: Anxiety Screening
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Over the last 2 weeks, how often have you been bothered by the following problems?
            </p>

            {gad7Questions.map((question, index) => (
              <div key={index} className="mb-6 pb-6 border-b last:border-b-0">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {index + 1}. {question}
                </label>
                <div className="flex gap-4">
                  {[0, 1, 2, 3].map((value) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`gad7-${index}`}
                        value={value}
                        checked={gad7Answers[index] === value}
                        onChange={() => handleGad7Change(index, value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-600">
                        {value === 0 && 'Not at all'}
                        {value === 1 && 'Several days'}
                        {value === 2 && 'More than half'}
                        {value === 3 && 'Nearly every day'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* GAD-7 Score Display */}
            <div className="mt-6 p-4 bg-purple-50 rounded">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">GAD-7 Score</p>
                  <p className="text-3xl font-bold text-purple-600">{gad7Score}/21</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Severity Level</p>
                  <p className="text-xl font-bold text-purple-600">{gad7Severity}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className={`rounded-lg shadow p-6 ${getRiskColor(riskLevel)}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg mb-1">Overall Risk Assessment</h3>
                <p className="text-sm">
                  {riskLevel === 'HIGH' &&
                    'Your screening indicates high risk. Please connect with a mental health professional immediately.'}
                  {riskLevel === 'MEDIUM' &&
                    'Your screening indicates moderate risk. We recommend talking to a mental health professional.'}
                  {riskLevel === 'LOW' &&
                    'Your screening indicates low risk. Continue practicing self-care and reach out if you need support.'}
                </p>
              </div>
              <div className="text-4xl font-bold">{riskLevel}</div>
            </div>

            {suicidalIdeation && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded">
                <p className="text-sm font-semibold text-red-800">
                  ⚠️ If you're having thoughts of self-harm, please reach out for help immediately.
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Screening & Connect with Support'}
          </button>
        </form>

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-gray-100 rounded text-center text-xs text-gray-600">
          <p>
            This screening tool is not a substitute for professional medical advice.
            Please consult a mental health professional for proper diagnosis and treatment.
          </p>
        </div>
      </div>
    </div>
  );
}

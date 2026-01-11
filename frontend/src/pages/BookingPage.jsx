import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingAPI } from '../services/api';

export default function BookingPage() {
  const navigate = useNavigate();

  // State for psychologists list
  const [psychologists, setPsychologists] = useState([]);
  const [selectedPsychologist, setSelectedPsychologist] = useState(null);

  // State for booking steps
  const [step, setStep] = useState(1); // 1: Select Psychologist, 2: Select Date, 3: Select Time, 4: Confirm
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('');

  // State for loading and errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch available psychologists on mount
  useEffect(() => {
    fetchPsychologists();
  }, []);

  // Fetch available slots when date changes
  useEffect(() => {
    if (selectedPsychologist && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate, selectedPsychologist]);

  // Fetch psychologists
  const fetchPsychologists = async () => {
    setLoading(true);
    try {
      const response = await bookingAPI.getAvailablePsychologists();
      setPsychologists(response.data.psychologists || []);
      setError('');
    } catch (err) {
      setError('Failed to load psychologists. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available slots
  const fetchAvailableSlots = async () => {
    setLoading(true);
    try {
      const response = await bookingAPI.getAvailableSlots(
        selectedPsychologist.id,
        selectedDate
      );
      setAvailableSlots(response.data.slots || []);
      setError('');
    } catch (err) {
      setError('Failed to load available slots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle psychologist selection
  const handleSelectPsychologist = (psychologist) => {
    setSelectedPsychologist(psychologist);
    setSelectedDate('');
    setAvailableSlots([]);
    setSelectedSlot(null);
    setStep(2);
  };

  // Handle date selection
  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep(3);
  };

  // Handle slot selection
  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setStep(4);
  };

  // Handle booking confirmation
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await bookingAPI.bookAppointment(
        selectedPsychologist.id,
        selectedDate,
        selectedSlot.startTime,
        selectedSlot.endTime,
        notes
      );
      setSuccess(true);

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/my-appointments');
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Failed to book appointment. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Get minimum date (today + 1 day)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Get maximum date (today + 30 days)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Appointment Booked!
          </h2>
          <p className="text-gray-600 mb-4">
            Your appointment with {selectedPsychologist?.name} has been successfully booked.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to your appointments...
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
            Book Psychologist Appointment
          </h1>
          <p className="text-gray-600">
            Schedule a session with a qualified mental health professional
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                    s <= step ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  {s}
                </div>
                {s < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      s < step ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-2">
            <span>Select Psychologist</span>
            <span>Pick Date</span>
            <span>Choose Time</span>
            <span>Confirm</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* STEP 1: Select Psychologist */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Available Psychologists
            </h2>

            {loading ? (
              <p className="text-center text-gray-600">Loading psychologists...</p>
            ) : psychologists.length === 0 ? (
              <p className="text-center text-gray-600">
                No psychologists available at the moment.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {psychologists.map((psych) => (
                  <div
                    key={psych.id}
                    className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition"
                    onClick={() => handleSelectPsychologist(psych)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">
                          {psych.name}
                        </h3>
                        <p className="text-sm text-blue-600 font-semibold">
                          {psych.specialization}
                        </p>
                      </div>
                      <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                        Available
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      {psych.bio || 'Experienced mental health professional'}
                    </p>

                    <div className="space-y-1 text-sm text-gray-700 mb-3">
                      <p>
                        📍 <strong>Working Hours:</strong> {psych.workingHours}
                      </p>
                      <p>
                        📅 <strong>Available Days:</strong>{' '}
                        {psych.availableDays?.join(', ') || 'Sun-Thu'}
                      </p>
                      <p>
                        ⏱️ <strong>Session Duration:</strong>{' '}
                        {psych.appointmentDuration} minutes
                      </p>
                      <p>
                        💰 <strong>Fee:</strong> TK {psych.fee || 'TBD'}
                      </p>
                    </div>

                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded">
                      Select
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Select Date */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Select Appointment Date
            </h2>

            <div className="mb-6 p-4 bg-blue-50 rounded">
              <p className="font-semibold text-gray-800">
                {selectedPsychologist?.name}
              </p>
              <p className="text-sm text-gray-600">
                {selectedPsychologist?.specialization}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pick a Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleSelectDate(e.target.value)}
                min={getMinDate()}
                max={getMaxDate()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                Appointments available from tomorrow to 30 days from now
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-lg transition"
              >
                Back
              </button>
              <button
                disabled={!selectedDate}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Select Time Slot */}
        {step === 3 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Select Time Slot
            </h2>

            <div className="mb-6 p-4 bg-blue-50 rounded">
              <p className="font-semibold text-gray-800">
                {selectedPsychologist?.name}
              </p>
              <p className="text-sm text-gray-600">
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {loading ? (
              <p className="text-center text-gray-600">Loading available slots...</p>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  No slots available for this date.
                </p>
                <button
                  onClick={() => setStep(2)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
                >
                  Choose Different Date
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => handleSelectSlot(slot)}
                    className={`p-3 rounded-lg font-semibold transition ${
                      selectedSlot?.id === slot.id
                        ? 'bg-blue-600 text-white'
                        : 'border-2 border-gray-300 text-gray-700 hover:border-blue-500'
                    }`}
                  >
                    {slot.startTime}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-lg transition"
              >
                Back
              </button>
              <button
                disabled={!selectedSlot}
                onClick={() => setStep(4)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Confirm Booking */}
        {step === 4 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Confirm Appointment
            </h2>

            {/* Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-600">
              <h3 className="font-bold text-lg text-gray-800 mb-4">
                Appointment Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">Psychologist:</span>
                  <span className="font-semibold text-gray-800">
                    {selectedPsychologist?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Specialization:</span>
                  <span className="font-semibold text-gray-800">
                    {selectedPsychologist?.specialization}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Date:</span>
                  <span className="font-semibold text-gray-800">
                    {new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Time:</span>
                  <span className="font-semibold text-gray-800">
                    {selectedSlot?.startTime} - {selectedSlot?.endTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Duration:</span>
                  <span className="font-semibold text-gray-800">
                    {selectedPsychologist?.appointmentDuration} minutes
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-300">
                  <span className="text-gray-700 font-bold">Cost:</span>
                  <span className="font-bold text-blue-600">
                    TK {selectedPsychologist?.fee || '0'}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any specific concerns or issues you'd like to discuss?"
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Terms */}
            <div className="mb-6 p-3 bg-blue-50 rounded text-xs text-gray-600">
              <p>
                ✓ By confirming, you agree to our booking policy and cancellation terms.
              </p>
              <p>
                ✓ You will receive a confirmation email shortly.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setStep(3)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-lg transition"
              >
                Back
              </button>
              <button
                onClick={handleConfirmBooking}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Booking...' : 'Confirm & Book'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

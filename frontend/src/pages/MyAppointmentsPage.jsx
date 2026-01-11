import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingAPI } from '../services/api';

export default function MyAppointmentsPage() {
  const navigate = useNavigate();

  // State
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, upcoming, completed, cancelled
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Fetch appointments on mount
  useEffect(() => {
    fetchAppointments();
  }, []);

  // Fetch appointments
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await bookingAPI.getMyAppointments();
      setAppointments(response.data.appointments || []);
      setError('');
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Failed to load appointments. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Cancel appointment
  const handleCancelAppointment = async () => {
    setLoading(true);
    try {
      await bookingAPI.cancelAppointment(selectedAppointment.id, cancelReason);
      setShowCancelModal(false);
      setCancelReason('');
      setSelectedAppointment(null);
      fetchAppointments();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Failed to cancel appointment. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Filter appointments
  const getFilteredAppointments = () => {
    const now = new Date();
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.appointmentDate + ' ' + apt.startTime);

      if (filter === 'upcoming') return aptDate > now && apt.status === 'scheduled';
      if (filter === 'completed')
        return (
          aptDate < now ||
          apt.status === 'completed' ||
          apt.status === 'confirmed'
        );
      if (filter === 'cancelled') return apt.status === 'cancelled';
      return true;
    });
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no-show':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAppointments = getFilteredAppointments();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-800">
                My Appointments
              </h1>
              <p className="text-gray-600">
                Manage your psychologist appointments
              </p>
            </div>
            <button
              onClick={() => navigate('/book-appointment')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
            >
              + Book New Appointment
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'upcoming', 'completed', 'cancelled'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && !showCancelModal ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading appointments...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              No Appointments Found
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? "You haven't booked any appointments yet."
                : `You have no ${filter} appointments.`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => navigate('/book-appointment')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
              >
                Book Your First Appointment
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                      {appointment.psychologistName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {appointment.specialization}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                      appointment.status
                    )}`}
                  >
                    {appointment.status.charAt(0).toUpperCase() +
                      appointment.status.slice(1)}
                  </span>
                </div>

                {/* Appointment Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">📅</span>
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-semibold text-gray-800">
                        {new Date(appointment.appointmentDate).toLocaleDateString(
                          'en-US',
                          {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-xl">⏰</span>
                    <div>
                      <p className="text-sm text-gray-600">Time</p>
                      <p className="font-semibold text-gray-800">
                        {appointment.startTime} - {appointment.endTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-xl">⏱️</span>
                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-semibold text-gray-800">
                        {appointment.duration || 60} minutes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-xl">💰</span>
                    <div>
                      <p className="text-sm text-gray-600">Cost</p>
                      <p className="font-semibold text-gray-800">
                        TK {appointment.fee || 'TBD'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {appointment.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      Your Notes:
                    </p>
                    <p className="text-sm text-gray-600">{appointment.notes}</p>
                  </div>
                )}

                {/* Psychologist Notes (if completed) */}
                {appointment.psychologistNotes && (
                  <div className="mb-4 p-3 bg-blue-50 rounded border-l-4 border-blue-600">
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      Session Notes from {appointment.psychologistName}:
                    </p>
                    <p className="text-sm text-gray-600">
                      {appointment.psychologistNotes}
                    </p>
                  </div>
                )}

                {/* Payment Status */}
                <div className="mb-4">
                  <p className="text-xs text-gray-600">
                    Payment Status:{' '}
                    <span
                      className={`font-semibold ${
                        appointment.paymentStatus === 'paid'
                          ? 'text-green-600'
                          : appointment.paymentStatus === 'waived'
                          ? 'text-blue-600'
                          : 'text-yellow-600'
                      }`}
                    >
                      {appointment.paymentStatus?.toUpperCase() || 'PENDING'}
                    </span>
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 flex-wrap">
                  {appointment.status === 'scheduled' && (
                    <>
                      <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition text-sm">
                        Edit Appointment
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setShowCancelModal(true);
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition text-sm"
                      >
                        Cancel Appointment
                      </button>
                    </>
                  )}

                  <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition text-sm">
                    Download Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel Appointment Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Cancel Appointment?
            </h3>

            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel your appointment with{' '}
              <strong>{selectedAppointment?.psychologistName}</strong> on{' '}
              <strong>
                {new Date(
                  selectedAppointment?.appointmentDate
                ).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </strong>
              ?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Cancellation (Optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please let us know why you're cancelling..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedAppointment(null);
                  setCancelReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition"
              >
                Keep Appointment
              </button>
              <button
                onClick={handleCancelAppointment}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Cancelling...' : 'Cancel Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

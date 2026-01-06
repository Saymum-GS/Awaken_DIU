import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { getUser, isLoggedIn } from './utils/auth';

import LoginPage from './pages/LoginPage';
import ScreeningPage from './pages/ScreeningPage';
import SignupPage from './pages/SignupPage';

// import ScreeningPage from './pages/ScreeningPage';
// import ChatPage from './pages/ChatPage';
// import BookingPage from './pages/BookingPage';
// import AdminDashboard from './pages/AdminDashboard';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  if (!isLoggedIn()) {
    return <Navigate to="/login" />;
  }

  if (requiredRole) {
    const user = getUser();
    if (user.role !== requiredRole) {
      return <Navigate to="/" />;
    }
  }

  return children;
};

export default function App() {
  const user = isLoggedIn() ? getUser() : null;

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {/* Navbar - will add later */}
        {/* {user && <Navbar user={user} />} */}

        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Student Routes */}
          <Route
            path="/screening"
            element={
              <ProtectedRoute requiredRole="student">
                <ScreeningPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat"
            element={
              <ProtectedRoute requiredRole="student">
                <div className="p-4">Chat with Volunteer (Coming Soon)</div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/book-appointment"
            element={
              <ProtectedRoute requiredRole="student">
                <div className="p-4">Book Appointment (Coming Soon)</div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-appointments"
            element={
              <ProtectedRoute requiredRole="student">
                <div className="p-4">My Appointments (Coming Soon)</div>
              </ProtectedRoute>
            }
          />

          {/* Volunteer Routes */}
          <Route
            path="/volunteer-dashboard"
            element={
              <ProtectedRoute requiredRole="volunteer">
                <div className="p-4">Volunteer Dashboard (Coming Soon)</div>
              </ProtectedRoute>
            }
          />

          {/* Psychologist Routes */}
          <Route
            path="/psychologist-schedule"
            element={
              <ProtectedRoute requiredRole="psychologist">
                <div className="p-4">Psychologist Schedule (Coming Soon)</div>
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <div className="p-4">Admin Dashboard (Coming Soon)</div>
              </ProtectedRoute>
            }
          />

          {/* Home / Redirect */}
          <Route
            path="/"
            element={
              user ? (
                <Navigate to={`/${user.role}-dashboard`} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* 404 */}
          <Route path="*" element={<div className="p-4 text-center">Page Not Found</div>} />
        </Routes>
      </div>
    </Router>
  );
}

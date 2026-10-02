import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Public Pages
import LandingPage    from './pages/LandingPage';
import LoginPage      from './pages/LoginPage';
import RegisterPage   from './pages/RegisterPage';

// Resident Pages
import ResidentDashboard from './pages/ResidentDashboard';
import RequestPickupPage from './pages/RequestPickupPage';
import MyRequestsPage    from './pages/MyRequestsPage';
import RequestDetailPage from './pages/RequestDetailPage';

// Crew Pages
import CrewDashboard         from './pages/CrewDashboard';
import CrewRequestsPage      from './pages/CrewRequestsPage';
import CrewRequestDetailPage from './pages/CrewRequestDetailPage';
import CrewRoutePage         from './pages/CrewRoutePage';

// Admin Pages
import AdminDashboard         from './pages/AdminDashboard';
import AdminRequestsPage      from './pages/AdminRequestsPage';
import AdminRequestDetailPage from './pages/AdminRequestDetailPage';
import AdminCrewsPage         from './pages/AdminCrewsPage';
import AdminAnalyticsPage     from './pages/AdminAnalyticsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/crew/register" element={<RegisterPage defaultRole="crew" />} />

            {/* Resident Routes (Resident + Admin can access) */}
            <Route
              path="/resident"
              element={
                <ProtectedRoute allowedRoles={['resident', 'admin']}>
                  <ResidentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resident/request"
              element={
                <ProtectedRoute allowedRoles={['resident', 'admin']}>
                  <RequestPickupPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resident/requests"
              element={
                <ProtectedRoute allowedRoles={['resident', 'admin']}>
                  <MyRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resident/requests/:id"
              element={
                <ProtectedRoute allowedRoles={['resident', 'admin']}>
                  <RequestDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Collection Crew Routes (Crew + Admin can access) */}
            <Route
              path="/crew"
              element={
                <ProtectedRoute allowedRoles={['crew', 'admin']}>
                  <CrewDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crew/requests"
              element={
                <ProtectedRoute allowedRoles={['crew', 'admin']}>
                  <CrewRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crew/requests/:id"
              element={
                <ProtectedRoute allowedRoles={['crew', 'admin']}>
                  <CrewRequestDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crew/route"
              element={
                <ProtectedRoute allowedRoles={['crew', 'admin']}>
                  <CrewRoutePage />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes (Admin only) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/requests"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/requests/:id"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminRequestDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/crews"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminCrewsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminAnalyticsPage />
                </ProtectedRoute>
              }
            />

            {/* 404 Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

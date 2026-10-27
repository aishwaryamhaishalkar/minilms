import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import { LoginPage, RegisterPage } from './pages/AuthPages.jsx';
import { ActiveSession, ReportsPage, SessionRecords, TeacherDashboard } from './pages/TeacherPages.jsx';
import { HistoryPage, ScannerPage, StudentDashboard } from './pages/StudentPages.jsx';
import './styles.css';

function DefaultRedirect() { const { user } = useAuth(); return <Navigate to={user ? `/${user.role}` : '/login'} replace />; }

export default function App() {
  return <AuthProvider><BrowserRouter><Layout><Routes>
    <Route path="/" element={<HomePage />} /><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} />
    <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
    <Route path="/teacher/portal" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
    <Route path="/teacher/session/:id" element={<ProtectedRoute role="teacher"><ActiveSession /></ProtectedRoute>} />
    <Route path="/teacher/session/:id/records" element={<ProtectedRoute role="teacher"><SessionRecords /></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute role="teacher"><ReportsPage /></ProtectedRoute>} />
    <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
    <Route path="/scan" element={<ProtectedRoute role="student"><ScannerPage /></ProtectedRoute>} />
    <Route path="/history" element={<ProtectedRoute role="student"><HistoryPage /></ProtectedRoute>} />
    <Route path="*" element={<DefaultRedirect />} />
  </Routes></Layout></BrowserRouter></AuthProvider>;
}

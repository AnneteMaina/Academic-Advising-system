import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import MyUnits from './pages/MyUnits';

const Soon = ({ name }) => <h1>{name} (coming in the next step)</h1>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/courses" element={<Courses />} />
<Route path="/my-units" element={<ProtectedRoute roles={['student']}><MyUnits /></ProtectedRoute>} />
        <Route path="/appointments" element={<Soon name="Appointments" />} />
        <Route path="/availability" element={<Soon name="Availability" />} />
        <Route path="/advisors" element={<Soon name="Advisors" />} />
        <Route path="/notifications" element={<Soon name="Notifications" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
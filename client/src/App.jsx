import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Home from './pages/Home.jsx';
import Timetable from './pages/Timetable.jsx';
import Courses from './pages/Courses.jsx';
import TakeAttendance from './pages/TakeAttendance.jsx';
import Scan from './pages/Scan.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';

function Guard({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center-note">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/users" element={<Guard roles={['admin']}><Users /></Guard>} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route element={<Guard><Layout /></Guard>}>
        <Route path="/" element={<Home />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/courses" element={<Guard roles={['admin']}><Courses /></Guard>} />
        <Route path="/take" element={<Guard roles={['teacher']}><TakeAttendance /></Guard>} />
        <Route path="/scan" element={<Guard roles={['student']}><Scan /></Guard>} />
        <Route path="/reports" element={<Guard roles={['teacher', 'student']}><Reports /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

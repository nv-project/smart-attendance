import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

const links = {
  admin: [['/', 'Home'], ['/courses', 'Courses'], ['/timetable', 'Timetable']],
  teacher: [['/', 'Home'], ['/take', 'Take attendance'], ['/reports', 'Reports'], ['/timetable', 'Timetable']],
  student: [['/', 'Home'], ['/scan', 'Scan QR'], ['/reports', 'My attendance'], ['/timetable', 'Timetable']],
};

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="topbar">
        <strong className="brand">Smart Attendance</strong>
        <nav>
          {links[user.role].map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
          ))}
        </nav>
        <div className="who">
          <span>{user.name}</span>
          <button className="ghost" onClick={logout}>Sign out</button>
        </div>
      </header>
      <main className="page"><Outlet /></main>
    </>
  );
}

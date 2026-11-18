import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../AuthContext.jsx';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Home() {
  const { user } = useAuth();
  const [today, setToday] = useState([]);
  const [low, setLow] = useState([]);
  const dayName = DAYS[new Date().getDay()];

  useEffect(() => {
    api.get('/timetable').then((r) => setToday(r.data.filter((t) => t.day === dayName)));
    if (user.role === 'student') api.get('/attendance/my').then((r) => setLow(r.data.filter((c) => c.total > 0 && c.percent < 75)));
  }, []);

  return (
    <>
      <h1>Hello, {user.name.split(' ')[0]}</h1>
      {user.role === 'student' && <p className="muted">Batch: {user.batch}</p>}
      {user.role === 'student' && low.length > 0 && (
        <div className="alert">
          Attendance is below 75% in: {low.map((c) => `${c.course.code} (${c.percent}%)`).join(', ')}.{' '}
          <Link to="/reports">See details</Link>
        </div>
      )}
      <section className="panel">
        <h2>Today’s lectures ({dayName})</h2>
        {today.length === 0 ? (
          <p className="muted">No lectures scheduled today.</p>
        ) : (
          <ul className="list">
            {today.map((t) => (
              <li key={t._id}>
                <span className="time">{t.startTime}–{t.endTime}</span>
                <span><b>{t.course.name}</b> · Room {t.room}{user.role !== 'teacher' && ` · ${t.teacher.name}`}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {user.role === 'teacher' && <Link className="btn" to="/take">Start taking attendance</Link>}
      {user.role === 'student' && <Link className="btn" to="/scan">Scan attendance QR</Link>}
      {user.role === 'admin' && <Link className="btn" to="/timetable">Manage timetable</Link>}
    </>
  );
}

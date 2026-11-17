import { useEffect, useState } from 'react';
import api, { errorText } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Timetable() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ courseId: '', room: '', day: 'Mon', startTime: '09:00', endTime: '10:00' });
  const [error, setError] = useState('');
  const [clashes, setClashes] = useState([]);

  const load = () => api.get('/timetable').then((r) => setRows(r.data));
  useEffect(() => {
    load();
    if (isAdmin) api.get('/courses').then((r) => setCourses(r.data));
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    setError('');
    setClashes([]);
    try {
      await api.post('/timetable', form);
      load();
    } catch (err) {
      setError(errorText(err));
      setClashes(err.response?.data?.clashes || []);
    }
  };

  const remove = async (id) => {
    await api.delete(`/timetable/${id}`);
    load();
  };

  return (
    <>
      <h1>Timetable</h1>
      {isAdmin && (
        <form className="panel row-form" onSubmit={add}>
          <label>Course
            <select value={form.courseId} onChange={set('courseId')} required>
              <option value="">Choose…</option>
              {courses.map((c) => <option key={c._id} value={c._id}>{c.code} · {c.batch}</option>)}
            </select>
          </label>
          <label>Room<input value={form.room} onChange={set('room')} required /></label>
          <label>Day
            <select value={form.day} onChange={set('day')}>{DAYS.map((d) => <option key={d}>{d}</option>)}</select>
          </label>
          <label>Start<input type="time" value={form.startTime} onChange={set('startTime')} required /></label>
          <label>End<input type="time" value={form.endTime} onChange={set('endTime')} required /></label>
          <button>Add slot</button>
          {error && (
            <div className="error clash">
              <b>{error}</b>
              <ul>{clashes.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
          )}
        </form>
      )}
      <div className="week">
        {DAYS.map((d) => (
          <section key={d} className="panel day">
            <h3>{d}</h3>
            {rows.filter((r) => r.day === d).map((r) => (
              <div key={r._id} className="slot">
                <span className="time">{r.startTime}–{r.endTime}</span>
                <b>{r.course.code}</b>
                <span className="muted">Room {r.room} · {r.batch}{user.role === 'student' && ` · ${r.teacher.name}`}</span>
                {isAdmin && <button className="ghost danger" onClick={() => remove(r._id)}>Remove</button>}
              </div>
            ))}
            {!rows.some((r) => r.day === d) && <p className="muted">Free</p>}
          </section>
        ))}
      </div>
    </>
  );
}

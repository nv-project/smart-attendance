import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api, { errorText } from '../api.js';

const ROTATE_MS = 15000;

export default function TakeAttendance() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [session, setSession] = useState(null);
  const [present, setPresent] = useState([]);
  const [error, setError] = useState('');
  const sessionId = useRef(null);

  useEffect(() => {
    api.get('/courses').then((r) => { setCourses(r.data); if (r.data[0]) setCourseId(r.data[0]._id); });
  }, []);

  // While a session is live: rotate the QR code, and poll the list of students who marked present
  useEffect(() => {
    if (!session) return;
    sessionId.current = session._id;
    const rotate = setInterval(async () => {
      try {
        const r = await api.post(`/sessions/${sessionId.current}/refresh`);
        setSession(r.data);
      } catch {
        setSession(null);
        setError('The session has ended.');
      }
    }, ROTATE_MS);
    const poll = setInterval(async () => {
      try {
        const r = await api.get(`/sessions/${sessionId.current}`);
        setPresent(r.data.present);
      } catch { /* ignore */ }
    }, 3000);
    return () => { clearInterval(rotate); clearInterval(poll); };
  }, [session?._id]);

  const start = async () => {
    setError('');
    try {
      const r = await api.post('/sessions/start', { courseId });
      setPresent([]);
      setSession(r.data);
    } catch (err) {
      setError(errorText(err));
    }
  };

  const end = async () => {
    await api.post(`/sessions/${session._id}/end`);
    setSession(null);
  };

  if (!session) {
    return (
      <>
        <h1>Take attendance</h1>
        <section className="panel row-form">
          <label>Course
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {courses.map((c) => <option key={c._id} value={c._id}>{c.code} · {c.name} ({c.batch})</option>)}
            </select>
          </label>
          <button onClick={start} disabled={!courseId}>Start session</button>
          {error && <p className="error">{error}</p>}
          {courses.length === 0 && <p className="muted">No courses assigned to you yet. Ask the admin to add one.</p>}
        </section>
      </>
    );
  }

  return (
    <>
      <h1>Attendance is open</h1>
      <div className="split">
        <section className="panel qr">
          <QRCodeSVG value={session.code} size={280} />
          <p className="muted">Code changes every 15 seconds. Students open “Scan QR” on their phone.</p>
          <p className="code">{session.code}</p>
          <button className="danger" onClick={end}>End session</button>
        </section>
        <section className="panel">
          <h2>Present ({present.length})</h2>
          <ol className="list">
            {present.map((p) => (
              <li key={p._id}><span>{p.student.name}</span><span className="muted">{new Date(p.createdAt).toLocaleTimeString()}</span></li>
            ))}
          </ol>
          {present.length === 0 && <p className="muted">Waiting for the first scan…</p>}
        </section>
      </div>
    </>
  );
}

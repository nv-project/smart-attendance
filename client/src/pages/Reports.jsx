import { useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../AuthContext.jsx';

function Bar({ percent }) {
  return (
    <div className="bar" title={`${percent}%`}>
      <div className={percent < 75 ? 'fill low' : 'fill'} style={{ width: `${percent}%` }} />
    </div>
  );
}

function StudentView() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get('/attendance/my').then((r) => setRows(r.data)); }, []);
  return (
    <>
      <h1>My attendance</h1>
      <section className="panel">
        {rows.map((r) => (
          <div key={r.course._id} className="att-row">
            <div><b>{r.course.code}</b> {r.course.name}</div>
            <Bar percent={r.percent} />
            <div className="muted">{r.attended}/{r.total} lectures · {r.percent}%{r.total > 0 && r.percent < 75 && ' · below 75%'}</div>
          </div>
        ))}
        {rows.length === 0 && <p className="muted">No courses for your batch yet.</p>}
      </section>
    </>
  );
}

function TeacherView() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.get('/courses').then((r) => { setCourses(r.data); if (r.data[0]) setCourseId(r.data[0]._id); });
  }, []);
  useEffect(() => {
    if (courseId) api.get(`/attendance/course/${courseId}`).then((r) => setReport(r.data));
  }, [courseId]);

  const download = async () => {
    const r = await api.get(`/attendance/course/${courseId}/csv`, { responseType: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(r.data);
    a.download = `${report.course.code}-attendance.csv`;
    a.click();
  };

  return (
    <>
      <h1>Reports</h1>
      <section className="panel row-form">
        <label>Course
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            {courses.map((c) => <option key={c._id} value={c._id}>{c.code} · {c.name}</option>)}
          </select>
        </label>
        <button onClick={download} disabled={!report}>Download CSV</button>
      </section>
      {report && (
        <section className="panel">
          <p className="muted">{report.total} lectures held so far</p>
          <table>
            <thead><tr><th>Student</th><th>Attended</th><th>Percent</th><th /></tr></thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={r.student._id}>
                  <td>{r.student.name}</td>
                  <td>{r.attended}/{report.total}</td>
                  <td className={r.percent < 75 && report.total ? 'low-text' : ''}>{r.percent}%</td>
                  <td style={{ width: '30%' }}><Bar percent={r.percent} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}

export default function Reports() {
  const { user } = useAuth();
  return user.role === 'student' ? <StudentView /> : <TeacherView />;
}

import { useEffect, useState } from 'react';
import api, { errorText } from '../api.js';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({ name: '', code: '', batch: '', teacher: '' });
  const [error, setError] = useState('');

  const load = () => api.get('/courses').then((r) => setCourses(r.data));
  useEffect(() => {
    load();
    api.get('/courses/teachers').then((r) => setTeachers(r.data));
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/courses', form);
      setForm({ name: '', code: '', batch: '', teacher: '' });
      load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const remove = async (c) => {
    if (!confirm(`Delete ${c.code}? Its timetable slots are removed too.`)) return;
    await api.delete(`/courses/${c._id}`);
    load();
  };

  return (
    <>
      <h1>Courses</h1>
      <form className="panel row-form" onSubmit={add}>
        <label>Name<input value={form.name} onChange={set('name')} required /></label>
        <label>Code<input value={form.code} onChange={set('code')} required /></label>
        <label>Batch<input placeholder="MCA-1-A" value={form.batch} onChange={set('batch')} required /></label>
        <label>Teacher
          <select value={form.teacher} onChange={set('teacher')} required>
            <option value="">Choose…</option>
            {teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </label>
        <button>Add course</button>
        {error && <p className="error">{error}</p>}
      </form>
      <section className="panel">
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>Batch</th><th>Teacher</th><th /></tr></thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c._id}>
                <td>{c.code}</td><td>{c.name}</td><td>{c.batch}</td><td>{c.teacher?.name}</td>
                <td><button className="ghost danger" onClick={() => remove(c)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {courses.length === 0 && <p className="muted">No courses yet. Add one above (teachers must register first).</p>}
      </section>
    </>
  );
}

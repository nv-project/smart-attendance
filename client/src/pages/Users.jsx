import { useEffect, useState } from 'react';
import api, { errorText } from '../api.js';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [msg, setMsg] = useState('');

  const load = () => api.get('/users').then((r) => setUsers(r.data));
  useEffect(() => {
    load();
    api.get('/auth/batches').then((r) => setBatches(r.data));
  }, []);

  const run = async (fn, okText) => {
    try {
      await fn();
      setMsg(okText);
      load();
    } catch (err) {
      setMsg(errorText(err));
    }
  };

  const changeBatch = (u, batch) => batch && run(() => api.patch(`/users/${u._id}`, { batch }), `${u.name} moved to ${batch}`);

  const reset = (u) => {
    const password = prompt(`New password for ${u.name} (at least 6 characters):`);
    if (password) run(() => api.post(`/users/${u._id}/reset-password`, { password }), `Password changed for ${u.name}`);
  };

  const remove = (u) => {
    if (confirm(`Delete ${u.name}? Their attendance records are deleted too.`)) run(() => api.delete(`/users/${u._id}`), `${u.name} deleted`);
  };

  return (
    <>
      <h1>Users</h1>
      {msg && <p className="success-box">{msg}</p>}
      <section className="panel" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Batch</th><th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  {u.role === 'student' ? (
                    <select value={u.batch || ''} onChange={(e) => changeBatch(u, e.target.value)}>
                      <option value="">Choose…</option>
                      {u.batch && !batches.includes(u.batch) && <option value={u.batch}>{u.batch} (no courses)</option>}
                      {batches.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  ) : '—'}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="ghost" style={{ color: 'var(--brand)' }} onClick={() => reset(u)}>Reset password</button>{' '}
                  <button className="ghost danger" onClick={() => remove(u)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
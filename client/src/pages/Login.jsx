import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import api, { errorText } from '../api.js';
import PasswordInput from '../components/PasswordInput.jsx';

export default function Login() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', batch: '' });
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/auth/batches').then((r) => setBatches(r.data)).catch(() => {});
  }, []);

  if (user) return <Navigate to="/" replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await (mode === 'login' ? login({ email: form.email, password: form.password }) : register(form));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="panel login" onSubmit={submit}>
        <h1>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
        {mode === 'register' && (
          <>
            <label>Full name<input value={form.name} onChange={set('name')} required /></label>
            <label>I am a
              <select value={form.role} onChange={set('role')}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </label>
            {form.role === 'student' && (
              <label>Batch
                <select value={form.batch} onChange={set('batch')} required>
                  <option value="">Choose your batch…</option>
                  {batches.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
            )}
          </>
        )}
        <label>Email<input type="email" value={form.email} onChange={set('email')} required /></label>
        <label>Password<PasswordInput minLength={6} value={form.password} onChange={set('password')} required /></label>
        {mode === 'login' && <Link className="forgot" to="/forgot-password">Forgot password?</Link>}
        {error && <p className="error">{error}</p>}
        <button disabled={busy}>{mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <p className="switch">
          {mode === 'login' ? 'New here?' : 'Already registered?'}{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); setError(''); setMode(mode === 'login' ? 'register' : 'login'); }}>
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </a>
        </p>
      </form>
    </div>
  );
}
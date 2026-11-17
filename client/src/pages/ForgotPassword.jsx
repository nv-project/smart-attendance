import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorText } from '../api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api.post('/auth/forgot-password', { email });
      setMessage(r.data.message);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="panel login" onSubmit={submit}>
        <h1>Reset password</h1>
        <p className="muted">Enter your account email and we’ll send you a link to set a new password.</p>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        {message && <p className="success-box">{message}</p>}
        {error && <p className="error">{error}</p>}
        <button disabled={busy}>Send reset link</button>
        <p className="switch"><Link to="/login">Back to sign in</Link></p>
      </form>
    </div>
  );
}
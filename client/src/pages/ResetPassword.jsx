import PasswordInput from '../components/PasswordInput.jsx';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorText } from '../api.js';

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('The two passwords do not match');
    setBusy(true);
    try {
      const r = await api.post(`/auth/reset-password/${token}`, { password });
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
        <h1>Set a new password</h1>
        {message ? (
          <>
            <p className="success-box">{message}</p>
            <Link className="btn" to="/login">Go to sign in</Link>
          </>
        ) : (
          <>
            <label>New password<PasswordInput minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
<label>Confirm password<PasswordInput minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>
            {error && <p className="error">{error}</p>}
            <button disabled={busy}>Update password</button>
            <p className="switch"><Link to="/forgot-password">Need a new link?</Link></p>
          </>
        )}
      </form>
    </div>
  );
}
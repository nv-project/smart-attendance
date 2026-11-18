import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorText } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

export default function ForgotPassword() {
  const { resetWithCode } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const sendCode = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api.post('/auth/forgot-password', { email });
      setMessage(r.data.message);
      setStep(2);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await resetWithCode({ email, code, password });
      navigate('/');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      {step === 1 ? (
        <form className="panel login" onSubmit={sendCode}>
          <h1>Forgot password</h1>
          <p className="muted">Enter your account email and we’ll send you a 6-digit code.</p>
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          {error && <p className="error">{error}</p>}
          <button disabled={busy}>Send code</button>
          <p className="switch"><Link to="/login">Back to sign in</Link></p>
        </form>
      ) : (
        <form className="panel login" onSubmit={verify}>
          <h1>Enter your code</h1>
          <p className="success-box">{message}</p>
          <label>6-digit code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="\d{6}"
              required
            />
          </label>
          <label>New password<PasswordInput minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {error && <p className="error">{error}</p>}
          <button disabled={busy}>Update password and sign in</button>
          <p className="switch">
            <a href="#" onClick={(e) => { e.preventDefault(); sendCode(); }}>Send a new code</a>
            {' · '}
            <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      )}
    </div>
  );
}
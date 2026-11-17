import { useState } from 'react';

export default function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <span className="pw">
      <input {...props} type={show ? 'text' : 'password'} />
      <button
        type="button"
        className="eye"
        onClick={() => setShow(!show)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </span>
  );
}
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api, { errorText } from '../api.js';

export default function Scan() {
  const [result, setResult] = useState(null); // { ok, text }
  const [manual, setManual] = useState('');
  const [cameraError, setCameraError] = useState('');
  const scanner = useRef(null);
  const busy = useRef(false);

  const submit = async (code) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const r = await api.post('/attendance/mark', { code });
      setResult({ ok: true, text: r.data.message });
    } catch (err) {
      setResult({ ok: false, text: errorText(err) });
    } finally {
      setTimeout(() => (busy.current = false), 2500); // avoid re-submitting the same frame
    }
  };

  useEffect(() => {
    let cancelled = false;
    const s = new Html5Qrcode('reader');
    scanner.current = s;
    s.start({ facingMode: 'environment' }, { fps: 10, qrbox: 240 }, (text) => submit(text), () => {})
      .catch(() => !cancelled && setCameraError('Camera is not available. Allow camera access, or type the code below.'));
    return () => {
      cancelled = true;
      s.isScanning ? s.stop().catch(() => {}) : null;
    };
  }, []);

  return (
    <>
      <h1>Scan QR</h1>
      <div className="split">
        <section className="panel">
          <div id="reader" className="reader" />
          {cameraError && <p className="error">{cameraError}</p>}
        </section>
        <section className="panel">
          {result && <p className={result.ok ? 'success' : 'error'}>{result.text}</p>}
          <form className="stack" onSubmit={(e) => { e.preventDefault(); submit(manual.trim()); setManual(''); }}>
            <label>Or type the code shown on the teacher’s screen
              <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="e.g. 9f3a1c7d2b" />
            </label>
            <button disabled={!manual.trim()}>Mark me present</button>
          </form>
        </section>
      </div>
    </>
  );
}

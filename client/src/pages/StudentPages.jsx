import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext.jsx';
import api, { apiError } from '../services/api.js';

function Message({ error, children }) { return children ? <div className={`alert ${error ? 'error' : 'success'}`}>{children}</div> : null; }

export function StudentDashboard() {
  const { user } = useAuth(); const [summary, setSummary] = useState(null); const [records, setRecords] = useState([]); const [error, setError] = useState('');
  useEffect(() => { Promise.all([api.get('/attendance/summary'), api.get('/attendance/my')]).then(([s, r]) => { setSummary(s.data.data); setRecords(r.data.data.records.slice(0, 5)); }).catch((e) => setError(apiError(e))); }, []);
  return <><div className="page-heading"><div><span className="eyebrow">Student workspace</span><h1>Hello, {user.name}</h1><p className="muted">Student ID: {user.studentId}</p></div><Link className="primary" to="/scan">Scan attendance</Link></div><Message error>{error}</Message><div className="stats-grid">{[['Sessions available', summary?.totalSessions ?? '—'], ['Sessions attended', summary?.attended ?? '—'], ['Attendance rate', summary ? `${summary.percentage}%` : '—']].map(([label, value]) => <div className="stat card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><section className="card"><h2>Recent attendance</h2>{records.length ? <div className="session-list">{records.map((record) => <div className="session-row" key={record._id}><span><strong>{record.sessionId?.subject}</strong><small>{record.sessionId?.className}</small></span><span>{new Date(record.markedAt).toLocaleString()}</span></div>)}</div> : <p className="muted">Your attendance history will appear here.</p>}</section></>;
}

export function ScannerPage() {
  const scanner = useRef(null); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [running, setRunning] = useState(false);
  useEffect(() => () => { scanner.current?.stop().catch(() => {}); }, []);
  async function submit(raw) {
    try {
      const payload = JSON.parse(raw); if (!payload.sessionId || !payload.token) throw new Error('This is not a valid attendance QR code');
      const response = await api.post('/attendance/scan', payload);
      setMessage(response.data.message); setError('');
      try { await scanner.current?.stop(); } catch { /* camera may already have stopped after the scan */ }
      setRunning(false);
    } catch (e) { setError(e.message === 'This is not a valid attendance QR code' ? e.message : apiError(e)); }
  }
  async function start() {
    setMessage(''); setError('');
    try {
      scanner.current = new Html5Qrcode('reader');
      await scanner.current.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, submit, () => {});
      setRunning(true);
    } catch (e) { setError(`Camera could not start. Allow camera permission and try again. ${e.message || ''}`); }
  }
  return <><div className="page-heading"><div><span className="eyebrow">Student workspace</span><h1>Scan attendance</h1><p className="muted">Point your camera at the teacher's active QR code.</p></div></div><Message>{message}</Message><Message error>{error}</Message><section className="card scanner-card"><div id="reader" />{!running && !message && <button className="primary" onClick={start}>Start camera</button>}{running && <button className="secondary" onClick={() => { scanner.current?.stop(); setRunning(false); }}>Stop camera</button>}{message && <Link className="secondary button-like" to="/student">Back to dashboard</Link>}</section></>;
}

export function HistoryPage() {
  const [records, setRecords] = useState([]); const [error, setError] = useState('');
  useEffect(() => { api.get('/attendance/my').then((r) => setRecords(r.data.data.records)).catch((e) => setError(apiError(e))); }, []);
  return <><h1>Attendance history</h1><Message error>{error}</Message><div className="card table-wrap"><table><thead><tr><th>Subject</th><th>Class</th><th>Status</th><th>Date and time</th></tr></thead><tbody>{records.map((r) => <tr key={r._id}><td>{r.sessionId?.subject}</td><td>{r.sessionId?.className}</td><td><span className="badge active">{r.status}</span></td><td>{new Date(r.markedAt).toLocaleString()}</td></tr>)}</tbody></table>{!records.length && <p className="muted">No attendance records yet.</p>}</div></>;
}

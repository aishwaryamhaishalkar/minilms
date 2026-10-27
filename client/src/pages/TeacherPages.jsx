import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import api, { apiError } from '../services/api.js';

function Message({ error, children }) { return children ? <div className={`alert ${error ? 'error' : 'success'}`}>{children}</div> : null; }

export function TeacherDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [fields, setFields] = useState({ subject: '', className: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  async function load() { try { setDashboard((await api.get('/sessions/dashboard')).data.data); } catch (e) { setError(apiError(e)); } }
  useEffect(() => { load(); }, []);
  async function create(event) {
    event.preventDefault(); setError('');
    try { const response = await api.post('/sessions', fields); setFields({ subject: '', className: '' }); await load(); navigate(`/teacher/session/${response.data.data.session.id}`); }
    catch (e) { setError(apiError(e)); }
  }
  return <><div className="page-heading"><div><span className="eyebrow">Teacher Portal</span><h1>Generate attendance QR</h1><p className="muted">Create a session here, start it, and display the QR code for students to scan.</p></div></div>
    <Message error>{error}</Message>
    <div className="portal-guide card"><strong>How the teacher portal works</strong><span>1. Create a subject session</span><span>2. Start attendance to generate a secure QR</span><span>3. Keep this page open while students scan from their Student Portal</span></div>
    <div className="stats-grid">{[['Students', dashboard?.students ?? '—'], ['Sessions', dashboard?.sessions ?? '—'], ['Active now', dashboard?.active ?? '—']].map(([label, value]) => <div className="stat card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="two-column"><section className="card"><h2>Create a session</h2><form onSubmit={create}><label>Subject<input required value={fields.subject} onChange={(e) => setFields({ ...fields, subject: e.target.value })} placeholder="e.g. Mathematics" /></label><label>Class name<input required value={fields.className} onChange={(e) => setFields({ ...fields, className: e.target.value })} placeholder="e.g. BCA Year 1" /></label><button className="primary">Create session</button></form></section>
      <section className="card"><h2>Recent sessions</h2>{dashboard?.recent?.length ? <div className="session-list">{dashboard.recent.map((session) => <Link to={`/teacher/session/${session.id}`} className="session-row" key={session.id}><span><strong>{session.subject}</strong><small>{session.className}</small></span><span className={`badge ${session.status}`}>{session.status}</span></Link>)}</div> : <p className="muted">No sessions created yet.</p>}</section></div></>;
}

export function ActiveSession() {
  const { id } = useParams();
  const [session, setSession] = useState(null); const [qr, setQr] = useState(null); const [error, setError] = useState('');
  async function load() {
    try {
      const details = await api.get(`/sessions/${id}`);
      setSession(details.data.data);
      if (details.data.data.session.status === 'active') {
        const code = await api.get(`/sessions/${id}/current-qr`);
        setQr(code.data.data.qr);
      }
    } catch (e) { setError(apiError(e)); }
  }
  useEffect(() => {
    load();
    const interval = setInterval(async () => {
      try {
        const details = await api.get(`/sessions/${id}`);
        setSession(details.data.data);
        if (details.data.data.session.status === 'active') {
          const code = await api.get(`/sessions/${id}/current-qr`);
          setQr(code.data.data.qr);
        }
      } catch { setError('Live updates are temporarily unavailable.'); }
    }, 2000);
    return () => clearInterval(interval);
  }, [id]);
  async function start() { try { const response = await api.post(`/sessions/${id}/start`); setSession({ ...session, session: response.data.data.session, attendanceCount: 0 }); setQr(response.data.data.qr); setError(''); } catch (e) { setError(apiError(e)); } }
  async function refresh() { try { const response = await api.post(`/sessions/${id}/refresh-qr`); setQr(response.data.data.qr); setError(''); } catch (e) { setError(apiError(e)); } }
  async function end() { try { await api.post(`/sessions/${id}/end`); await load(); } catch (e) { setError(apiError(e)); } }
  const details = session?.session || session;
  const qrValue = qr && JSON.stringify({ sessionId: id, token: qr.token });
  return <><Link className="back-link" to="/teacher">← Back to dashboard</Link><div className="page-heading"><div><span className="eyebrow">Live session</span><h1>{details?.subject || 'Session'}</h1><p className="muted">{details?.className}</p></div><span className={`badge ${details?.status}`}>{details?.status}</span></div><Message error>{error}</Message>
    <div className="two-column active-layout"><section className="card qr-panel">{details?.status === 'active' && qr ? <><QRCodeCanvas value={qrValue} size={280} includeMargin /><p className="muted">Students scan this code with the Scan page.</p><p className="countdown">Expires {new Date(qr.expiresAt).toLocaleTimeString()}</p><button className="secondary" onClick={refresh}>Refresh QR</button></> : <p className="muted">Start this session to generate a QR code.</p>}</section><section className="card"><h2>Session controls</h2><div className="big-count"><strong>{session?.attendanceCount ?? 0}</strong><span>students present</span></div>{details?.status !== 'active' && !details?.endedAt && <button className="primary full" onClick={start}>Start attendance</button>}{details?.status === 'active' && <button className="danger full" onClick={end}>End attendance</button>}{details?.status === 'ended' && <p className="muted">This session has ended and cannot be restarted.</p>}<Link className="secondary full button-like" to={`/teacher/session/${id}/records`}>View attendance records</Link></section></div></>;
}

export function SessionRecords() {
  const { id } = useParams(); const [records, setRecords] = useState([]); const [error, setError] = useState('');
  useEffect(() => { api.get(`/sessions/${id}/attendance`).then((r) => setRecords(r.data.data.records)).catch((e) => setError(apiError(e))); }, [id]);
  return <><Link className="back-link" to={`/teacher/session/${id}`}>← Back to session</Link><h1>Attendance records</h1><Message error>{error}</Message><div className="card table-wrap"><table><thead><tr><th>Student</th><th>Student ID</th><th>Status</th><th>Marked at</th></tr></thead><tbody>{records.map((record) => <tr key={record._id}><td>{record.studentId?.name}</td><td>{record.studentId?.studentId}</td><td><span className="badge active">{record.status}</span></td><td>{new Date(record.markedAt).toLocaleString()}</td></tr>)}</tbody></table>{!records.length && <p className="muted">No attendance records yet.</p>}</div></>;
}

export function ReportsPage() {
  const [records, setRecords] = useState([]); const [sessions, setSessions] = useState([]); const [selected, setSelected] = useState(''); const [error, setError] = useState('');
  async function load() { try { const [r, s] = await Promise.all([api.get(`/attendance/reports${selected ? `?sessionId=${selected}` : ''}`), api.get('/sessions')]); setRecords(r.data.data.records); setSessions(s.data.data.sessions); } catch (e) { setError(apiError(e)); } }
  useEffect(() => { load(); }, [selected]);
  function csv() { const rows = [['Student', 'Student ID', 'Subject', 'Class', 'Status', 'Marked at'], ...records.map((r) => [r.studentId?.name, r.studentId?.studentId, r.sessionId?.subject, r.sessionId?.className, r.status, new Date(r.markedAt).toISOString()])]; const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'attendance-report.csv'; link.click(); URL.revokeObjectURL(link.href); }
  return <><div className="page-heading"><div><span className="eyebrow">Teacher workspace</span><h1>Attendance reports</h1></div><button className="secondary" onClick={csv} disabled={!records.length}>Export CSV</button></div><Message error>{error}</Message><div className="card filter-bar"><label>Filter by session<select value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">All sessions</option>{sessions.map((s) => <option value={s.id} key={s.id}>{s.subject} — {s.className}</option>)}</select></label></div><div className="card table-wrap"><table><thead><tr><th>Student</th><th>Student ID</th><th>Subject</th><th>Class</th><th>Status</th><th>Marked at</th></tr></thead><tbody>{records.map((r) => <tr key={r._id}><td>{r.studentId?.name}</td><td>{r.studentId?.studentId}</td><td>{r.sessionId?.subject}</td><td>{r.sessionId?.className}</td><td>{r.status}</td><td>{new Date(r.markedAt).toLocaleString()}</td></tr>)}</tbody></table>{!records.length && <p className="muted">No records match this filter.</p>}</div></>;
}

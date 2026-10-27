import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiError } from '../services/api.js';

function AuthForm({ register = false }) {
  const { login, register: signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [fields, setFields] = useState({ name: '', email: '', password: '', studentId: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (register) await signUp(fields); else await login(fields.email, fields.password);
      const requestedPath = searchParams.get('next');
      navigate(register ? '/student' : (requestedPath || (JSON.parse(localStorage.getItem('attendance_user')).role === 'teacher' ? '/teacher/portal' : '/student')));
    } catch (requestError) { setError(apiError(requestError)); } finally { setBusy(false); }
  }
  return <section className="auth-card card">
    <h1>{register ? 'Create student account' : 'Welcome back'}</h1>
    <p className="muted">{register ? 'Register to scan attendance QR codes.' : 'Sign in to manage or mark attendance.'}</p>
    {error && <div className="alert error">{error}</div>}
    <form onSubmit={submit}>
      {register && <><label>Full name<input required value={fields.name} onChange={(e) => setFields({ ...fields, name: e.target.value })} /></label>
        <label>Student ID<input required value={fields.studentId} onChange={(e) => setFields({ ...fields, studentId: e.target.value })} /></label></>}
      <label>Email<input type="email" required value={fields.email} onChange={(e) => setFields({ ...fields, email: e.target.value })} /></label>
      <label>Password<input type="password" minLength="6" required value={fields.password} onChange={(e) => setFields({ ...fields, password: e.target.value })} /></label>
      <button className="primary full" disabled={busy}>{busy ? 'Please wait...' : register ? 'Register' : 'Log in'}</button>
    </form>
    <p className="auth-switch">{register ? 'Already registered?' : 'Need a student account?'} <Link to={register ? '/login' : '/register'}>{register ? 'Log in' : 'Register'}</Link></p>
  </section>;
}

export function LoginPage() { return <AuthForm />; }
export function RegisterPage() { return <AuthForm register />; }

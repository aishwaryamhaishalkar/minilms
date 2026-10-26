import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function HomePage() {
  const { user } = useAuth();
  return <section className="hero">
    <div>
      <span className="eyebrow">Simple. Secure. Real-time.</span>
      <h1>Attendance that keeps everyone moving.</h1>
      <p>Teachers create a short-lived QR code. Students scan it, and every successful scan rotates the code from the backend.</p>
      <div className="actions">{user ? <Link className="primary" to={user.role === 'teacher' ? '/teacher' : '/student'}>Open dashboard</Link> : <><Link className="primary" to="/login">Log in</Link><Link className="secondary" to="/register">Register as student</Link></>}</div>
    </div>
    <div className="hero-card card"><strong>Single-use QR tokens</strong><span>Hashed in MongoDB</span><strong>Role-based access</strong><span>JWT authenticated</span><strong>Persistent records</strong><span>Real database, no mock data</span></div>
  </section>;
}

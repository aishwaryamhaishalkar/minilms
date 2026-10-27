import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function HomePage() {
  const { user } = useAuth();
  const teacherPortal = user?.role === 'teacher' ? '/teacher/portal' : '/login?next=/teacher/portal';
  return <section className="hero">
    <div>
      <span className="eyebrow">Simple. Secure. Real-time.</span>
      <h1>Attendance that keeps everyone moving.</h1>
      <p>Teachers create a short-lived QR code. Students scan it, and every successful scan rotates the code from the backend.</p>
      <div className="actions">
        {user ? <>{user.role === 'teacher' ? <Link className="primary" to={teacherPortal}>Generate QR code</Link> : <><Link className="primary" to="/scan">Scan attendance</Link><Link className="secondary" to="/student">Student dashboard</Link></>}</> : <><Link className="primary" to="/login?next=/teacher/portal">Teacher login</Link><Link className="secondary" to="/login">Student login</Link><Link className="secondary" to="/register">Register student</Link></>}
      </div>
      <div className="portal-callout"><strong>Teacher Portal</strong><span>Login, create a class session, and generate the QR code students will scan.</span><Link to={teacherPortal}>Open teacher portal →</Link></div>
    </div>
    <div className="hero-card card"><strong>Single-use QR tokens</strong><span>Hashed in MongoDB</span><strong>Role-based access</strong><span>JWT authenticated</span><strong>Persistent records</strong><span>Real database, no mock data</span></div>
  </section>;
}

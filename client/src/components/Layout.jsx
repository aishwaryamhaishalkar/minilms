import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="app-shell">
      <header className="navbar">
        <Link className="brand" to="/">QR Attendance</Link>
        {user && <nav>
          <Link to={user.role === 'teacher' ? '/teacher' : '/student'}>Dashboard</Link>
          {user.role === 'student' && <Link to="/scan">Scan</Link>}
          {user.role === 'student' && <Link to="/history">History</Link>}
          {user.role === 'teacher' && <Link className="portal-nav-link" to="/teacher/portal">Generate QR</Link>}
          {user.role === 'teacher' && <Link to="/teacher/portal">Teacher Portal</Link>}
          {user.role === 'teacher' && <Link to="/reports">Reports</Link>}
          <button className="link-button" onClick={() => { logout(); navigate('/login'); }}>Log out</button>
        </nav>}
      </header>
      <main className="container">{children}</main>
    </div>
  );
}

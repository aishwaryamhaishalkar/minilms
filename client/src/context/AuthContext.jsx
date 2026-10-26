import { createContext, useContext, useMemo, useState } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('attendance_user')) || null; } catch { return null; }
  });

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('attendance_token', data.data.token);
    localStorage.setItem('attendance_user', JSON.stringify(data.data.user));
    setUser(data.data.user);
  }

  async function register(fields) {
    const { data } = await api.post('/auth/register', fields);
    localStorage.setItem('attendance_token', data.data.token);
    localStorage.setItem('attendance_user', JSON.stringify(data.data.user));
    setUser(data.data.user);
  }

  function logout() {
    localStorage.removeItem('attendance_token');
    localStorage.removeItem('attendance_user');
    setUser(null);
  }

  const value = useMemo(() => ({ user, login, register, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

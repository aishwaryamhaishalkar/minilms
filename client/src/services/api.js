import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('attendance_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function apiError(error) {
  return (
    error.response?.data?.message ||
    'Unable to reach the server. Check that the backend is running.'
  );
}

export default api;
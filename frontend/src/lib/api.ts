import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Basic error handler
    // Ignore 401s from /auth/me to prevent race conditions during login navigation
    if (
      error.response?.status === 401 && 
      typeof window !== 'undefined' && 
      !window.location.pathname.includes('/login') &&
      !error.config?.url?.includes('/auth/me')
    ) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

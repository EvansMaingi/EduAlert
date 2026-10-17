import axios from 'axios';

export const TOKEN_KEY = 'edualert_token';
export const USER_KEY = 'edualert_user';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
});

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// The server returns 401 for a missing, invalid or expired token, so the session
// is unusable: clear it and send the user to login. 403 means the user is logged
// in but lacks the role for that action, so it's left for the page to handle.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginRequest = error.config?.url?.includes('/api/auth/login');
    if (status === 401 && !isLoginRequest) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;

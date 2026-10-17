import axios from 'axios';

// Student Portal session, kept separate from the staff session (api/axios.js)
// so the two never mix.
export const STUDENT_TOKEN_KEY = 'edualert_student_token';
export const STUDENT_KEY = 'edualert_student';

export function getStudentToken() {
  return localStorage.getItem(STUDENT_TOKEN_KEY);
}

export function saveStudentSession(token, student) {
  localStorage.setItem(STUDENT_TOKEN_KEY, token);
  localStorage.setItem(STUDENT_KEY, JSON.stringify(student));
}

export function clearStudentSession() {
  localStorage.removeItem(STUDENT_TOKEN_KEY);
  localStorage.removeItem(STUDENT_KEY);
}

const studentApi = axios.create({
  baseURL: 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
});

studentApi.interceptors.request.use((config) => {
  const token = getStudentToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A missing, invalid or expired token: end the session and go back to login.
studentApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/api/auth/student-login');
    if (error.response?.status === 401 && !isLoginRequest) {
      clearStudentSession();
      window.location.href = '/student-login';
    }
    return Promise.reject(error);
  }
);

export default studentApi;

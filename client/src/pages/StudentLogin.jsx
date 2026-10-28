import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import studentApi, { getStudentToken, saveStudentSession } from '../api/studentApi';

export default function StudentLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (getStudentToken()) {
    return <Navigate to="/student-portal" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await studentApi.post('/api/auth/student-login', { email, password });
      saveStudentSession(data.token, data.student);
      navigate('/student-portal', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to reach the server');
      setSubmitting(false);
    }
  }

  // The server only accepts emails that already exist in the students table.
  async function handleGoogleLogin(credentialResponse) {
    setError('');
    try {
      const { data } = await studentApi.post('/api/auth/student-google', {
        credential: credentialResponse.credential,
      });
      saveStudentSession(data.token, data.student);
      navigate('/student-portal', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold text-indigo-700">EduAlert</h1>
        <p className="mt-1 text-sm font-medium text-slate-700">Student Portal</p>
        <p className="mb-6 mt-1 text-sm text-slate-500">Sign in with your university email</p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </label>

        <label className="mb-6 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="my-4 text-center text-sm text-slate-500">or</div>
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={() => setError('Google sign-in failed')}
            width="320"
            text="signin_with"
            shape="rectangular"
          />
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Staff member?{' '}
          <Link to="/" className="font-medium text-indigo-700 hover:underline">
            Staff login
          </Link>
        </p>
      </form>
    </div>
  );
}

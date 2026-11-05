import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, loginWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to reach the server');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin(credentialResponse) {
    setError('');
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold text-brand-300">EduAlert</h1>
        <p className="mb-6 mt-1 text-sm text-fg-muted">Sign in to continue</p>

        {error && (
          <div className="mb-4 rounded-lg bg-risk-high/15 px-3 py-2 text-sm text-red-300">{error}</div>
        )}

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-fg-2">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </label>

        <label className="mb-6 block">
          <span className="mb-1 block text-sm font-medium text-fg-2">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand font-semibold shadow-[0_1px_3px_rgba(37,99,235,.3)] py-2 text-sm text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="my-4 text-center text-sm text-fg-muted">or</div>
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={() => setError('Google sign-in failed')}
            width="320"
            text="signin_with"
            shape="rectangular"
          />
        </div>

        <p className="mt-6 text-center text-sm text-fg-muted">
          Are you a student?{' '}
          <Link to="/student-login" className="font-medium text-brand-300 hover:underline">
            Click here
          </Link>
        </p>
      </form>
    </div>
  );
}

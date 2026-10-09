import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <span className="text-lg font-semibold text-indigo-700">EduAlert</span>
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-slate-600">
            {user.full_name || user.email}
            <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-500">
              {user.role}
            </span>
          </span>
        )}
        <button
          onClick={handleLogout}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

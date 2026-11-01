import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/initials';

// Top bar title for each staff page.
const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/students': 'Students',
  '/add-student': 'Add Student',
  '/interventions': 'Interventions',
  '/support-requests': 'Support Requests',
  '/notifications': 'Notifications',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const name = user?.full_name || user?.email || '';
  const title =
    pathname === '/students' && user?.role !== 'admin' ? 'At-Risk Students' : PAGE_TITLES[pathname] || 'EduAlert';

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-6">
      <span className="page-title text-lg font-bold text-fg">{title}</span>
      <div className="flex items-center gap-3">
        {user && (
          <span
            title={name}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white"
          >
            {initials(name)}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="rounded-lg border border-line bg-transparent px-3 py-1.5 text-sm font-medium text-fg-2 hover:bg-surface-2"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

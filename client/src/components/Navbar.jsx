import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/initials';

// Top bar title for each staff page.
const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/students': 'Students',
  '/add-student': 'Add Student',
  '/users': 'Users',
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
    <header className="flex h-14 items-center justify-between border-b border-line bg-sidebar px-6">
      <span className="page-title text-lg font-bold text-fg">{title}</span>
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2.5">
            <span className="text-right">
              <span className="block text-sm font-medium leading-tight text-fg">{name}</span>
              <span className="block text-xs capitalize leading-tight text-fg-muted">{user.role}</span>
            </span>
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white"
            >
              {initials(name)}
            </span>
          </div>
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

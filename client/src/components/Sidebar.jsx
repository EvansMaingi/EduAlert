import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/initials';

// 16px stroke icons for the nav links.
const ICONS = {
  dashboard: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  students: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  addStudent: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m10-3v6m3-3h-6',
  users: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10',
  interventions: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2m1-2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1m0 12 2 2 4-4',
  support: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  notifications: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9m-4.27 13a2 2 0 0 1-3.46 0',
};

const linksByRole = {
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/students', label: 'Students', icon: 'students' },
    { to: '/add-student', label: 'Add Student', icon: 'addStudent' },
    { to: '/users', label: 'Users', icon: 'users' },
    { to: '/interventions', label: 'Interventions', icon: 'interventions' },
    { to: '/support-requests', label: 'Support Requests', icon: 'support' },
    { to: '/notifications', label: 'Notifications', icon: 'notifications' },
  ],
  lecturer: [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/students', label: 'At-Risk Students', icon: 'students' },
    { to: '/interventions', label: 'Interventions', icon: 'interventions' },
    { to: '/support-requests', label: 'Support Requests', icon: 'support' },
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  const links = user?.role === 'admin' ? linksByRole.admin : linksByRole.lecturer;
  const name = user?.full_name || user?.email || '';

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-sidebar text-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/40 bg-white/20 font-display text-sm font-extrabold">
          EA
        </span>
        <span>
          <span className="block font-display text-base font-bold leading-tight">EduAlert</span>
          <span className="block text-xs text-fg-muted">Early warning system</span>
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg border-l-[3px] px-3 py-2 text-sm font-medium text-white ${
                isActive ? 'border-brand-400 bg-sidebar-active' : 'border-transparent hover:bg-white/5'
              }`
            }
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0 text-fg-muted"
            >
              <path d={ICONS[icon]} />
            </svg>
            {label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="m-3 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/50 bg-white/[.22] text-xs font-semibold">
            {initials(name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block text-xs capitalize text-fg-muted">{user.role}</span>
          </span>
        </div>
      )}
    </aside>
  );
}

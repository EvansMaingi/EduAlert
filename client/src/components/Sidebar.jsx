import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/initials';

const linksByRole = {
  admin: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/students', label: 'Students' },
    { to: '/add-student', label: 'Add Student' },
    { to: '/interventions', label: 'Interventions' },
    { to: '/support-requests', label: 'Support Requests' },
    { to: '/notifications', label: 'Notifications' },
  ],
  lecturer: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/students', label: 'At-Risk Students' },
    { to: '/interventions', label: 'Interventions' },
    { to: '/support-requests', label: 'Support Requests' },
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  const links = user?.role === 'admin' ? linksByRole.admin : linksByRole.lecturer;
  const name = user?.full_name || user?.email || '';

  return (
    <aside className="flex w-56 shrink-0 flex-col bg-sidebar text-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/40 bg-white/20 font-display text-sm font-extrabold">
          EA
        </span>
        <span>
          <span className="block font-display text-base font-bold leading-tight">EduAlert</span>
          <span className="block text-xs text-white/80">Early warning system</span>
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative rounded-lg px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'bg-white/20 text-white before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r before:bg-white'
                  : 'text-[rgba(191,219,254,.75)] hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="m-3 flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/50 bg-white/[.22] text-xs font-semibold">
            {initials(name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block text-xs capitalize text-white/75">{user.role}</span>
          </span>
        </div>
      )}
    </aside>
  );
}

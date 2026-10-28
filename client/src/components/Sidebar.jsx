import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

  return (
    <aside className="w-52 shrink-0 border-r border-slate-200 bg-white p-4">
      <nav className="flex flex-col gap-1">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm font-medium ${
                isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

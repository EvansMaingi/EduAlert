import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Interventions from './pages/Interventions';
import AddStudent from './pages/AddStudent';
import Notifications from './pages/Notifications';
import StudentRoute from './components/StudentRoute';
import StudentLogin from './pages/StudentLogin';
import StudentPortal from './pages/StudentPortal';

// Shell shared by every authenticated page.
function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-x-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Navigate to="/" replace />} />

      {/* Student Portal: its own login and token, outside the staff layout. */}
      <Route path="/student-login" element={<StudentLogin />} />
      <Route element={<StudentRoute />}>
        <Route path="/student-portal" element={<StudentPortal />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/interventions" element={<Interventions />} />
          <Route path="/add-student" element={<AddStudent />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

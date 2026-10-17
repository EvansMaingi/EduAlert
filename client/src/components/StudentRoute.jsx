import { Navigate, Outlet } from 'react-router-dom';
import { getStudentToken } from '../api/studentApi';

export default function StudentRoute() {
  return getStudentToken() ? <Outlet /> : <Navigate to="/student-login" replace />;
}

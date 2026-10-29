import { Navigate, Outlet, useLocation } from 'react-router-dom'; import { useAuth } from '../hooks/useAuth'; import Loading from './Loading';
export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (isAuthenticated) return <Outlet />;
  const studentArea = location.pathname.startsWith('/student/');
  return <Navigate to={studentArea ? '/login/student' : '/login'} replace state={{ from: location.pathname, message: studentArea ? 'Please sign in or create a student account to continue.' : undefined }} />;
}

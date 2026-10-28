import { Navigate, Outlet } from 'react-router-dom'; import { useAuth } from '../hooks/useAuth'; import { roleHome } from '../utils/roles';
export default function RoleRoute({ role }) { const { user } = useAuth(); return user?.role === role ? <Outlet /> : <Navigate to={roleHome(user?.role)} replace />; }

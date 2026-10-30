import { Navigate, Outlet } from 'react-router-dom'; import { useAuth } from '../hooks/useAuth'; import { roleHome } from '../utils/roles';
export default function RoleRoute({ role }) { const { user } = useAuth(); const allowedRoles = Array.isArray(role) ? role : [role]; return allowedRoles.includes(user?.role) ? <Outlet /> : <Navigate to={roleHome(user?.role)} replace />; }

import { Navigate, Outlet } from 'react-router-dom'; import { useAuth } from '../hooks/useAuth'; import Loading from './Loading';
export default function ProtectedRoute() { const { isAuthenticated, loading } = useAuth(); if (loading) return <Loading />; return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />; }

import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import api, { unwrap } from '../api/axios';
import Loading from './Loading';
import { useAuth } from '../hooks/useAuth';
import { roleHome } from '../utils/roles';

const validEnrollment = (enrollment) => (
  enrollment?.status === 'ACTIVE' &&
  ['PAID', 'MANUAL'].includes(enrollment?.paymentStatus)
);

export default function StudentPurchaseRoute() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [access, setAccess] = useState('checking');

  useEffect(() => {
    let active = true;

    if (authLoading) return undefined;
    if (!user || user.role !== 'STUDENT') {
      setAccess('denied');
      return undefined;
    }

    setAccess('checking');
    api.get('/enrollments/me')
      .then((response) => {
        if (!active) return;
        const enrollments = unwrap(response);
        setAccess(Array.isArray(enrollments) && enrollments.some(validEnrollment) ? 'allowed' : 'denied');
      })
      .catch(() => {
        if (active) setAccess('denied');
      });

    return () => { active = false; };
  }, [authLoading, user?.id, user?.role]);

  if (authLoading || (user?.role === 'STUDENT' && access === 'checking')) {
    return <Loading label="Checking student access..." fullScreen />;
  }

  if (!user) {
    return (
      <Navigate
        to="/login/student"
        replace
        state={{
          from: location.pathname,
          message: 'Please sign in or create a student account to open your dashboard.',
        }}
      />
    );
  }

  if (user.role !== 'STUDENT') return <Navigate to={roleHome(user.role)} replace />;

  if (access !== 'allowed') {
    return (
      <Navigate
        to="/courses"
        replace
        state={{ message: 'Purchase a course to unlock your student dashboard and profile.' }}
      />
    );
  }

  return <Outlet />;
}

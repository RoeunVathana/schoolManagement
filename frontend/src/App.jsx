import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { ConfirmProvider } from './context/ConfirmContext';
import AppRoutes from './routes/AppRoutes';
import Seo from './components/Seo';

function RouteSeo() {
  const { pathname } = useLocation();
  if (pathname === '/' || pathname === '/courses' || pathname.startsWith('/courses/') || pathname === '/community') return null;

  const privateRoute = /^(\/admin|\/teacher|\/student|\/customer|\/profile|\/friends|\/groups|\/chat)/.test(pathname);
  const authRoute = /^(\/login|\/register|\/forgot-password)/.test(pathname);
  const title = pathname.startsWith('/login')
    ? 'Sign in | CampusFlow LMS'
    : pathname === '/register'
      ? 'Create an account | CampusFlow LMS'
      : pathname === '/forgot-password'
        ? 'Recover your account | CampusFlow LMS'
        : 'CampusFlow LMS';
  const description = pathname.startsWith('/login')
    ? 'Sign in to CampusFlow LMS to access your courses, assignments, teachers, and learning progress.'
    : 'CampusFlow LMS is a practical online learning platform for students, teachers, and learning communities in Cambodia.';

  return <Seo title={title} description={description} path={pathname} noindex={privateRoute || authRoute || pathname === '/404'} />;
}

export default function App() {
  return <BrowserRouter><RouteSeo /><ThemeProvider><LanguageProvider><AuthProvider><ConfirmProvider><AppRoutes /></ConfirmProvider></AuthProvider></LanguageProvider></ThemeProvider></BrowserRouter>;
}

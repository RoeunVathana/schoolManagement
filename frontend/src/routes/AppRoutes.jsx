import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import RoleRoute from '../components/RoleRoute';
import StudentPurchaseRoute from '../components/StudentPurchaseRoute';
import AdminLayout from '../layouts/AdminLayout';
import TeacherLayout from '../layouts/TeacherLayout';
import StudentLayout from '../layouts/StudentLayout';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import AdminDashboard from '../pages/admin/Dashboard';
import Students from '../pages/admin/Students';
import Teachers from '../pages/admin/Teachers';
import Courses from '../pages/admin/Courses';
import Users from '../pages/admin/Users';
import AdminSimple from '../pages/admin/Simple';
import AdminTelegramSettings from '../pages/admin/TelegramSettings';
import AdminCertificates from '../pages/admin/Certificates';
import AdminTeacherAttendance from '../pages/admin/TeacherAttendance';
import TeacherDashboard from '../pages/teacher/Dashboard';
import TeacherAttendance from '../pages/teacher/Attendance';
import TeacherSimple from '../pages/teacher/Simple';
import TeacherCertificates from '../pages/teacher/Certificates';
import StudentDashboard from '../pages/student/Dashboard';
import StudentSimple from '../pages/student/Simple';
import StudentCertificates from '../pages/student/Certificates';
import Profile from '../pages/profile/Profile';
import Storefront from '../pages/storefront/Storefront';
import { useAuth } from '../hooks/useAuth';
import { roleHome } from '../utils/roles';
import AppShell from '../layouts/AppShell';
import PublicProfile from '../pages/community/PublicProfile';
import Friends from '../pages/community/Friends';

function Home() { const { user } = useAuth(); return <Navigate to={roleHome(user?.role)} replace />; }

export default function AppRoutes() {
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/login/admin" element={<Login />} />
    <Route path="/login/teacher" element={<Login />} />
    <Route path="/login/student" element={<Login />} />
    <Route path="/login/customer" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/courses" element={<Storefront />} />
    <Route path="/courses/:id" element={<Storefront />} />
    <Route path="/" element={<Storefront />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<RoleRoute role="ADMIN" />}>
        <Route element={<AdminLayout />}>
          <Route path="admin/dashboard" element={<AdminDashboard />} />
          <Route path="admin/profile" element={<Profile />} />
          <Route path="admin/students" element={<Students />} />
          <Route path="admin/teachers" element={<Teachers />} />
          <Route path="admin/courses" element={<Courses />} />
          <Route path="admin/users" element={<Users />} />
          <Route path="admin/telegram-settings" element={<AdminTelegramSettings />} />
          <Route path="admin/certificates" element={<AdminCertificates />} />
          <Route path="admin/teacher-attendance" element={<AdminTeacherAttendance />} />
          <Route path="admin/:section" element={<AdminSimple />} />
        </Route>
      </Route>
      <Route element={<RoleRoute role="TEACHER" />}>
        <Route element={<TeacherLayout />}>
          <Route path="teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="teacher/profile" element={<Profile />} />
          <Route path="teacher/attendance" element={<TeacherAttendance />} />
          <Route path="teacher/certificates" element={<TeacherCertificates />} />
          <Route path="teacher/:section" element={<TeacherSimple />} />
        </Route>
      </Route>
      <Route element={<RoleRoute role="STUDENT" />}>
        <Route element={<StudentPurchaseRoute />}>
          <Route element={<StudentLayout />}>
            <Route path="student/dashboard" element={<StudentDashboard />} />
            <Route path="student/profile" element={<Profile />} />
            <Route path="student/certificates" element={<StudentCertificates />} />
            <Route path="student/:section" element={<StudentSimple />} />
          </Route>
        </Route>
      </Route>
      <Route element={<AppShell />}>
        <Route path="profile/:id" element={<PublicProfile />} />
        <Route path="friends" element={<Friends />} />
        <Route path="customer/profile" element={<Profile />} />
      </Route>
    </Route>
  </Routes>;
}

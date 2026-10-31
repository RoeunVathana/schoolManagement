import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import RoleRoute from '../components/RoleRoute';
import StudentPurchaseRoute from '../components/StudentPurchaseRoute';
import AdminLayout from '../layouts/AdminLayout';
import TeacherLayout from '../layouts/TeacherLayout';
import StudentLayout from '../layouts/StudentLayout';
import { useAuth } from '../hooks/useAuth';
import { roleHome } from '../utils/roles';
import AppShell from '../layouts/AppShell';

const Login = lazy(() => import('../pages/auth/Login'));
const Register = lazy(() => import('../pages/auth/Register'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));
const Students = lazy(() => import('../pages/admin/Students'));
const Teachers = lazy(() => import('../pages/admin/Teachers'));
const Courses = lazy(() => import('../pages/admin/Courses'));
const Users = lazy(() => import('../pages/admin/Users'));
const AdminSimple = lazy(() => import('../pages/admin/Simple'));
const AdminTelegramSettings = lazy(() => import('../pages/admin/TelegramSettings'));
const AdminCertificates = lazy(() => import('../pages/admin/Certificates'));
const AdminTeacherAttendance = lazy(() => import('../pages/admin/TeacherAttendance'));
const AdminCommunity = lazy(() => import('../pages/admin/Community'));
const TeacherDashboard = lazy(() => import('../pages/teacher/Dashboard'));
const TeacherAttendance = lazy(() => import('../pages/teacher/Attendance'));
const TeacherSimple = lazy(() => import('../pages/teacher/Simple'));
const TeacherCertificates = lazy(() => import('../pages/teacher/Certificates'));
const StudentDashboard = lazy(() => import('../pages/student/Dashboard'));
const StudentSimple = lazy(() => import('../pages/student/Simple'));
const StudentCertificates = lazy(() => import('../pages/student/Certificates'));
const Profile = lazy(() => import('../pages/profile/Profile'));
const Storefront = lazy(() => import('../pages/storefront/Storefront'));
const PublicProfile = lazy(() => import('../pages/community/PublicProfile'));
const Friends = lazy(() => import('../pages/community/Friends'));
const Chat = lazy(() => import('../pages/community/Chat'));
const CommunityLanding = lazy(() => import('../pages/community/CommunityLanding'));
const Groups = lazy(() => import('../pages/community/Groups'));
const NotFound = lazy(() => import('../pages/NotFound'));

function Home() { const { user } = useAuth(); return <Navigate to={roleHome(user?.role)} replace />; }

export default function AppRoutes() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#f4f8fb] px-6 text-sm font-semibold text-slate-500">Loading CampusFlow...</div>}><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/login/admin" element={<Login />} />
    <Route path="/login/teacher" element={<Login />} />
    <Route path="/login/student" element={<Login />} />
    <Route path="/login/customer" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/courses" element={<Storefront />} />
    <Route path="/courses/:id" element={<Storefront />} />
    <Route path="/community" element={<CommunityLanding />} />
    <Route path="/404" element={<NotFound />} />
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
          <Route path="admin/community" element={<AdminCommunity />} />
          <Route path="admin/materials" element={<TeacherSimple />} />
          <Route path="admin/assignments" element={<TeacherSimple />} />
          <Route path="admin/submissions" element={<TeacherSimple />} />
          <Route path="admin/exams" element={<TeacherSimple />} />
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
      <Route element={<RoleRoute role={['STUDENT', 'CUSTOMER']} />}>
        {/* Students should always be able to edit their own profile. */}
        <Route element={<StudentLayout />}>
          <Route path="student/profile" element={<Profile />} />
        </Route>
        <Route element={<StudentPurchaseRoute />}>
          <Route element={<StudentLayout />}>
            <Route path="student/dashboard" element={<StudentDashboard />} />
            <Route path="student/certificates" element={<StudentCertificates />} />
            <Route path="student/:section" element={<StudentSimple />} />
          </Route>
        </Route>
      </Route>
      <Route element={<AppShell />}>
        <Route path="profile/:id" element={<PublicProfile />} />
        <Route path="friends" element={<Friends />} />
        <Route path="groups" element={<Groups />} />
        <Route path="chat" element={<Chat />} />
        <Route path="customer/profile" element={<Profile />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/404" replace />} />
  </Routes></Suspense>;
}

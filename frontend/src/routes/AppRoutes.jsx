import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import RoleRoute from '../components/RoleRoute';
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
import TeacherDashboard from '../pages/teacher/Dashboard';
import TeacherAttendance from '../pages/teacher/Attendance';
import TeacherSimple from '../pages/teacher/Simple';
import StudentDashboard from '../pages/student/Dashboard';
import StudentSimple from '../pages/student/Simple';
import Profile from '../pages/profile/Profile';
import { useAuth } from '../hooks/useAuth';
import { roleHome } from '../utils/roles';

function Home() { const { user } = useAuth(); return <Navigate to={roleHome(user?.role)} replace />; }

export default function AppRoutes() {
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/login/admin" element={<Login />} />
    <Route path="/login/teacher" element={<Login />} />
    <Route path="/login/student" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route element={<ProtectedRoute />}>
      <Route index element={<Home />} />
      <Route element={<RoleRoute role="ADMIN" />}>
        <Route element={<AdminLayout />}>
          <Route path="admin/dashboard" element={<AdminDashboard />} />
          <Route path="admin/profile" element={<Profile />} />
          <Route path="admin/students" element={<Students />} />
          <Route path="admin/teachers" element={<Teachers />} />
          <Route path="admin/courses" element={<Courses />} />
          <Route path="admin/users" element={<Users />} />
          <Route path="admin/:section" element={<AdminSimple />} />
        </Route>
      </Route>
      <Route element={<RoleRoute role="TEACHER" />}>
        <Route element={<TeacherLayout />}>
          <Route path="teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="teacher/profile" element={<Profile />} />
          <Route path="teacher/attendance" element={<TeacherAttendance />} />
          <Route path="teacher/:section" element={<TeacherSimple />} />
        </Route>
      </Route>
      <Route element={<RoleRoute role="STUDENT" />}>
        <Route element={<StudentLayout />}>
          <Route path="student/dashboard" element={<StudentDashboard />} />
          <Route path="student/profile" element={<Profile />} />
          <Route path="student/:section" element={<StudentSimple />} />
        </Route>
      </Route>
    </Route>
  </Routes>;
}

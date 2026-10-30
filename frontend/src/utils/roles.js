export const roleHome = (role) => ({ ADMIN: '/admin/dashboard', TEACHER: '/teacher/dashboard', STUDENT: '/student/dashboard', CUSTOMER: '/friends' }[role] || '/login');

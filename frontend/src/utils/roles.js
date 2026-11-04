// Learners land on the public CampusFlow frontend after sign-in. Their
// dashboard remains available from the navigation when they choose it.
export const roleHome = (role) => ({ ADMIN: '/admin/dashboard', TEACHER: '/teacher/dashboard', STUDENT: '/', CUSTOMER: '/' }[role] || '/login');

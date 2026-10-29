import { PrismaClient, Role, CourseStatus, DayOfWeek, AttendanceStatus, SubmissionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const d = (value: string) => new Date(value);

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.deleteMany(); await tx.notification.deleteMany(); await tx.grade.deleteMany(); await tx.submission.deleteMany(); await tx.examResult.deleteMany(); await tx.exam.deleteMany(); await tx.attendance.deleteMany(); await tx.assignment.deleteMany(); await tx.announcement.deleteMany(); await tx.classSchedule.deleteMany(); await tx.enrollment.deleteMany(); await tx.course.deleteMany(); await tx.student.deleteMany(); await tx.teacher.deleteMany(); await tx.semester.deleteMany(); await tx.academicYear.deleteMany(); await tx.user.deleteMany();
    const password = async (v: string) => bcrypt.hash(v, 12);
    const admin = await tx.user.create({ data: { fullName: 'System Administrator', email: 'vothanarern@gmail.com', password: await password('016555637'), role: Role.ADMIN } });
    const teacherPassword = await password('Teacher@2026#Strong');
    const studentPassword = await password('Student@2026#Strong');
    const teacherUsers = await Promise.all([1, 2, 3].map((i) => tx.user.create({ data: { fullName: `Teacher ${i}`, email: i === 1 ? 'teacher@school.com' : `teacher${i}@school.com`, password: teacherPassword, role: Role.TEACHER } })));
    const teachers = await Promise.all(teacherUsers.map((u, i) => tx.teacher.create({ data: { userId: u.id, teacherCode: `TCH-${String(i + 1).padStart(3, '0')}`, specialization: ['Web Development', 'Mathematics', 'English'][i] } })));
    const students = [] as { id: string }[];
    for (let i = 1; i <= 10; i++) { const u = await tx.user.create({ data: { fullName: `Student ${i}`, email: i === 1 ? 'student@school.com' : `student${i}@school.com`, password: studentPassword, role: Role.STUDENT, phone: `012-000-${String(i).padStart(4, '0')}` } }); students.push(await tx.student.create({ data: { userId: u.id, studentCode: `STU-${String(i).padStart(3, '0')}`, gender: i % 2 ? 'Female' : 'Male', guardianName: `Guardian ${i}` } })); }
    const year = await tx.academicYear.create({ data: { name: '2026-2027', startDate: d('2026-09-01'), endDate: d('2027-06-30') } });
    const semester = await tx.semester.create({ data: { name: 'Semester 1', academicYearId: year.id, startDate: d('2026-09-01'), endDate: d('2027-01-31') } });
    const courseNames = ['JavaScript Fundamentals', 'React Application Development', 'Database Design', 'English Communication', 'Applied Mathematics'];
    const courses = [] as { id: string; teacherId: string }[];
    for (let i = 0; i < courseNames.length; i++) { const c = await tx.course.create({ data: { courseCode: `CRS-${String(i + 1).padStart(3, '0')}`, courseName: courseNames[i], description: `Learn ${courseNames[i]} through practical lessons and projects.`, teacherId: teachers[i % 3].id, startDate: d('2026-09-01'), endDate: d('2027-01-31'), status: CourseStatus.ACTIVE, academicYearId: year.id, semesterId: semester.id } }); courses.push(c); await tx.classSchedule.create({ data: { courseId: c.id, dayOfWeek: ([DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY] as DayOfWeek[])[i], startTime: '09:00', endTime: '10:30', room: `Room ${101 + i}` } }); }
    for (const [index, s] of students.entries()) for (const c of courses) if ((index + courses.indexOf(c)) % 2 === 0 || index < 3) await tx.enrollment.create({ data: { studentId: s.id, courseId: c.id } });
    for (const c of courses) { const enrolled = await tx.enrollment.findMany({ where: { courseId: c.id } }); for (const e of enrolled) for (let day = 0; day < 3; day++) await tx.attendance.create({ data: { courseId: c.id, studentId: e.studentId, attendanceDate: d(`2026-09-${String(10 + day).padStart(2, '0')}`), status: day === 2 && e.studentId === enrolled[0].studentId ? AttendanceStatus.LATE : AttendanceStatus.PRESENT } }); }
    for (let i = 0; i < courses.length; i++) { const c = courses[i]; const teacherId = c.teacherId; const a = await tx.assignment.create({ data: { courseId: c.id, teacherId, title: `${courseNames[i]} Project`, description: 'Complete the practical exercise and submit your work.', maxScore: 100, dueDate: d('2026-12-15') } }); const enrolled = await tx.enrollment.findMany({ where: { courseId: c.id }, take: 2 }); for (const e of enrolled) { const submission = await tx.submission.create({ data: { assignmentId: a.id, studentId: e.studentId, answerText: 'My completed assignment is attached.', submittedAt: d('2026-12-01'), status: SubmissionStatus.GRADED } }); await tx.grade.create({ data: { submissionId: submission.id, teacherId, score: 85, feedback: 'Good work. Keep improving your explanations.' } }); } const exam = await tx.exam.create({ data: { courseId: c.id, title: `${courseNames[i]} Midterm`, examDate: d('2027-01-10'), maxScore: 100, description: 'Midterm examination' } }); const enrolledForExam = await tx.enrollment.findMany({ where: { courseId: c.id }, take: 3 }); for (const e of enrolledForExam) await tx.examResult.create({ data: { examId: exam.id, studentId: e.studentId, score: 78, feedback: 'Solid result.' } }); await tx.announcement.create({ data: { courseId: c.id, createdBy: teacherUsers[i % 3].id, title: `Welcome to ${courseNames[i]}`, content: 'Please review the course outline before the first class.' } }); }
    await tx.announcement.create({ data: { createdBy: admin.id, title: 'Welcome to the new academic year', content: 'Check your dashboard for schedules, homework and announcements.' } });
  });
  console.log('Seed completed. Admin: vothanarern@gmail.com / 016555637. Teacher: teacher@school.com / Teacher@2026#Strong. Student: student@school.com / Student@2026#Strong.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

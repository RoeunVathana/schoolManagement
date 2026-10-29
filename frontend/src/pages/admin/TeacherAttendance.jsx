import Header from '../../components/Header';
import TeacherAttendancePanel from '../../components/TeacherAttendancePanel';

export default function TeacherAttendance() {
  return <>
    <Header eyebrow="adminTools" title="teacherAttendanceManagement" description="teacherAttendanceManagementDescription" />
    <TeacherAttendancePanel admin />
  </>;
}

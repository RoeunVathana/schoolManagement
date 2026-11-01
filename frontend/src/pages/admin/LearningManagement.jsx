import { useLocation } from 'react-router-dom';
import TeacherLearningManagement from '../teacher/Simple';

// Keep the admin entry point separate from the teacher route while reusing the
// tested table, upload, review, and exam-result workflows.
export default function LearningManagement() {
  const { pathname } = useLocation();
  const section = pathname.split('/').filter(Boolean).pop() || '';
  return <TeacherLearningManagement adminMode sectionOverride={section} />;
}

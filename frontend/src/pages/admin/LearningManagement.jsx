import TeacherLearningManagement from '../teacher/Simple';

// Keep the admin entry point separate from the teacher route while reusing the
// tested table, upload, review, and exam-result workflows.
export default function LearningManagement() {
  return <TeacherLearningManagement adminMode />;
}

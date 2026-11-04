// The JSON files in this folder are generated from the course PDFs supplied
// for CampusFlow. Vite keeps them in the client bundle so the reader works
// offline after the initial page load and each lesson retains its source page.
const importedPdfModules = import.meta.glob("./pdf/*.json", {
  eager: true,
  import: "default",
});

const pdfCourseContent = Object.values(importedPdfModules).reduce((courses, course) => {
  if (course?.slug) courses[course.slug] = course;
  return courses;
}, {});

export default pdfCourseContent;

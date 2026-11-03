import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

const content = {
  en: {
    title: "Welcome to CampusFlow LMS",
    subtitle: "A practical learning space for students, teachers, and growing skills.",
    courseTitle: "Practical courses",
    courseBody: "Learn through guided lessons, assignments, exams, and real projects.",
    workspaceTitle: "Learning workspace",
    workspaceBody: "Keep your schedule, progress, results, and teacher support in one place.",
    detail: "CampusFlow LMS helps learners in Cambodia discover useful courses, learn with local teachers, and stay connected to their learning progress.",
    payment: "Course payments can be completed securely with KHQR through supported Cambodian bank apps.",
    browse: "Explore courses",
    close: "Not now",
    dialogLabel: "About CampusFlow LMS",
  },
  km: {
    title: "សូមស្វាគមន៍មកកាន់ CampusFlow LMS",
    subtitle: "កន្លែងរៀនជំនាញអនុវត្តសម្រាប់សិស្ស គ្រូ និងអ្នកចង់អភិវឌ្ឍខ្លួន។",
    courseTitle: "វគ្គសិក្សាអនុវត្ត",
    courseBody: "រៀនតាមមេរៀន កិច្ចការ ការប្រឡង និងគម្រោងពិត។",
    workspaceTitle: "ផ្ទៃការរៀន",
    workspaceBody: "គ្រប់គ្រងកាលវិភាគ វឌ្ឍនភាព លទ្ធផល និងការទំនាក់ទំនងជាមួយគ្រូ។",
    detail: "CampusFlow LMS ជួយអ្នកសិក្សានៅកម្ពុជា ស្វែងរកវគ្គមានប្រយោជន៍ រៀនជាមួយគ្រូក្នុងស្រុក និងតាមដានការរៀនរបស់អ្នក។",
    payment: "ការបង់ប្រាក់វគ្គអាចធ្វើបានដោយសុវត្ថិភាពតាម KHQR ជាមួយកម្មវិធីធនាគារដែលគាំទ្រ។",
    browse: "មើលវគ្គសិក្សា",
    close: "បន្តមើលគេហទំព័រ",
    dialogLabel: "ព័ត៌មានអំពី CampusFlow LMS",
  },
};

function CourseIcon() {
  return <span className="site-welcome-feature-icon" aria-hidden="true">▣</span>;
}

function WorkspaceIcon() {
  return <span className="site-welcome-feature-icon" aria-hidden="true">▤</span>;
}

export default function SiteWelcomePopup() {
  const { language } = useLanguage();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(true);
  const copy = content[language] || content.en;
  const isDashboardRoute = /^\/(admin|teacher|student|customer)(?:\/|$)/.test(pathname);
  const isAuthRoute = /^\/(login|register|forgot-password)(?:\/|$)/.test(pathname);
  const isCourseReaderRoute = /^\/course(?:\/|$)/.test(pathname);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (!open || isDashboardRoute || isAuthRoute || isCourseReaderRoute) return null;

  return createPortal(
    <div
      className="site-welcome-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <section className="site-welcome-panel" role="dialog" aria-modal="true" aria-label={copy.dialogLabel}>
        <button type="button" className="site-welcome-close" onClick={() => setOpen(false)} aria-label={copy.close}>×</button>
        <div className="site-welcome-info-icon" aria-hidden="true">i</div>
        <h2>{copy.title}</h2>
        <p className="site-welcome-subtitle">{copy.subtitle}</p>

        <div className="site-welcome-feature-grid">
          <div className="site-welcome-feature site-welcome-feature-course">
            <CourseIcon />
            <strong>{copy.courseTitle}</strong>
            <p>{copy.courseBody}</p>
          </div>
          <div className="site-welcome-feature site-welcome-feature-workspace">
            <WorkspaceIcon />
            <strong>{copy.workspaceTitle}</strong>
            <p>{copy.workspaceBody}</p>
          </div>
        </div>

        <div className="site-welcome-detail">
          <span className="site-welcome-detail-mark" aria-hidden="true">✦</span>
          <p>{copy.detail}</p>
          <p>{copy.payment}</p>
        </div>

        <div className="site-welcome-actions">
          <Link to="/courses#courses" className="site-welcome-primary" onClick={() => setOpen(false)}>{copy.browse} <span aria-hidden="true">→</span></Link>
          <button type="button" className="site-welcome-secondary" onClick={() => setOpen(false)}><span aria-hidden="true">×</span> {copy.close}</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

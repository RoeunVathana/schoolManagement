import { Link } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import Seo from "../../components/Seo";
import SupportDock from "../../components/SupportDock";
import ThemeSwitch from "../../components/ThemeSwitch";
import PublicNavIcon from "../../components/PublicNavIcon";
import { useLanguage } from "../../context/LanguageContext";
import LabLogo from "../lab/LabLogo";
import { academySubjects } from "./subjectCatalog";
import "./subject-library.css";

const copy = {
  en: {
    eyebrow: "CAMPUSFLOW ACADEMY",
    title: "Programming language library",
    body: "Choose a subject to open its complete CampusFlow lesson path, examples, practice and progress tracking.",
    back: "Back to CampusFlow",
    open: "Open subject",
  },
  km: {
    eyebrow: "សាលា CAMPUSFLOW",
    title: "បណ្ណាល័យមុខវិជ្ជាសរសេរកូដ",
    body: "ជ្រើសរើសមុខវិជ្ជា ដើម្បីបើកមេរៀន ឧទាហរណ៍ លំហាត់អនុវត្ត និងការតាមដានវឌ្ឍនភាព។",
    back: "ត្រឡប់ទៅ CampusFlow",
    open: "បើកមុខវិជ្ជា",
  },
};

function LibraryNav({ language, setLanguage }) {
  return (
    <header className="subject-library-nav">
      <div className="subject-library-nav-inner">
        <Link to="/" className="subject-library-brand">
          <span className="subject-library-brand-mark"><BrandLogo /></span>
          <span><strong>Campus<span>Flow</span></strong><small>ACADEMY</small></span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link to="/course/html"><PublicNavIcon name="academy" />CampusFlow Academy</Link>
          <Link to="/lab"><PublicNavIcon name="code" />{language === "km" ? "មន្ទីរពិសោធន៍កូដ" : "Programming Lab"}</Link>
          <Link to="/lab/library"><PublicNavIcon name="library" />{language === "km" ? "បណ្ណាល័យភាសា" : "Language Library"}</Link>
          <Link to="/community"><PublicNavIcon name="community" />Community</Link>
          <Link to="/about"><PublicNavIcon name="about" />About</Link>
          <Link to="/contact"><PublicNavIcon name="contact" />Contact</Link>
        </nav>
        <div className="subject-library-actions">
          <ThemeSwitch />
          <button type="button" className="subject-library-language" onClick={() => setLanguage(language === "en" ? "km" : "en")} aria-label="Switch language">
            <span aria-hidden="true">{language === "en" ? "🇬🇧" : "🇰🇭"}</span>{language === "en" ? "English" : "ខ្មែរ"}
          </button>
        </div>
      </div>
    </header>
  );
}

export default function SubjectLibrary() {
  const { language, setLanguage } = useLanguage();
  const text = copy[language] || copy.en;

  return (
    <div className="subject-library-page">
      <Seo title={`${text.title} | CampusFlow LMS`} description={text.body} path="/subjects" language={language} />
      <LibraryNav language={language} setLanguage={setLanguage} />
      <main className="subject-library-content">
        <div className="subject-library-hero">
          <span>{text.eyebrow}</span>
          <h1>{text.title}</h1>
          <p>{text.body}</p>
          <Link to="/" className="subject-library-back">← {text.back}</Link>
        </div>
        <section className="subject-library-grid" aria-label={text.title}>
          {academySubjects.map((subject, index) => (
            <Link to={`/course/${subject.slug}`} className="subject-library-card" key={subject.slug}>
              <span className="subject-library-card-top">
                <span className="subject-library-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="subject-library-logo"><LabLogo lab={{ id: subject.logoId, label: subject.name }} /></span>
              </span>
              <span className="subject-library-card-copy"><strong>{subject.name}</strong><small>{subject.group}</small></span>
              <span className="subject-library-card-footer"><span>{text.open}</span><span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </section>
      </main>
      <SupportDock alwaysShow publicMode />
    </div>
  );
}

import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import SiteFooter from "../../components/SiteFooter";
import { LABS } from "./ProgrammingLab";
import LabLogo from "./LabLogo";
import "./programming-lab.css";
import "./lab-library.css";

export default function LabLibrary() {
  const { language } = useLanguage();
  const isKhmer = language === "km";

  return (
    <div className="programming-lab lab-library-page">
      <header className="lab-header">
        <Link className="lab-brand" to="/lab"><span className="lab-brand-mark">&lt;/&gt;</span><span><strong><span>Code</span>CampusFlow</strong><small>{isKhmer ? "បណ្ណាល័យភាសាកូដ" : "Programming Library"}</small></span></Link>
        <div className="lab-header-actions"><Link className="lab-back-link" to="/lab">{isKhmer ? "ត្រឡប់ទៅ Lab" : "Back to lab"}</Link><Link className="lab-back-link" to="/academy">{isKhmer ? "វគ្គសិក្សា" : "Courses"}</Link></div>
      </header>
      <main className="lab-library-main">
        <div className="lab-library-hero"><span className="lab-sidebar-kicker">{isKhmer ? "មន្ទីរពិសោធន៍ CampusFlow" : "CAMPUSFLOW PROGRAMMING LAB"}</span><h1>{isKhmer ? "បណ្ណាល័យភាសាសរសេរកូដ" : "Choose your programming language"}</h1><p>{isKhmer ? "ជ្រើសរើសភាសា ដើម្បីបើក Editor និងដំណើរការកូដ។" : "Open a focused editor with browser preview or secure compile-and-run support."}</p></div>
        <section className="lab-library-grid" aria-label="Programming language library">
          {LABS.map((lab) => <Link className="lab-library-card" to={`/lab?language=${lab.id}`} key={lab.id}><span className="lab-library-logo"><LabLogo lab={lab} /></span><span className="lab-library-card-copy"><strong>{lab.label}</strong><small>{lab.kind === "server" ? "Compile & run" : (isKhmer ? "ដំណើរការក្នុង Browser" : "Run in browser")}</small></span><span className="lab-library-arrow">→</span></Link>)}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

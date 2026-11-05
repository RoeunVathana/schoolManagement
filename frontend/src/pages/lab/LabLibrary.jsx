import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import BrandLogo from "../../components/BrandLogo";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import PublicNavIcon from "../../components/PublicNavIcon";
import SiteFooter from "../../components/SiteFooter";
import ThemeSwitch from "../../components/ThemeSwitch";
import { LABS } from "./ProgrammingLab";
import LabLogo from "./LabLogo";
import "./programming-lab.css";
import "./lab-library.css";

export default function LabLibrary() {
  const { language } = useLanguage();
  const isKhmer = language === "km";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="programming-lab lab-library-page">
      <header className="lab-header">
        <button
          className={`lab-icon-button lab-menu-button lab-library-menu-toggle ${mobileMenuOpen ? "is-open" : ""}`}
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-expanded={mobileMenuOpen}
          aria-controls="lab-library-mobile-menu"
          aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
        >
          {mobileMenuOpen ? "×" : "☰"}
        </button>
        <Link className="lab-icon-button lab-menu-button" to="/lab" aria-label={isKhmer ? "បើក Lab" : "Open programming lab"}>☰</Link>
        <Link className="lab-brand" to="/lab">
          <span className="lab-brand-mark"><BrandLogo alt="" /></span>
          <span><small className="lab-brand-kicker">Academy</small><strong><span>Code</span>CampusFlow</strong><em>{isKhmer ? "បណ្ណាល័យភាសាកូដ" : "Library"}</em></span>
        </Link>
        <nav className="lab-header-nav" aria-label="CampusFlow navigation">
          <Link className="is-active" to="/academy"><PublicNavIcon name="academy" /><span>{isKhmer ? "សាលា CampusFlow" : "Academy"}</span></Link>
          <Link to="/courses#courses"><PublicNavIcon name="library" /><span>{isKhmer ? "វគ្គសិក្សា" : "Browse courses"}</span></Link>
          <Link to="/community"><PublicNavIcon name="community" /><span>{isKhmer ? "សហគមន៍" : "Community"}</span></Link>
          <Link to="/about"><PublicNavIcon name="about" /><span>{isKhmer ? "អំពីយើង" : "About"}</span></Link>
          <Link to="/courses#faq"><PublicNavIcon name="faq" /><span>FAQ</span></Link>
          <Link to="/contact"><PublicNavIcon name="contact" /><span>{isKhmer ? "ទំនាក់ទំនង" : "Contact"}</span></Link>
        </nav>
        <div className="lab-header-actions">
          <LanguageSwitcher variant="course" />
          <Link className="lab-back-link lab-icon-link" to="/lab" title={isKhmer ? "ត្រឡប់ទៅ Lab" : "Back to lab"} aria-label={isKhmer ? "ត្រឡប់ទៅ Lab" : "Back to lab"}><PublicNavIcon name="code" /></Link>
          <Link className="lab-back-link lab-icon-link" to="/academy" title={isKhmer ? "វគ្គសិក្សា" : "Courses"} aria-label={isKhmer ? "វគ្គសិក្សា" : "Courses"}><PublicNavIcon name="academy" /></Link>
          <ThemeSwitch />
        </div>
      </header>
      {mobileMenuOpen && (
        <div className="lab-library-mobile-shell">
          <button className="lab-library-mobile-backdrop" type="button" onClick={closeMobileMenu} aria-label="Close navigation" />
          <nav id="lab-library-mobile-menu" className="lab-library-mobile-menu" aria-label="CampusFlow navigation">
            <Link className="is-active" to="/academy" onClick={closeMobileMenu}><PublicNavIcon name="academy" /><span>{isKhmer ? "CampusFlow Academy" : "Academy"}</span></Link>
            <Link to="/courses#courses" onClick={closeMobileMenu}><PublicNavIcon name="library" /><span>{isKhmer ? "Courses" : "Browse courses"}</span></Link>
            <Link to="/lab" onClick={closeMobileMenu}><PublicNavIcon name="code" /><span>{isKhmer ? "Programming Lab" : "Programming lab"}</span></Link>
            <Link to="/community" onClick={closeMobileMenu}><PublicNavIcon name="community" /><span>Community</span></Link>
            <Link to="/about" onClick={closeMobileMenu}><PublicNavIcon name="about" /><span>About</span></Link>
            <Link to="/courses#faq" onClick={closeMobileMenu}><PublicNavIcon name="faq" /><span>FAQ</span></Link>
            <Link to="/contact" onClick={closeMobileMenu}><PublicNavIcon name="contact" /><span>Contact</span></Link>
            <div className="lab-library-mobile-actions">
              <Link to="/lab" onClick={closeMobileMenu}><PublicNavIcon name="code" /><span>{isKhmer ? "Open Lab" : "Open lab"}</span></Link>
              <Link to="/academy" onClick={closeMobileMenu}><PublicNavIcon name="academy" /><span>Courses</span></Link>
            </div>
          </nav>
        </div>
      )}
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

import { useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import Seo from "../components/Seo";
import ThemeSwitch from "../components/ThemeSwitch";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../context/LanguageContext";
import { roleHome } from "../utils/roles";

const content = {
  en: {
    navCourses: "Browse courses", navContact: "Contact",
    navCommunity: "Community",
    navAbout: "About",
    navFaq: "FAQ",
    login: "Sign in",
    register: "Create account",
    dashboard: "Dashboard",
    eyebrow: "ABOUT CAMPUSFLOW LMS",
    title: "Practical learning for Cambodia's next generation of digital builders.",
    heroBody: "CampusFlow LMS brings together useful courses, local teachers, secure KHQR payments, and a learning community that helps students keep moving forward.",
    explore: "Explore courses",
    storyKicker: "Our story",
    storyTitle: "Learning should feel clear, local, and useful.",
    storyBody: "CampusFlow started with a simple idea: students deserve a calm place to learn practical skills, ask questions, and see their progress. We are building that place for learners, teachers, and schools across Cambodia.",
    quote: "Every learner should have a clear next step—and the support to take it.",
    quoteBy: "The CampusFlow mission",
    stats: [
      ["Practical", "Course approach"],
      ["Khmer + English", "Learning support"],
      ["Local", "Teacher guidance"],
      ["KHQR", "Secure payments"],
    ],
    valuesKicker: "Mission and values",
    valuesTitle: "Built around the way people actually learn.",
    valuesBody: "We keep the experience focused on progress, real practice, and support that feels close to home.",
    values: [
      ["01", "Clarity first", "Straightforward lessons, schedules, and course information so students always know what comes next."],
      ["02", "Practice that matters", "Assignments and projects turn learning into work students can use in real life."],
      ["03", "Supportive community", "Teachers and learners can stay connected, share questions, and grow together."],
    ],
    benefitsKicker: "Why CampusFlow",
    benefitsTitle: "A learning space made for steady progress.",
    benefits: [
      ["⌂", "Learn from anywhere", "Open your course, schedule, assignments, and results from one student workspace."],
      ["✦", "Local context", "Learn with teachers and examples that understand Cambodian learners and goals."],
      ["↗", "Build real confidence", "Move from guided practice to projects that show what you can do."],
      ["✓", "Stay supported", "Get help through teacher communication and a growing learning community."],
    ],
    ctaKicker: "Start your next chapter",
    ctaTitle: "Your future starts with one practical step.",
    ctaBody: "Find a course that fits your goals and begin learning with CampusFlow today.",
    ctaButton: "Browse courses",
    footerBody: "Practical online learning for Cambodia.",
  },
  km: {
    navCourses: "មើលវគ្គសិក្សា", navContact: "ទំនាក់ទំនង",
    navCommunity: "សហគមន៍",
    navAbout: "អំពីយើង",
    navFaq: "សំណួរ",
    login: "ចូលប្រើ",
    register: "បង្កើតគណនី",
    dashboard: "ផ្ទាំងការងារ",
    eyebrow: "អំពី CAMPUSFLOW LMS",
    title: "ការរៀនអនុវត្តសម្រាប់អ្នកកសាងអនាគតឌីជីថលនៅកម្ពុជា។",
    heroBody: "CampusFlow LMS រួមបញ្ចូលវគ្គសិក្សាមានប្រយោជន៍ គ្រូក្នុងស្រុក ការបង់ប្រាក់ KHQR និងសហគមន៍សិក្សាដែលជួយឲ្យសិស្សបន្តរីកចម្រើន។",
    explore: "មើលវគ្គសិក្សា",
    storyKicker: "រឿងរ៉ាវរបស់យើង",
    storyTitle: "ការរៀនគួរតែច្បាស់លាស់ សមស្របនឹងមូលដ្ឋាន និងមានប្រយោជន៍។",
    storyBody: "CampusFlow ចាប់ផ្តើមពីគំនិតសាមញ្ញមួយ៖ សិស្សគួរមានកន្លែងស្ងប់ស្ងាត់សម្រាប់រៀនជំនាញអនុវត្ត សួរសំណួរ និងមើលវឌ្ឍនភាពរបស់ខ្លួន។ យើងកំពុងកសាងកន្លែងនេះសម្រាប់សិស្ស គ្រូ និងសាលារៀននៅទូទាំងកម្ពុជា។",
    quote: "អ្នកសិក្សាគ្រប់រូបគួរមានជំហានបន្ទាប់ដែលច្បាស់លាស់ និងការគាំទ្រដើម្បីឈានទៅមុខ។",
    quoteBy: "បេសកកម្មរបស់ CampusFlow",
    stats: [
      ["អនុវត្ត", "របៀបរៀន"],
      ["ខ្មែរ + អង់គ្លេស", "ការគាំទ្រការរៀន"],
      ["ក្នុងស្រុក", "ការណែនាំពីគ្រូ"],
      ["KHQR", "ការបង់ប្រាក់សុវត្ថិភាព"],
    ],
    valuesKicker: "បេសកកម្ម និងតម្លៃ",
    valuesTitle: "បង្កើតឡើងតាមរបៀបដែលមនុស្សពិតៗរៀន។",
    valuesBody: "យើងផ្តោតលើវឌ្ឍនភាព ការអនុវត្តពិត និងការគាំទ្រដែលនៅជិតអ្នក។",
    values: [
      ["01", "ច្បាស់លាស់ជាមុន", "មេរៀន កាលវិភាគ និងព័ត៌មានវគ្គច្បាស់ ដើម្បីឲ្យសិស្សដឹងថាត្រូវធ្វើអ្វីបន្ទាប់។"],
      ["02", "ការអនុវត្តមានន័យ", "កិច្ចការ និងគម្រោងជួយបម្លែងការរៀនទៅជាជំនាញដែលអាចប្រើបានក្នុងជីវិតពិត។"],
      ["03", "សហគមន៍គាំទ្រ", "គ្រូ និងអ្នកសិក្សាអាចទាក់ទងគ្នា ចែករំលែកសំណួរ និងរីកចម្រើនជាមួយគ្នា។"],
    ],
    benefitsKicker: "ហេតុអ្វី CampusFlow",
    benefitsTitle: "កន្លែងរៀនដែលបង្កើតសម្រាប់វឌ្ឍនភាពជាបន្តបន្ទាប់។",
    benefits: [
      ["⌂", "រៀនពីគ្រប់ទីកន្លែង", "បើកមើលវគ្គ កាលវិភាគ កិច្ចការ និងលទ្ធផលក្នុងផ្ទៃការរៀនតែមួយ។"],
      ["✦", "បរិបទក្នុងស្រុក", "រៀនជាមួយគ្រូ និងឧទាហរណ៍ដែលយល់ពីអ្នកសិក្សា និងគោលដៅនៅកម្ពុជា។"],
      ["↗", "កសាងទំនុកចិត្តពិត", "ចាប់ផ្តើមពីការអនុវត្តដែលមានការណែនាំ រហូតដល់គម្រោងដែលបង្ហាញសមត្ថភាពរបស់អ្នក។"],
      ["✓", "មានការគាំទ្រ", "ទាក់ទងជាមួយគ្រូ និងសហគមន៍សិក្សាដែលកំពុងរីកចម្រើន។"],
    ],
    ctaKicker: "ចាប់ផ្តើមជំហានបន្ទាប់",
    ctaTitle: "អនាគតរបស់អ្នកចាប់ផ្តើមពីជំហានអនុវត្តមួយ។",
    ctaBody: "ស្វែងរកវគ្គសិក្សាដែលសមនឹងគោលដៅរបស់អ្នក ហើយចាប់ផ្តើមរៀនជាមួយ CampusFlow ថ្ងៃនេះ។",
    ctaButton: "មើលវគ្គសិក្សា",
    footerBody: "ការរៀនអនឡាញអនុវត្តសម្រាប់កម្ពុជា។",
  },
};

export default function About() {
  const { language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const copy = content[language] || content.en;
  const hasSession = !authLoading && Boolean(user);
  const dashboardPath = roleHome(user?.role);

  return (
    <div className="about-page min-h-screen bg-[#f7fafc] text-[#10243f] dark:bg-[#0b1220] dark:text-slate-100">
      <Seo
        title={language === "km" ? "អំពី CampusFlow LMS | ការរៀនជំនាញអនុវត្ត" : "About CampusFlow LMS | Practical Learning in Cambodia"}
        description={copy.heroBody}
        path="/about"
        language={language}
      />
      <header className="site-public-navbar about-nav">
        <div className="about-nav-inner">
          <Link to="/" className="about-brand" onClick={() => setMobileMenuOpen(false)}>
            <span className="about-brand-mark"><BrandLogo /></span>
            <span><strong>Campus<span>Flow</span></strong><small>{language === "km" ? "ទីផ្សារវគ្គសិក្សា" : "Learning marketplace"}</small></span>
          </Link>
          <nav className="about-nav-links" aria-label="Primary navigation">
            <Link to="/courses#courses">{copy.navCourses}</Link>
            <Link to="/community">{copy.navCommunity}</Link>
            <Link to="/about" className="is-active">{copy.navAbout}</Link>
            <Link to="/contact">{copy.navContact}</Link>
            <Link to="/courses#faq">{copy.navFaq}</Link>
          </nav>
          <div className="about-nav-actions">
            <ThemeSwitch />
            <LanguageSwitcher variant="public" />
            {hasSession ? <Link to={dashboardPath} className="about-nav-button">{copy.dashboard}</Link> : <><Link to="/login/student" className="about-nav-login">{copy.login}</Link><Link to="/register" className="about-nav-button">{copy.register}</Link></>}
          </div>
          <div className="about-mobile-controls">
            <LanguageSwitcher variant="public" />
            <ThemeSwitch />
            <button type="button" className="about-mobile-toggle" onClick={() => setMobileMenuOpen((open) => !open)} aria-expanded={mobileMenuOpen} aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}><span aria-hidden="true">{mobileMenuOpen ? "×" : "☰"}</span></button>
          </div>
        </div>
        {mobileMenuOpen && <div className="about-mobile-menu"><Link to="/courses#courses" onClick={() => setMobileMenuOpen(false)}>{copy.navCourses}</Link><Link to="/community" onClick={() => setMobileMenuOpen(false)}>{copy.navCommunity}</Link><Link to="/about" onClick={() => setMobileMenuOpen(false)}>{copy.navAbout}</Link><Link to="/contact" onClick={() => setMobileMenuOpen(false)}>{copy.navContact}</Link><Link to="/courses#faq" onClick={() => setMobileMenuOpen(false)}>{copy.navFaq}</Link><div className="about-mobile-actions">{hasSession ? <><Link to="/login/student" onClick={() => setMobileMenuOpen(false)}>{copy.login}</Link><Link to={dashboardPath} onClick={() => setMobileMenuOpen(false)}>{copy.dashboard}</Link></> : <><Link to="/login/student" onClick={() => setMobileMenuOpen(false)}>{copy.login}</Link><Link to="/register" onClick={() => setMobileMenuOpen(false)}>{copy.register}</Link></>}</div></div>}
      </header>

      <main>
        <section className="about-hero">
          <div className="about-hero-glow about-hero-glow-one" />
          <div className="about-hero-glow about-hero-glow-two" />
          <div className="about-container about-hero-grid">
            <div className="about-hero-copy">
              <p className="about-eyebrow"><span />{copy.eyebrow}</p>
              <h1>{copy.title}</h1>
              <p className="about-hero-body">{copy.heroBody}</p>
              <div className="about-hero-actions"><Link to="/courses#courses" className="about-button about-button-primary">{copy.explore} <span>→</span></Link><Link to="/community" className="about-button about-button-ghost">{copy.navCommunity}</Link></div>
            </div>
            <div className="about-hero-card">
              <div className="about-hero-card-top"><span>CampusFlow</span><span>2026</span></div>
              <div className="about-hero-card-orbit about-hero-card-orbit-one" />
              <div className="about-hero-card-orbit about-hero-card-orbit-two" />
              <div className="about-hero-card-content"><span className="about-card-label">{copy.storyKicker}</span><strong>Learn.<br />Practice.<br /><em>Move forward.</em></strong></div>
              <div className="about-hero-card-footer"><span>KHQR</span><span>Khmer + English</span><span>Local support</span></div>
            </div>
          </div>
        </section>

        <section className="about-stats"><div className="about-container about-stats-grid">{copy.stats.map(([value, label]) => <div className="about-stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div></section>

        <section className="about-section about-story"><div className="about-container about-story-grid"><div><p className="about-eyebrow about-eyebrow-light">{copy.storyKicker}</p><h2>{copy.storyTitle}</h2><p className="about-section-body">{copy.storyBody}</p></div><blockquote><span>“</span><p>{copy.quote}</p><cite>{copy.quoteBy}</cite></blockquote></div></section>

        <section className="about-section about-values"><div className="about-container"><div className="about-section-heading"><p className="about-eyebrow">{copy.valuesKicker}</p><h2>{copy.valuesTitle}</h2><p>{copy.valuesBody}</p></div><div className="about-values-grid">{copy.values.map(([number, title, body]) => <article key={number} className="about-value-card"><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>

        <section className="about-section about-benefits"><div className="about-container"><div className="about-section-heading"><p className="about-eyebrow about-eyebrow-light">{copy.benefitsKicker}</p><h2>{copy.benefitsTitle}</h2></div><div className="about-benefits-grid">{copy.benefits.map(([icon, title, body]) => <article key={title} className="about-benefit-card"><span>{icon}</span><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>

        <section className="about-cta"><div className="about-container about-cta-inner"><div><p className="about-eyebrow about-eyebrow-light">{copy.ctaKicker}</p><h2>{copy.ctaTitle}</h2><p>{copy.ctaBody}</p></div><Link to="/courses#courses" className="about-button about-button-primary">{copy.ctaButton} <span>→</span></Link></div></section>
      </main>

      <footer className="about-footer"><div className="about-container about-footer-inner"><div><p className="about-footer-brand">Campus<span>Flow</span></p><p>{copy.footerBody}</p></div><div className="about-footer-links"><Link to="/courses#courses">{copy.navCourses}</Link><Link to="/community">{copy.navCommunity}</Link><Link to="/about">{copy.navAbout}</Link><Link to="/contact">{copy.navContact}</Link></div><a href="https://t.me/RoeunVathana" target="_blank" rel="noreferrer">Telegram support →</a></div></footer>
    </div>
  );
}

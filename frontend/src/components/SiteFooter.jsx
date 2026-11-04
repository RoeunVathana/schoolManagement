import { Link } from "react-router-dom";
import "../site-footer.css";
import BrandLogo from "./BrandLogo";
import { useLanguage } from "../context/LanguageContext";

const footerCopy = {
  en: {
    academy: "CampusFlow Academy",
    tagline: "Learn. Practice. Move forward.",
    description: "Practical online learning for Cambodia, with useful courses, local teacher support, secure KHQR payments, and a community that helps learners keep going.",
    learn: "Learn with us",
    support: "Support",
    platform: "Why CampusFlow",
    courses: "Browse courses",
    lab: "Programming Lab",
    labLibrary: "Language Library",
    community: "Community",
    about: "About CampusFlow",
    faq: "Frequently asked questions",
    contact: "Contact support",
    telegram: "Telegram support",
    dashboard: "Student dashboard",
    register: "Create an account",
    practical: "Practical course plans",
    bilingual: "Khmer + English support",
    local: "Local teacher guidance",
    payments: "Secure KHQR payments",
    bottom: "Practical learning for Cambodia.",
    rights: "All rights reserved.",
  },
  km: {
    academy: "សាលា CampusFlow",
    tagline: "រៀន · អនុវត្ត · រីកចម្រើន",
    description: "ការរៀនអនឡាញជាក់ស្តែងសម្រាប់កម្ពុជា មានវគ្គសិក្សាមានប្រយោជន៍ ការគាំទ្រពីគ្រូក្នុងស្រុក ការបង់ប្រាក់ KHQR និងសហគមន៍សម្រាប់អ្នកសិក្សា។",
    learn: "រៀនជាមួយយើង",
    support: "ការគាំទ្រ",
    platform: "ហេតុអ្វី CampusFlow",
    courses: "មើលវគ្គសិក្សា",
    community: "សហគមន៍",
    about: "អំពី CampusFlow",
    faq: "សំណួរដែលសួរញឹកញាប់",
    contact: "ទាក់ទងការគាំទ្រ",
    telegram: "ការគាំទ្រ Telegram",
    dashboard: "ផ្ទាំងសិស្ស",
    register: "បង្កើតគណនី",
    practical: "ផែនការវគ្គសិក្សាជាក់ស្តែង",
    bilingual: "ការគាំទ្រខ្មែរ + អង់គ្លេស",
    local: "ការណែនាំពីគ្រូក្នុងស្រុក",
    payments: "ការបង់ប្រាក់ KHQR មានសុវត្ថិភាព",
    bottom: "ការរៀនជាក់ស្តែងសម្រាប់កម្ពុជា។",
    rights: "រក្សាសិទ្ធិគ្រប់យ៉ាង។",
  },
};

export default function SiteFooter() {
  const { language } = useLanguage();
  const copy = footerCopy[language] || footerCopy.en;
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-grid">
          <div className="site-footer-brand-column">
            <Link to="/" className="site-footer-brand" aria-label={copy.academy}>
              <span className="site-footer-brand-mark"><BrandLogo alt="" /></span>
              <span>
                <strong>Campus<span>Flow</span></strong>
                <small>{copy.academy}</small>
              </span>
            </Link>
            <p className="site-footer-tagline">{copy.tagline}</p>
            <p className="site-footer-description">{copy.description}</p>
          </div>

          <div className="site-footer-column">
            <h2>{copy.learn}</h2>
            <Link to="/courses#courses">{copy.courses}</Link>
            <Link to="/lab">{language === "km" ? "មន្ទីរពិសោធន៍កូដ" : copy.lab}</Link>
            <Link to="/lab/library">{language === "km" ? "បណ្ណាល័យភាសា" : copy.labLibrary}</Link>
            <Link to="/community">{copy.community}</Link>
            <Link to="/about">{copy.about}</Link>
            <a href="/courses#faq">{copy.faq}</a>
          </div>

          <div className="site-footer-column">
            <h2>{copy.support}</h2>
            <Link to="/contact">{copy.contact}</Link>
            <a href="https://t.me/RoeunVathana" target="_blank" rel="noreferrer">{copy.telegram}</a>
            <Link to="/student/dashboard">{copy.dashboard}</Link>
            <Link to="/register">{copy.register}</Link>
          </div>

          <div className="site-footer-column site-footer-platform-column">
            <h2>{copy.platform}</h2>
            <p><span aria-hidden="true">01</span>{copy.practical}</p>
            <p><span aria-hidden="true">02</span>{copy.bilingual}</p>
            <p><span aria-hidden="true">03</span>{copy.local}</p>
            <p><span aria-hidden="true">04</span>{copy.payments}</p>
          </div>
        </div>

        <div className="site-footer-bottom">
          <span>© {year} CampusFlow LMS · {copy.bottom}</span>
          <span>{copy.rights}</span>
        </div>
      </div>
    </footer>
  );
}

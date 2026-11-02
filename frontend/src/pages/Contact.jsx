import { useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import Seo from "../components/Seo";
import ThemeSwitch from "../components/ThemeSwitch";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../context/LanguageContext";
import { roleHome } from "../utils/roles";
import api from "../api/axios";

const content = {
  en: {
    navCourses: "Courses", navCommunity: "Community", navAbout: "About us", navContact: "Contact", navFaq: "FAQ",
    login: "Sign in", register: "Create account", dashboard: "Dashboard",
    eyebrow: "WE ARE HERE TO HELP", title: "Let's build your next step together.",
    heroBody: "Have a question about courses, payments, teacher support, or your learning path? Reach out and the CampusFlow team will point you in the right direction.",
    emailLabel: "Support channel", emailValue: "Telegram support", emailBody: "Chat with the CampusFlow team directly.",
    phoneLabel: "Learning support", phoneValue: "Khmer + English", phoneBody: "Ask questions in the language that feels easiest.",
    locationLabel: "Serving learners", locationValue: "Cambodia", locationBody: "Practical learning made for local goals.",
    timeLabel: "Response", timeValue: "As soon as possible", timeBody: "We will get back to your request when we can.",
    formKicker: "Send a message", formTitle: "Tell us how we can help.", formBody: "Share a little context and continue the conversation with our Telegram support team.",
    name: "Full name", namePlaceholder: "Your name", email: "Email address", emailPlaceholder: "your@email.com", subject: "What can we help with?", subjectPlaceholder: "Choose a topic", message: "Message", messagePlaceholder: "Write your message here...", send: "Continue to Telegram", sent: "Your message has been saved. Telegram will open so you can continue with the CampusFlow team.",
    topics: ["Course information", "Payment help", "Teacher support", "Partnership", "Other"],
    officeKicker: "Support desk", officeTitle: "A calm place to get answers.", officeBody: "Whether you are just starting or already learning with us, you can ask about your account, courses, progress, and support.",
    quickKicker: "Quick answers", quickTitle: "Common questions", quick: [["How quickly will I get a reply?", "We will respond as soon as possible through Telegram support."], ["Can I ask in Khmer?", "Yes. CampusFlow support is available in Khmer and English."], ["Need help choosing a course?", "Tell us your goal and we will help you find a practical next step."]],
    ctaKicker: "Ready to start?", ctaTitle: "Find a course and keep moving forward.", ctaButton: "Explore courses", footerBody: "Practical online learning for Cambodia.",
  },
  km: {
    navCourses: "វគ្គសិក្សា", navCommunity: "សហគមន៍", navAbout: "អំពីយើង", navContact: "ទាក់ទង", navFaq: "សំណួរ",
    login: "ចូលប្រើ", register: "បង្កើតគណនី", dashboard: "ផ្ទាំងការងារ",
    eyebrow: "យើងនៅទីនេះដើម្បីជួយ", title: "តោះកសាងជំហានបន្ទាប់របស់អ្នកជាមួយគ្នា។",
    heroBody: "មានសំណួរអំពីវគ្គសិក្សា ការបង់ប្រាក់ ការគាំទ្រពីគ្រូ ឬផ្លូវរៀនរបស់អ្នក? ទាក់ទងមកយើង ហើយក្រុម CampusFlow នឹងជួយបង្ហាញទិសដៅដែលសមស្រប។",
    emailLabel: "បណ្តាញគាំទ្រ", emailValue: "ការគាំទ្រតាម Telegram", emailBody: "ជជែកជាមួយក្រុម CampusFlow ដោយផ្ទាល់។",
    phoneLabel: "ការគាំទ្រការរៀន", phoneValue: "ខ្មែរ + អង់គ្លេស", phoneBody: "សួរសំណួរជាភាសាដែលអ្នកមានអារម្មណ៍ងាយស្រួល។",
    locationLabel: "គាំទ្រអ្នកសិក្សា", locationValue: "កម្ពុជា", locationBody: "ការរៀនអនុវត្តសម្រាប់គោលដៅក្នុងស្រុក។",
    timeLabel: "ការឆ្លើយតប", timeValue: "ឆាប់តាមដែលអាចធ្វើបាន", timeBody: "យើងនឹងឆ្លើយតបតាមដែលអាចធ្វើបាន។",
    formKicker: "ផ្ញើសារ", formTitle: "ប្រាប់យើងថាតើយើងអាចជួយអ្នកបានដូចម្តេច។", formBody: "ប្រាប់ព័ត៌មានបន្តិច ហើយបន្តការសន្ទនាជាមួយក្រុមគាំទ្ររបស់យើងតាម Telegram។",
    name: "ឈ្មោះពេញ", namePlaceholder: "ឈ្មោះរបស់អ្នក", email: "អាសយដ្ឋានអ៊ីមែល", emailPlaceholder: "your@email.com", subject: "តើយើងអាចជួយអ្វីបាន?", subjectPlaceholder: "ជ្រើសរើសប្រធានបទ", message: "សារ", messagePlaceholder: "សរសេរសាររបស់អ្នកនៅទីនេះ...", send: "បន្តទៅ Telegram", sent: "សេចក្តីព្រាងសាររបស់អ្នករួចរាល់។ Telegram នឹងបើក ដើម្បីឲ្យអ្នកផ្ញើទៅក្រុម CampusFlow។",
    topics: ["ព័ត៌មានវគ្គសិក្សា", "ជំនួយការបង់ប្រាក់", "ការគាំទ្រពីគ្រូ", "ភាពជាដៃគូ", "ផ្សេងៗ"],
    officeKicker: "ផ្នែកគាំទ្រ", officeTitle: "កន្លែងស្ងប់ស្ងាត់សម្រាប់ទទួលចម្លើយ។", officeBody: "មិនថាអ្នកទើបចាប់ផ្តើម ឬកំពុងរៀនជាមួយយើងទេ អ្នកអាចសួរអំពីគណនី វគ្គសិក្សា វឌ្ឍនភាព និងការគាំទ្រ។",
    quickKicker: "ចម្លើយរហ័ស", quickTitle: "សំណួរដែលគេសួរញឹកញាប់", quick: [["តើនឹងឆ្លើយតបលឿនប៉ុណ្ណា?", "យើងនឹងឆ្លើយតបតាមដែលអាចធ្វើបានតាម Telegram។"], ["តើអាចសួរជាភាសាខ្មែរបានទេ?", "បាន។ ការគាំទ្រ CampusFlow មានជាភាសាខ្មែរ និងអង់គ្លេស។"], ["ត្រូវការជំនួយជ្រើសវគ្គទេ?", "ប្រាប់គោលដៅរបស់អ្នក ហើយយើងនឹងជួយស្វែងរកជំហានអនុវត្តដែលសមស្រប។"]],
    ctaKicker: "ត្រៀមចាប់ផ្តើមហើយឬនៅ?", ctaTitle: "ស្វែងរកវគ្គសិក្សា ហើយបន្តឆ្ពោះទៅមុខ។", ctaButton: "មើលវគ្គសិក្សា", footerBody: "ការរៀនអនឡាញអនុវត្តសម្រាប់កម្ពុជា។",
  },
};

export default function Contact() {
  const { language, setLanguage } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const copy = content[language] || content.en;
  const hasSession = !authLoading && Boolean(user);
  const dashboardPath = roleHome(user?.role);
  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setSent(false);
    setError("");
    try {
      await api.post("/contact", {
        fullName: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject,
        message: form.message.trim(),
      });
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
      window.open("https://t.me/RoeunVathana", "_blank", "noopener,noreferrer");
    } catch (requestError) {
      const message = requestError.response?.data?.message;
      setError(Array.isArray(message) ? message.join(" ") : message || "Could not save your message. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="contact-page min-h-screen bg-[#f7fafc] text-[#10243f] dark:bg-[#0b1220] dark:text-slate-100">
      <Seo title={language === "km" ? "ទាក់ទង CampusFlow LMS | ការគាំទ្រការរៀន" : "Contact CampusFlow LMS | Learning Support"} description={copy.heroBody} path="/contact" language={language} />
      <header className="site-public-navbar about-nav contact-nav">
        <div className="about-nav-inner">
          <Link to="/" className="about-brand" onClick={() => setMobileMenuOpen(false)}><span className="about-brand-mark"><BrandLogo /></span><span><strong>Campus<span>Flow</span></strong><small>{language === "km" ? "វេទិការៀន" : "Learning platform"}</small></span></Link>
          <nav className="about-nav-links" aria-label="Primary navigation"><Link to="/courses#courses">{copy.navCourses}</Link><Link to="/community">{copy.navCommunity}</Link><Link to="/about">{copy.navAbout}</Link><Link to="/contact" className="is-active">{copy.navContact}</Link><Link to="/courses#faq">{copy.navFaq}</Link></nav>
          <div className="about-nav-actions"><ThemeSwitch /><button type="button" className="about-language-toggle" onClick={() => setLanguage(language === "en" ? "km" : "en")} aria-label="Change language">{language === "en" ? "ខ្មែរ" : "EN"}</button>{hasSession ? <Link to={dashboardPath} className="about-nav-button">{copy.dashboard}</Link> : <><Link to="/login/student" className="about-nav-login">{copy.login}</Link><Link to="/register" className="about-nav-button">{copy.register}</Link></>}</div>
          <button type="button" className="about-mobile-toggle" onClick={() => setMobileMenuOpen((open) => !open)} aria-expanded={mobileMenuOpen}>☰</button>
        </div>
        {mobileMenuOpen && <div className="about-mobile-menu"><Link to="/courses#courses" onClick={() => setMobileMenuOpen(false)}>{copy.navCourses}</Link><Link to="/community" onClick={() => setMobileMenuOpen(false)}>{copy.navCommunity}</Link><Link to="/about" onClick={() => setMobileMenuOpen(false)}>{copy.navAbout}</Link><Link to="/contact" onClick={() => setMobileMenuOpen(false)}>{copy.navContact}</Link><Link to="/courses#faq" onClick={() => setMobileMenuOpen(false)}>{copy.navFaq}</Link><div className="about-mobile-actions"><button type="button" onClick={() => { setLanguage(language === "en" ? "km" : "en"); setMobileMenuOpen(false); }}>{language === "en" ? "ខ្មែរ" : "English"}</button><Link to={hasSession ? dashboardPath : "/login/student"} onClick={() => setMobileMenuOpen(false)}>{hasSession ? copy.dashboard : copy.login}</Link></div></div>}
      </header>

      <main>
        <section className="contact-hero"><div className="contact-hero-shape contact-hero-shape-one" /><div className="contact-hero-shape contact-hero-shape-two" /><div className="about-container contact-hero-inner"><div><p className="about-eyebrow"><span />{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.heroBody}</p><a href="https://t.me/RoeunVathana" target="_blank" rel="noreferrer" className="about-button about-button-primary">Telegram support <span>↗</span></a></div><div className="contact-hero-mark"><span>✦</span><strong>Campus<br /><em>Flow</em></strong><small>{language === "km" ? "រៀន · អនុវត្ត · រីកចម្រើន" : "Learn · Practice · Grow"}</small></div></div></section>

        <section className="contact-info-strip"><div className="about-container contact-info-grid"><ContactInfo icon="↗" label={copy.emailLabel} value={copy.emailValue} body={copy.emailBody} /><ContactInfo icon="✦" label={copy.phoneLabel} value={copy.phoneValue} body={copy.phoneBody} /><ContactInfo icon="⌂" label={copy.locationLabel} value={copy.locationValue} body={copy.locationBody} /><ContactInfo icon="◷" label={copy.timeLabel} value={copy.timeValue} body={copy.timeBody} /></div></section>

        <section className="contact-section"><div className="about-container contact-main-grid"><div className="contact-form-wrap"><p className="about-eyebrow">{copy.formKicker}</p><h2>{copy.formTitle}</h2><p className="contact-lead">{copy.formBody}</p><form className="contact-form" onSubmit={submit}><div className="contact-form-grid"><label>{copy.name}<input required value={form.name} onChange={updateField("name")} placeholder={copy.namePlaceholder} /></label><label>{copy.email}<input required type="email" value={form.email} onChange={updateField("email")} placeholder={copy.emailPlaceholder} /></label></div><label>{copy.subject}<select required value={form.subject} onChange={updateField("subject")}><option value="">{copy.subjectPlaceholder}</option>{copy.topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</select></label><label>{copy.message}<textarea required rows="6" value={form.message} onChange={updateField("message")} placeholder={copy.messagePlaceholder} /></label><button type="submit" className="contact-submit" disabled={busy} aria-busy={busy}>{busy ? (language === "km" ? "កំពុងរក្សាទុក..." : "Saving...") : copy.send} <span>→</span></button>{sent && <p className="contact-success" role="status">{copy.sent}</p>}{error && <p className="contact-error" role="alert">{error}</p>}</form></div><aside className="contact-side"><div className="contact-side-card contact-side-card-dark"><p className="about-eyebrow about-eyebrow-light">{copy.officeKicker}</p><h2>{copy.officeTitle}</h2><p>{copy.officeBody}</p><a href="https://t.me/RoeunVathana" target="_blank" rel="noreferrer" className="contact-side-link">@RoeunVathana <span>↗</span></a></div><div className="contact-side-card contact-quick-card"><p className="about-eyebrow">{copy.quickKicker}</p><h3>{copy.quickTitle}</h3><div>{copy.quick.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></div></aside></div></section>

        <section className="contact-cta"><div className="about-container contact-cta-inner"><div><p className="about-eyebrow about-eyebrow-light">{copy.ctaKicker}</p><h2>{copy.ctaTitle}</h2></div><Link to="/courses#courses" className="about-button about-button-primary">{copy.ctaButton} <span>→</span></Link></div></section>
      </main>

      <footer className="about-footer"><div className="about-container about-footer-inner"><div><p className="about-footer-brand">Campus<span>Flow</span></p><p>{copy.footerBody}</p></div><div className="about-footer-links"><Link to="/courses#courses">{copy.navCourses}</Link><Link to="/about">{copy.navAbout}</Link><Link to="/contact">{copy.navContact}</Link></div><a href="https://t.me/RoeunVathana" target="_blank" rel="noreferrer">Telegram support →</a></div></footer>
    </div>
  );
}

function ContactInfo({ icon, label, value, body }) {
  return <article className="contact-info-card"><span>{icon}</span><div><p>{label}</p><strong>{value}</strong><small>{body}</small></div></article>;
}

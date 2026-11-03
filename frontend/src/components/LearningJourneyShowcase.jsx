import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../learning-journey-showcase.css";

const demoSlides = [
  {
    label: "C++",
    slug: "cpp_programming",
    color: "#1768d4",
    code: "#include <iostream>\n\nint main() {\n  std::cout << \"Hello, C++!\";\n  return 0;\n}",
    output: "Hello, C++!",
  },
  {
    label: "C",
    slug: "c_programming",
    color: "#526a9d",
    code: "#include <stdio.h>\n\nint main(void) {\n  printf(\"Hello, C!\\n\");\n  return 0;\n}",
    output: "Hello, C!",
  },
  {
    label: "Java",
    slug: "java",
    color: "#b7790b",
    code: "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hello, Java!\");\n  }\n}",
    output: "Hello, Java!",
  },
  {
    label: "React",
    slug: "react",
    color: "#16a9c7",
    code: "export default function Welcome() {\n  return <h1>Hello, React!</h1>;\n}",
    output: "Hello, React!",
  },
  {
    label: "Python",
    slug: "python",
    color: "#3776ab",
    code: "course = \"CampusFlow\"\nprint(f\"Hello from {course}!\")",
    output: "Hello from CampusFlow!",
  },
  {
    label: "JavaScript",
    slug: "javascript",
    color: "#d6a800",
    code: "const learner = \"CampusFlow\";\nconsole.log(`Hello, ${learner}!`);",
    output: "Hello, CampusFlow!",
  },
  {
    label: "PHP",
    slug: "php",
    color: "#777bb4",
    code: "<?php\n$name = \"CampusFlow\";\necho \"Hello, $name!\";",
    output: "Hello, CampusFlow!",
  },
  {
    label: "Dart",
    slug: "dart-programming",
    color: "#0a8f9d",
    code: "void main() {\n  print('Hello, Dart!');\n}",
    output: "Hello, Dart!",
  },
];

const careerPaths = [
  {
    id: "web",
    icon: "</>",
    title: { en: "Web Developer", km: "អ្នកអភិវឌ្ឍន៍វេបសាយ" },
    summary: {
      en: "Build accessible websites, interactive interfaces and reliable web services.",
      km: "បង្កើតវេបសាយដែលងាយប្រើ អន្តរកម្មល្អ និងសេវាកម្មវេបដែលមានស្ថិរភាព។",
    },
    steps: [
      { title: { en: "Learn HTML, CSS and JavaScript", km: "រៀន HTML, CSS និង JavaScript" }, body: { en: "Start with semantic structure, responsive styling and programming fundamentals.", km: "ចាប់ផ្តើមពីរចនាសម្ព័ន្ធ ការរចនាឆ្លើយតប និងមូលដ្ឋានកម្មវិធី។" }, links: [["HTML", "html"], ["CSS", "css"], ["JavaScript", "javascript"]] },
      { title: { en: "Build interfaces with React", km: "បង្កើតផ្ទាំងប្រើប្រាស់ជាមួយ React" }, body: { en: "Turn reusable components, state and APIs into polished applications.", km: "ប្រើ component, state និង API ដើម្បីបង្កើតកម្មវិធីទំនើប។" }, links: [["React", "react"], ["Tailwind CSS", "tailwindcss"]] },
      { title: { en: "Learn backend development", km: "រៀនការអភិវឌ្ឍ Backend" }, body: { en: "Create APIs, authentication and databases for complete products.", km: "បង្កើត API ប្រព័ន្ធចូលប្រើ និងមូលដ្ឋានទិន្នន័យ។" }, links: [["Node.js", "node"], ["PHP", "php"], ["Laravel", "laravel"]] },
      { title: { en: "Ship a portfolio project", km: "បង្កើតគម្រោងសម្រាប់ Portfolio" }, body: { en: "Combine your skills in one responsive project and publish it for feedback.", km: "បញ្ចូលជំនាញទាំងអស់ក្នុងគម្រោងឆ្លើយតបមួយ ហើយចែករំលែកដើម្បីទទួលមតិ។" }, links: [["Start with HTML", "html"], ["Practice React", "react"]] },
    ],
  },
  {
    id: "mobile",
    icon: "▣",
    title: { en: "Mobile Developer", km: "អ្នកអភិវឌ្ឍន៍កម្មវិធីទូរស័ព្ទ" },
    summary: { en: "Create practical mobile applications for Android, iOS and the web.", km: "បង្កើតកម្មវិធីទូរស័ព្ទសម្រាប់ Android, iOS និងវេប។" },
    steps: [
      { title: { en: "Learn programming foundations", km: "រៀនមូលដ្ឋានកម្មវិធី" }, body: { en: "Understand variables, functions, collections and object-oriented design.", km: "ស្វែងយល់ variable, function, collection និង object-oriented design។" }, links: [["Dart", "dart-programming"], ["Java", "java"]] },
      { title: { en: "Build responsive screens", km: "បង្កើតអេក្រង់ឆ្លើយតប" }, body: { en: "Practice layout, navigation, forms and accessible touch controls.", km: "អនុវត្ត layout, navigation, form និងប៊ូតុងដែលងាយប៉ះ។" }, links: [["Flutter", "flutter"], ["CSS", "css"]] },
      { title: { en: "Connect data and APIs", km: "ភ្ជាប់ទិន្នន័យ និង API" }, body: { en: "Load remote data, store user state and handle errors safely.", km: "ទាញទិន្នន័យ រក្សាស្ថានភាពអ្នកប្រើ និងដោះស្រាយកំហុស។" }, links: [["Node.js", "node"], ["MySQL", "mysql"]] },
      { title: { en: "Release a complete app", km: "បញ្ចេញកម្មវិធីពេញលេញ" }, body: { en: "Test performance, polish the experience and prepare a production release.", km: "សាកល្បងល្បឿន កែលម្អបទពិសោធន៍ និងត្រៀមដាក់ប្រើប្រាស់។" }, links: [["Flutter", "flutter"], ["Git", "git"]] },
    ],
  },
  {
    id: "software",
    icon: "▤",
    title: { en: "Software Engineer", km: "វិស្វករកម្មវិធី" },
    summary: { en: "Design maintainable systems and solve problems with strong engineering habits.", km: "រចនាប្រព័ន្ធងាយថែទាំ និងដោះស្រាយបញ្ហាដោយវិធីសាស្ត្រវិស្វកម្ម។" },
    steps: [
      { title: { en: "Master one core language", km: "ស្ទាត់ជំនាញភាសាគោលមួយ" }, body: { en: "Learn syntax, data structures, debugging and clean code.", km: "រៀន syntax, data structure, debugging និង clean code។" }, links: [["Java", "java"], ["C++", "cpp_programming"], ["C#", "csharp"]] },
      { title: { en: "Understand system design", km: "យល់ពីការរចនាប្រព័ន្ធ" }, body: { en: "Model data, separate responsibilities and document important decisions.", km: "រៀបចំទិន្នន័យ បែងចែកតួនាទី និងកត់ត្រាសេចក្តីសម្រេច។" }, links: [["Spring Boot", "springboot"], ["MySQL", "mysql"]] },
      { title: { en: "Collaborate with Git", km: "សហការជាមួយ Git" }, body: { en: "Use branches, reviews and small commits to work safely with a team.", km: "ប្រើ branch, review និង commit តូចៗសម្រាប់ការងារក្រុម។" }, links: [["Git", "git"], ["Java", "java"]] },
      { title: { en: "Test and deliver", km: "សាកល្បង និងដាក់ប្រើប្រាស់" }, body: { en: "Add automated checks and release a reliable application.", km: "បន្ថែមការត្រួតពិនិត្យស្វ័យប្រវត្តិ និងបញ្ចេញកម្មវិធីដែលទុកចិត្តបាន។" }, links: [["C#", "csharp"], ["Spring Boot", "springboot"]] },
    ],
  },
  {
    id: "security",
    icon: "◈",
    title: { en: "Cybersecurity Specialist", km: "អ្នកជំនាញសន្តិសុខសាយប័រ" },
    summary: { en: "Protect systems by understanding networks, software and secure practices.", km: "ការពារប្រព័ន្ធដោយយល់ពីបណ្តាញ កម្មវិធី និងការអនុវត្តសុវត្ថិភាព។" },
    steps: [
      { title: { en: "Understand computers and networks", km: "យល់ពីកុំព្យូទ័រ និងបណ្តាញ" }, body: { en: "Learn how hardware, operating systems and network traffic work.", km: "រៀនពី hardware, operating system និងចរាចរបណ្តាញ។" }, links: [["Computer Components", "components-of-computer"], ["Cyber Security", "Cyber-Security"]] },
      { title: { en: "Learn scripting", km: "រៀនសរសេរ Script" }, body: { en: "Automate checks and analyze data with a practical language.", km: "ធ្វើការត្រួតពិនិត្យស្វ័យប្រវត្តិ និងវិភាគទិន្នន័យ។" }, links: [["Python", "python"], ["JavaScript", "javascript"]] },
      { title: { en: "Practice secure development", km: "អនុវត្តការអភិវឌ្ឍប្រកបដោយសុវត្ថិភាព" }, body: { en: "Protect authentication, validate input and avoid common vulnerabilities.", km: "ការពារ authentication ផ្ទៀងផ្ទាត់ input និងជៀសវាងចន្លោះសុវត្ថិភាព។" }, links: [["Cyber Security", "Cyber-Security"], ["PHP", "php"]] },
      { title: { en: "Document and respond", km: "កត់ត្រា និងឆ្លើយតប" }, body: { en: "Build a repeatable process for investigation, recovery and prevention.", km: "បង្កើតដំណើរការសម្រាប់ស៊ើបអង្កេត ស្តារ និងការពារ។" }, links: [["Git", "git"], ["Cyber Security", "Cyber-Security"]] },
    ],
  },
  {
    id: "devops",
    icon: "⌁",
    title: { en: "DevOps Engineer", km: "វិស្វករ DevOps" },
    summary: { en: "Connect development and operations through automation and reliable delivery.", km: "ភ្ជាប់ការអភិវឌ្ឍ និងប្រតិបត្តិការតាមរយៈស្វ័យប្រវត្តិកម្ម។" },
    steps: [
      { title: { en: "Learn Linux and Git workflows", km: "រៀន Linux និង Git workflow" }, body: { en: "Work confidently with files, processes, branches and reviews.", km: "ធ្វើការជាមួយ file, process, branch និង review។" }, links: [["Git", "git"], ["Cyber Security", "Cyber-Security"]] },
      { title: { en: "Automate with code", km: "ធ្វើស្វ័យប្រវត្តិកម្មជាមួយកូដ" }, body: { en: "Write scripts and services that reduce repeated manual work.", km: "សរសេរ script និង service ដើម្បីកាត់បន្ថយការងារដដែលៗ។" }, links: [["Python", "python"], ["Node.js", "node"]] },
      { title: { en: "Build deployment pipelines", km: "បង្កើត deployment pipeline" }, body: { en: "Test, package and release applications consistently.", km: "សាកល្បង package និងបញ្ចេញកម្មវិធីឱ្យមានស្ថិរភាព។" }, links: [["Git", "git"], ["Spring Boot", "springboot"]] },
      { title: { en: "Monitor production", km: "តាមដាន Production" }, body: { en: "Use logs and metrics to find problems before users do.", km: "ប្រើ log និង metric ដើម្បីរកបញ្ហាមុនអ្នកប្រើ។" }, links: [["Node.js", "node"], ["MySQL", "mysql"]] },
    ],
  },
  {
    id: "data",
    icon: "⌁",
    title: { en: "Data Scientist", km: "អ្នកវិទ្យាសាស្ត្រទិន្នន័យ" },
    summary: { en: "Turn data into useful explanations, predictions and decisions.", km: "បម្លែងទិន្នន័យទៅជាការពន្យល់ ការព្យាករណ៍ និងសេចក្តីសម្រេច។" },
    steps: [
      { title: { en: "Learn Python fundamentals", km: "រៀនមូលដ្ឋាន Python" }, body: { en: "Practice variables, functions, collections and file handling.", km: "អនុវត្ត variable, function, collection និងការគ្រប់គ្រង file។" }, links: [["Python", "python"], ["Git", "git"]] },
      { title: { en: "Store and query data", km: "រក្សាទុក និងស្វែងរកទិន្នន័យ" }, body: { en: "Use relational models and SQL to answer clear questions.", km: "ប្រើ relational model និង SQL ដើម្បីឆ្លើយសំណួរ។" }, links: [["MySQL", "mysql"], ["Python", "python"]] },
      { title: { en: "Analyze and communicate", km: "វិភាគ និងបង្ហាញលទ្ធផល" }, body: { en: "Clean datasets, test assumptions and explain results visually.", km: "សម្អាត dataset សាកល្បងសម្មតិកម្ម និងបង្ហាញលទ្ធផល។" }, links: [["Python", "python"], ["JavaScript", "javascript"]] },
      { title: { en: "Build a data project", km: "បង្កើតគម្រោងទិន្នន័យ" }, body: { en: "Publish a reproducible project with code, notes and conclusions.", km: "បោះពុម្ពគម្រោងដែលអាចធ្វើឡើងវិញជាមួយកូដ និងសេចក្តីសន្និដ្ឋាន។" }, links: [["Python", "python"], ["Git", "git"]] },
    ],
  },
];

const textByLanguage = {
  en: {
    demoKicker: "CODE IN MOTION",
    demoTitle: "See code become a result",
    demoBody: "Move through practical examples, pause the animation, or open the full lesson when you are ready to learn more.",
    previous: "Previous",
    next: "Next",
    pause: "Pause",
    play: "Play",
    code: "Code",
    result: "Result",
    lesson: "Open lesson",
    roadmapKicker: "YOUR LEARNING ROADMAP",
    roadmapTitle: "Choose the career path you want to build",
    roadmapBody: "Select a goal and follow a practical sequence from foundations to a portfolio-ready project.",
    recommended: "Recommended lessons",
  },
  km: {
    demoKicker: "កូដដែលមានចលនា",
    demoTitle: "មើលកូដបម្លែងទៅជាលទ្ធផល",
    demoBody: "មើលឧទាហរណ៍ជាក់ស្តែង ផ្អាកចលនា ឬបើកមេរៀនពេញលេញនៅពេលអ្នកត្រៀមខ្លួន។",
    previous: "មុន",
    next: "បន្ទាប់",
    pause: "ផ្អាក",
    play: "បន្ត",
    code: "កូដ",
    result: "លទ្ធផល",
    lesson: "បើកមេរៀន",
    roadmapKicker: "ផែនទីសិក្សារបស់អ្នក",
    roadmapTitle: "ជ្រើសរើសផ្លូវអាជីពដែលអ្នកចង់កសាង",
    roadmapBody: "ជ្រើសគោលដៅ ហើយរៀនតាមលំដាប់ជាក់ស្តែងពីមូលដ្ឋានរហូតដល់គម្រោង Portfolio។",
    recommended: "មេរៀនដែលណែនាំ",
  },
};

export default function LearningJourneyShowcase({ language = "en" }) {
  const locale = language === "km" ? "km" : "en";
  const copy = textByLanguage[locale];
  const [activeSlide, setActiveSlide] = useState(2);
  const [typedLength, setTypedLength] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [careerId, setCareerId] = useState("web");
  const [reducedMotion, setReducedMotion] = useState(false);
  const slide = demoSlides[activeSlide];
  const career = useMemo(() => careerPaths.find((item) => item.id === careerId) || careerPaths[0], [careerId]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setTypedLength(slide.code.length);
      return undefined;
    }
    setTypedLength(0);
    const timer = window.setInterval(() => {
      setTypedLength((current) => {
        if (current >= slide.code.length) {
          window.clearInterval(timer);
          return current;
        }
        return Math.min(current + 2, slide.code.length);
      });
    }, 26);
    return () => window.clearInterval(timer);
  }, [activeSlide, reducedMotion, slide.code]);

  useEffect(() => {
    if (!playing || reducedMotion) return undefined;
    const timer = window.setTimeout(() => setActiveSlide((current) => (current + 1) % demoSlides.length), 4800);
    return () => window.clearTimeout(timer);
  }, [activeSlide, playing, reducedMotion]);

  const showSlide = (index) => setActiveSlide((index + demoSlides.length) % demoSlides.length);

  return (
    <div className="learning-journey-shell">
      <section className="code-motion-section" aria-labelledby="code-motion-title">
        <div className="learning-section-heading">
          <p>{copy.demoKicker}</p>
          <h2 id="code-motion-title">{copy.demoTitle}</h2>
          <span>{copy.demoBody}</span>
        </div>

        <div className="code-motion-controls" aria-label={copy.demoTitle}>
          <button type="button" onClick={() => showSlide(activeSlide - 1)}><b aria-hidden="true">‹</b>{copy.previous}</button>
          <button type="button" className="is-primary" onClick={() => setPlaying((current) => !current)} aria-pressed={playing}>
            <b aria-hidden="true">{playing ? "Ⅱ" : "▶"}</b>{playing ? copy.pause : copy.play}
          </button>
          <button type="button" onClick={() => showSlide(activeSlide + 1)}>{copy.next}<b aria-hidden="true">›</b></button>
        </div>

        <div className="code-motion-stage">
          <article className="code-motion-card code-motion-editor">
            <header><span style={{ "--demo-color": slide.color }} />{copy.code} · {slide.label}</header>
            <pre><code>{slide.code.slice(0, typedLength)}{typedLength < slide.code.length && <i className="code-motion-cursor" aria-hidden="true" />}</code></pre>
          </article>
          <article className="code-motion-card code-motion-result">
            <header><span />{copy.result}</header>
            <div aria-live="polite" className={typedLength >= slide.code.length ? "is-ready" : ""}>
              <strong>{typedLength >= slide.code.length ? slide.output : "…"}</strong>
              <Link to={`/course/${slide.slug}`}>{copy.lesson} <span aria-hidden="true">→</span></Link>
            </div>
          </article>
        </div>

        <div className="code-motion-dots" aria-label={`${activeSlide + 1} / ${demoSlides.length}`}>
          {demoSlides.map((item, index) => <button type="button" key={item.label} className={index === activeSlide ? "is-active" : ""} aria-label={item.label} aria-current={index === activeSlide ? "true" : undefined} onClick={() => showSlide(index)} />)}
        </div>
        <p className="code-motion-position">{activeSlide + 1} / {demoSlides.length} · {slide.label}</p>
        <div className="code-motion-tabs" role="tablist" aria-label={copy.demoTitle}>
          {demoSlides.map((item, index) => <button type="button" role="tab" key={item.label} className={index === activeSlide ? "is-active" : ""} aria-selected={index === activeSlide} onClick={() => showSlide(index)}>{item.label}</button>)}
        </div>
      </section>

      <section className="career-roadmap-section" aria-labelledby="career-roadmap-title">
        <div className="learning-section-heading">
          <p>{copy.roadmapKicker}</p>
          <h2 id="career-roadmap-title">{copy.roadmapTitle}</h2>
          <span>{copy.roadmapBody}</span>
        </div>

        <div className="career-path-tabs" role="tablist" aria-label={copy.roadmapTitle}>
          {careerPaths.map((path) => (
            <button type="button" role="tab" key={path.id} className={path.id === career.id ? "is-active" : ""} aria-selected={path.id === career.id} onClick={() => setCareerId(path.id)}>
              <b aria-hidden="true">{path.icon}</b><span>{path.title[locale]}</span>
            </button>
          ))}
        </div>

        <div className="career-roadmap-intro">
          <span>{career.icon}</span>
          <div><h3>{career.title[locale]}</h3><p>{career.summary[locale]}</p></div>
        </div>

        <ol className="career-roadmap-list">
          {career.steps.map((step, index) => (
            <li key={step.title.en}>
              <span className="career-step-number">{index + 1}</span>
              <article>
                <h3>{step.title[locale]}</h3>
                <p>{step.body[locale]}</p>
                <div><small>{copy.recommended}</small>{step.links.map(([label, slug]) => <Link key={`${slug}-${label}`} to={`/course/${slug}`}>{label}<span aria-hidden="true">→</span></Link>)}</div>
              </article>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

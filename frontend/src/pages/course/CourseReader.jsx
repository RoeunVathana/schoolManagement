import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import SiteFooter from "../../components/SiteFooter";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import Seo from "../../components/Seo";
import ThemeSwitch from "../../components/ThemeSwitch";
import { useLanguage } from "../../context/LanguageContext";
import api from "../../api/axios";

const technologies = [
  ["HTML", "#f16529"],
  ["CSS", "#6c4ab6"],
  ["JavaScript", "#e5c747"],
  ["React", "#55cbed"],
  ["PHP", "#6266a7"],
  ["Laravel", "#ef4035"],
  ["Node.js", "#3b9d4e"],
  ["Tailwind CSS", "#2eabd0"],
  ["C", "#555b61"],
  ["C++", "#1c6a9e"],
  ["Python", "#4c8cc0"],
  ["Java", "#ac7518"],
  ["C#", "#734291"],
  ["Dart", "#008d9a"],
  ["SpringBoot", "#159c83"],
  ["Kotlin", "#6a3187"],
  ["Flutter", "#0872b4"],
  ["MySQL", "#e78319"],
  ["Git", "#f04f31"],
  ["Cyber Security", "#45c74d"],
  ["Computer Components", "#d45d66"],
  ["Bootstrap", "#7952b3"],
  ["Learn Code Yourself", "#2185a8"],
];

const readerText = {
  en: {
    courseTitle: (title) => `${title} Course`,
    courses: "Courses",
    backToCourses: "Back to courses",
    availableTechnologies: "Available technologies",
    scrollTechnologiesLeft: "Scroll technologies left",
    scrollTechnologiesRight: "Scroll technologies right",
    lessons: "Lessons",
    courseOutline: "Course outline",
    complete: "complete",
    lessonProgress: (current, total) => `Lesson ${current} of ${total}`,
    beginner: "Beginner",
    preview: "Preview",
    openLessonMenu: "Open lesson menu",
    openPreview: "Open example preview",
    closeLessonMenu: "Close lesson menu",
    closePreview: "Close preview",
    learnAtYourOwnPace: "Learn at your own pace. Your progress stays on this device.",
    referenceNote: "Reference-style reader · scroll through the full course or choose a lesson from the outline.",
    copied: "Copied",
    copy: "Copy",
    markAsComplete: "Mark as complete",
    completed: "Completed",
    previous: "Previous",
    next: "Next",
    liveExample: "Live example",
    renderedResult: "Rendered result:",
    tryItYourself: "Try it yourself",
    tryItYourselfBody: "Read the example, then change the code in your own editor to see what happens.",
    interactiveCoding: "Interactive coding",
    writeAndRun: "Write and run",
    browserSandbox: "Browser sandbox",
    secureRunnerReady: "Secure runner",
    secureRunnerNeeded: "Secure runner needed",
    live: "Live",
    reset: "Reset",
    run: "Run",
    checkRunner: "Check runner",
    codePlayground: "Code playground",
    editCode: (language) => `Edit ${language} code`,
    runShortcut: "Ctrl / ⌘ + Enter to run",
    result: "Result",
    editorReady: "Editor ready",
    editorReadyBody: (language) => `Write and copy your ${language} code here. To execute it safely, CampusFlow needs a containerized compiler service for this language.`,
    console: "Console",
    error: "Error",
    info: "Info",
    secureRunnerMessage: (language) => `This ${language} editor is ready, but a secure server compiler is not connected yet.`,
    compileAndRun: "Compile & run",
    runnerUnavailable: "The secure runner is unavailable. Check the API configuration and try again.",
    running: "Running...",
    syntaxOn: "Syntax colors on",
    outputEmpty: "Finished with no output.",
    practiceEveryDay: "Practice a little every day.",
    home: "CampusFlow home",
    academy: "CampusFlow Academy",
    browseCourses: "Courses",
    community: "Community",
    about: "About",
    faq: "FAQ",
    contact: "Contact",
  },
  km: {
    courseTitle: (title) => `វគ្គសិក្សា ${title}`,
    courses: "វគ្គសិក្សា",
    backToCourses: "ត្រឡប់ទៅវគ្គសិក្សា",
    availableTechnologies: "បច្ចេកវិទ្យាដែលមាន",
    scrollTechnologiesLeft: "រមូរបច្ចេកវិទ្យាទៅឆ្វេង",
    scrollTechnologiesRight: "រមូរបច្ចេកវិទ្យាទៅស្ដាំ",
    lessons: "មេរៀន",
    courseOutline: "គ្រោងមេរៀន",
    complete: "បានបញ្ចប់",
    lessonProgress: (current, total) => `មេរៀន ${current} នៃ ${total}`,
    beginner: "អ្នកចាប់ផ្តើម",
    preview: "មើលជាមុន",
    openLessonMenu: "បើកម៉ឺនុយមេរៀន",
    openPreview: "បើកការមើលឧទាហរណ៍ជាមុន",
    closeLessonMenu: "បិទម៉ឺនុយមេរៀន",
    closePreview: "បិទការមើលជាមុន",
    learnAtYourOwnPace: "រៀនតាមល្បឿនរបស់អ្នក។ វឌ្ឍនភាពរបស់អ្នកត្រូវបានរក្សាទុកនៅលើឧបករណ៍នេះ។",
    referenceNote: "ទំព័រមេរៀនពេញលេញ · រមូរមើលវគ្គសិក្សាទាំងមូល ឬជ្រើសរើសមេរៀនពីគ្រោងមេរៀន។",
    copied: "បានចម្លង",
    copy: "ចម្លង",
    markAsComplete: "សម្គាល់ថាបានបញ្ចប់",
    completed: "បានបញ្ចប់",
    previous: "មុន",
    next: "បន្ទាប់",
    liveExample: "ឧទាហរណ៍បន្តផ្ទាល់",
    renderedResult: "លទ្ធផលដែលបានបង្ហាញ៖",
    tryItYourself: "សាកល្បងដោយខ្លួនឯង",
    tryItYourselfBody: "អានឧទាហរណ៍ បន្ទាប់មកកែប្រែកូដក្នុងកម្មវិធីកែសម្រួលរបស់អ្នក ដើម្បីមើលលទ្ធផល។",
    interactiveCoding: "ការសរសេរកូដអន្តរកម្ម",
    writeAndRun: "សរសេរ និងដំណើរការ",
    browserSandbox: "បរិស្ថានសាកល្បងក្នុងកម្មវិធីរុករក",
    secureRunnerNeeded: "ត្រូវការឧបករណ៍ដំណើរការដែលមានសុវត្ថិភាព",
    live: "បន្តផ្ទាល់",
    reset: "កំណត់ឡើងវិញ",
    run: "ដំណើរការ",
    checkRunner: "ពិនិត្យឧបករណ៍ដំណើរការ",
    codePlayground: "កន្លែងសាកល្បងកូដ",
    editCode: (language) => `កែសម្រួលកូដ ${language}`,
    runShortcut: "Ctrl / ⌘ + Enter ដើម្បីដំណើរការ",
    result: "លទ្ធផល",
    editorReady: "កម្មវិធីកែសម្រួលរួចរាល់",
    editorReadyBody: (language) => `សរសេរ និងចម្លងកូដ ${language} របស់អ្នកនៅទីនេះ។ ដើម្បីដំណើរការដោយសុវត្ថិភាព CampusFlow ត្រូវការសេវាកម្ម compiler ដែលដំណើរការក្នុង container សម្រាប់ភាសានេះ។`,
    console: "កុងសូល",
    error: "កំហុស",
    info: "ព័ត៌មាន",
    secureRunnerMessage: (language) => `កម្មវិធីកែសម្រួល ${language} នេះរួចរាល់ ប៉ុន្តែមិនទាន់បានភ្ជាប់ compiler សុវត្ថិភាពនៅលើ server ទេ។`,
    practiceEveryDay: "អនុវត្តបន្តិចរាល់ថ្ងៃ។",
    home: "ទំព័រដើម CampusFlow",
    academy: "សាលា CampusFlow",
    browseCourses: "វគ្គសិក្សា",
    community: "សហគមន៍",
    about: "អំពីយើង",
    faq: "សំណួរដែលសួរញឹកញាប់",
    contact: "ទំនាក់ទំនង",
  },
};

function getReaderText(language) {
  return { ...readerText.en, ...(readerText[language] || {}) };
}

const lessons = [
  {
    number: "1",
    title: "Introduction to HTML",
    items: [
      {
        id: "what-is-html",
        label: "1.1. What is HTML?",
        heading: "1. Introduction to HTML",
        intro: "HTML (HyperText Markup Language) is the language used to structure content on the web. It tells the browser what each piece of content means and how it belongs in a page.",
        bodyHeading: "1.1 What is HTML?",
        body: "HTML uses elements and tags to describe headings, paragraphs, links, images and other parts of a website. It is the first building block for every web page.",
        code: "<p>This is a paragraph in HTML.</p>",
        preview: { title: "Welcome to CampusFlow!", body: "This is a simple HTML page." },
      },
      {
        id: "document-structure",
        label: "1.2. HTML Document Structure",
        heading: "1.2 HTML Document Structure",
        intro: "A complete HTML document has a predictable structure. The doctype declares the document type, while html, head and body contain the page itself.",
        bodyHeading: "The basic structure",
        body: "The head contains page information for the browser. The body contains the content people see and interact with.",
        code: "<!DOCTYPE html>\n<html>\n  <head>\n    <title>My page</title>\n  </head>\n  <body>\n    <h1>Hello, world!</h1>\n  </body>\n</html>",
        preview: { title: "My first page", body: "Hello, world!" },
      },
      {
        id: "basic-tags",
        label: "1.3. Basic HTML Tags and their Usage",
        heading: "1.3 Basic HTML Tags",
        intro: "Tags give meaning to content. Use headings for titles, paragraphs for text, links for navigation and lists for groups of related items.",
        bodyHeading: "Common elements",
        body: "Good HTML is semantic: choose the element that best describes the content instead of styling every element with a generic div.",
        code: "<h1>Course title</h1>\n<p>Learn with a clear structure.</p>\n<a href=\"/courses\">Browse courses</a>",
        preview: { title: "Course title", body: "Learn with a clear structure." },
      },
      {
        id: "page-structure",
        label: "1.4. Structure of an HTML Page",
        heading: "1.4 Structure of an HTML Page",
        intro: "A page can be divided into meaningful regions such as header, navigation, main content and footer.",
        bodyHeading: "Semantic page regions",
        body: "Semantic regions make a page easier for people, search engines and assistive technology to understand.",
        code: "<header>CampusFlow</header>\n<nav>Courses</nav>\n<main>Lesson content</main>\n<footer>Keep learning</footer>",
        preview: { title: "CampusFlow", body: "Lesson content" },
      },
      {
        id: "elements-attributes",
        label: "1.5. HTML Elements and Attributes",
        heading: "1.5 HTML Elements and Attributes",
        intro: "Attributes add extra information to an element. For example, href tells a link where to go and class gives it a styling hook.",
        bodyHeading: "Elements and attributes",
        body: "Keep attribute values clear and use accessible names for controls, images and links.",
        code: "<a href=\"/courses\" class=\"primary-link\">\n  View courses\n</a>",
        preview: { title: "View courses", body: "The href attribute points to another page." },
      },
    ],
  },
  {
    number: "2",
    title: "Basic HTML Tags",
    items: [
      {
        id: "text-formatting",
        label: "2.1. Text Formatting Tags",
        heading: "2.1 Text Formatting Tags",
        intro: "Text elements help readers scan a lesson. Use headings in order and reserve strong emphasis for content that is genuinely important.",
        bodyHeading: "Readable text",
        body: "A clear hierarchy improves learning on large screens and small screens alike.",
        code: "<h2>Learning goal</h2>\n<p><strong>Practice</strong> makes progress.</p>",
        preview: { title: "Learning goal", body: "Practice makes progress." },
      },
      {
        id: "headings",
        label: "2.1.1. h1 to h6 (Headings)",
        heading: "2.1.1 Heading Levels",
        intro: "Heading levels communicate the outline of a document. Start with h1 and use h2 and h3 for nested sections.",
        bodyHeading: "Choose headings by meaning",
        body: "Do not choose a heading only because it looks large. Use CSS to change its appearance after the structure is correct.",
        code: "<h1>HTML course</h1>\n<h2>Introduction</h2>\n<h3>What is HTML?</h3>",
        preview: { title: "HTML course", body: "Introduction · What is HTML?" },
      },
    ],
  },
  {
    number: "3",
    title: "Links and Images",
    items: [
      {
        id: "links-images",
        label: "3.1. Links and Images",
        heading: "3.1 Links and Images",
        intro: "Links connect pages and images add visual context. Both need clear, useful alternative text and meaningful destinations.",
        bodyHeading: "Useful links and images",
        body: "Write link text that makes sense by itself and give informative images a concise alt description.",
        code: "<a href=\"/courses\">Explore courses</a>\n<img src=\"campusflow.jpg\" alt=\"CampusFlow lesson\">",
        preview: { title: "Explore courses", body: "CampusFlow lesson image" },
      },
    ],
  },
];

const courseCatalog = {
  html: {
    slug: "html",
    title: "HTML",
    description: "Learn the structure of web pages with practical HTML lessons.",
    codeLabel: "example.html",
    tip: "Keep your HTML structure simple and meaningful before adding visual styles.",
    lessons,
  },
  css: {
    slug: "css",
    title: "CSS",
    description: "Learn how to style, lay out and make responsive web pages with CSS.",
    codeLabel: "styles.css",
    tip: "Start with a clear layout system, then add spacing, color and motion one layer at a time.",
    lessons: [
      {
        number: "1",
        title: "CSS Introduction",
        items: [
          { id: "css-what", label: "1.1. What is CSS?", heading: "1. Introduction to CSS", intro: "CSS (Cascading Style Sheets) controls how HTML content looks. It gives a page its colors, spacing, typography and responsive layout.", bodyHeading: "1.1 What is CSS?", body: "CSS separates presentation from structure, making it easier to update a whole site consistently.", code: "body {\n  font-family: Arial, sans-serif;\n  color: #17335b;\n  background: #f7f9fc;\n}", preview: { title: "CSS makes pages clear", body: "This card is styled with a small CSS rule." } },
          { id: "css-syntax", label: "1.2. CSS Syntax and Selectors", heading: "1.2 CSS Syntax and Selectors", intro: "A CSS rule combines a selector with declarations. Selectors choose the elements that should receive the style.", bodyHeading: "Selectors target elements", body: "Use class selectors for reusable components and keep selectors short so styles remain easy to maintain.", code: ".lesson-card {\n  border: 1px solid #dbe4f0;\n  border-radius: 16px;\n  padding: 24px;\n}", preview: { title: "A lesson card", body: "Reusable classes keep components consistent." } },
          { id: "css-colors", label: "1.3. Colors and Typography", heading: "1.3 Colors and Typography", intro: "Color and type create hierarchy. Choose readable contrast and a type scale that works from phones to large screens.", bodyHeading: "Make content easy to scan", body: "Use a limited palette and predictable text sizes for headings, body copy and supporting labels.", code: ":root {\n  --blue: #2858d5;\n  --ink: #17335b;\n}\n\nh1 { color: var(--blue); }", preview: { title: "Readable hierarchy", body: "A small design system gives every page a shared visual language." } },
        ],
      },
      {
        number: "2",
        title: "CSS Layout",
        items: [
          { id: "css-box-model", label: "2.1. The CSS Box Model", heading: "2.1 The CSS Box Model", intro: "Every element is a box with content, padding, border and margin. Understanding the box model prevents unexpected spacing.", bodyHeading: "Content, padding and margin", body: "Use box-sizing border-box so declared widths include padding and borders in a predictable way.", code: "* { box-sizing: border-box; }\n\n.card {\n  padding: 1rem;\n  margin: 0 auto;\n}", preview: { title: "Predictable spacing", body: "The box model controls how a component occupies space." } },
          { id: "css-flexbox", label: "2.2. Flexbox", heading: "2.2 Flexbox Layout", intro: "Flexbox is useful for arranging items in one direction, aligning controls and building responsive navigation rows.", bodyHeading: "Align a row of content", body: "Use gap instead of manual margins when items belong to the same layout group.", code: ".toolbar {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 1rem;\n}", preview: { title: "A flexible toolbar", body: "Items stay aligned as the available width changes." } },
          { id: "css-grid", label: "2.3. CSS Grid", heading: "2.3 CSS Grid", intro: "Grid is ideal for two-dimensional layouts such as course cards, dashboards and page shells.", bodyHeading: "Build a responsive grid", body: "minmax and auto-fit let the browser choose how many columns fit without JavaScript.", code: ".course-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));\n  gap: 1.25rem;\n}", preview: { title: "Responsive cards", body: "The grid adapts to the width of its container." } },
        ],
      },
      {
        number: "3",
        title: "Responsive CSS",
        items: [
          { id: "css-responsive", label: "3.1. Responsive Design", heading: "3.1 Responsive Design", intro: "Responsive design lets one interface work across phones, tablets and desktops without forcing users to zoom or scroll sideways.", bodyHeading: "Design for every screen", body: "Prefer fluid widths, flexible grids and content-driven breakpoints over fixed device-specific layouts.", code: "@media (max-width: 640px) {\n  .page-shell {\n    padding-inline: 1rem;\n  }\n\n  .toolbar {\n    flex-wrap: wrap;\n  }\n}", preview: { title: "Mobile first", body: "The same content stays comfortable on a small screen." } },
        ],
      },
    ],
  },
  javascript: {
    slug: "javascript",
    title: "JavaScript",
    description: "Learn the JavaScript fundamentals that make websites interactive.",
    codeLabel: "app.js",
    tip: "Keep state changes explicit and name functions after the user action they perform.",
    lessons: [
      {
        number: "1",
        title: "JavaScript Introduction",
        items: [
          { id: "js-what", label: "1.1. What is JavaScript?", heading: "1. Introduction to JavaScript", intro: "JavaScript is the programming language that adds behavior to web pages. It can respond to events, update the DOM and communicate with APIs.", bodyHeading: "1.1 What is JavaScript?", body: "A small script can turn a static page into an interface that responds to the learner.", code: "const message = document.querySelector('#message');\nmessage.textContent = 'Keep learning!';", preview: { title: "Keep learning!", body: "JavaScript changed this message on the page." } },
          { id: "js-variables", label: "1.2. Variables and Data Types", heading: "1.2 Variables and Data Types", intro: "Variables give names to values. Use const by default and let when a value needs to change.", bodyHeading: "Name the information you use", body: "Clear variable names make code easier to read and reduce mistakes when a lesson grows.", code: "const course = 'JavaScript';\nlet completedLessons = 0;\ncompletedLessons += 1;", preview: { title: "JavaScript", body: "Completed lessons: 1" } },
          { id: "js-functions", label: "1.3. Functions", heading: "1.3 Functions", intro: "Functions group a reusable action. They can receive inputs and return a result.", bodyHeading: "Give actions a clear name", body: "Small functions are easier to test and combine than one large function that changes everything.", code: "function greet(name) {\n  return `Hello, ${name}!`;\n}\n\ngreet('Learner');", preview: { title: "Hello, Learner!", body: "A function turned an input into a message." } },
        ],
      },
      {
        number: "2",
        title: "DOM and Events",
        items: [
          { id: "js-dom", label: "2.1. The DOM", heading: "2.1 Working with the DOM", intro: "The Document Object Model represents a page as objects that JavaScript can read and update.", bodyHeading: "Select and update elements", body: "Query the element you need, make the smallest update possible and keep the page accessible.", code: "const button = document.querySelector('button');\nconst status = document.querySelector('[role=status]');\n\nstatus.textContent = 'Ready';", preview: { title: "Ready", body: "The DOM now contains updated content." } },
          { id: "js-events", label: "2.2. Events", heading: "2.2 Events and User Actions", intro: "Events describe things users and browsers do, such as clicks, input changes and page loading.", bodyHeading: "Respond to a click", body: "Attach a small event handler that updates only the part of the UI that needs to change.", code: "button.addEventListener('click', () => {\n  status.textContent = 'Completed';\n});", preview: { title: "Completed", body: "The interface responds to the learner's action." } },
          { id: "js-arrays", label: "2.3. Arrays and Loops", heading: "2.3 Arrays and Loops", intro: "Arrays hold a list of values. Loops and array methods help render repeated course lessons without copying markup.", bodyHeading: "Render a list", body: "Prefer readable array methods such as map when creating a new list from existing data.", code: "const lessons = ['HTML', 'CSS', 'JavaScript'];\nconst labels = lessons.map((name) => `Learn ${name}`);", preview: { title: "Three learning paths", body: "Learn HTML · Learn CSS · Learn JavaScript" } },
        ],
      },
      {
        number: "3",
        title: "Async JavaScript",
        items: [
          { id: "js-fetch", label: "3.1. Fetching Data", heading: "3.1 Fetching Data from an API", intro: "Modern interfaces request data without reloading the whole page. fetch returns a promise for the server response.", bodyHeading: "Load course data", body: "Show a loading state, handle errors and render the response only after it has been validated.", code: "const response = await fetch('/api/courses');\nconst courses = await response.json();\nconsole.log(courses);", preview: { title: "Courses loaded", body: "The learner can continue without a full page refresh." } },
        ],
      },
    ],
  },
  tailwindcss: {
    slug: "tailwindcss",
    title: "Tailwind CSS",
    description: "Build responsive interfaces quickly with Tailwind CSS utility classes.",
    codeLabel: "component.html",
    tip: "Keep repeated utility patterns in reusable components instead of copying long class strings everywhere.",
    lessons: [
      {
        number: "1",
        title: "Tailwind CSS Introduction",
        items: [
          { id: "tw-what", label: "1.1. What is Tailwind CSS?", heading: "1. Introduction to Tailwind CSS", intro: "Tailwind CSS is a utility-first framework. Small classes compose directly in markup to build a consistent design system.", bodyHeading: "1.1 Utility-first styling", body: "Utilities make spacing, color and responsive behavior visible at the component where they are used.", code: "<article class=\"rounded-2xl bg-white p-6 shadow-sm\">\n  <h2 class=\"text-2xl font-black text-slate-900\">Course card</h2>\n</article>", preview: { title: "Course card", body: "This card uses utility classes for its shape and spacing." } },
          { id: "tw-setup", label: "1.2. Setup and Configuration", heading: "1.2 Setup and Configuration", intro: "A Tailwind project scans your source files and generates the utilities your interface actually uses.", bodyHeading: "Connect Tailwind to your project", body: "Keep the source paths accurate so classes used in components are included in the production build.", code: "export default {\n  content: ['./src/**/*.{js,jsx,ts,tsx}'],\n  theme: { extend: {} },\n};", preview: { title: "Configured project", body: "The build can now find classes in your source files." } },
          { id: "tw-spacing", label: "1.3. Colors, Spacing and Type", heading: "1.3 Design Tokens", intro: "Tailwind provides a shared scale for color, spacing, typography, radius and shadows.", bodyHeading: "Compose a consistent card", body: "Using the same scale across pages keeps the product visually calm and makes responsive changes faster.", code: "<p class=\"mt-2 text-sm leading-6 text-slate-500\">\n  Practical learning for everyone.\n</p>", preview: { title: "Shared visual language", body: "Small tokens create a consistent experience." } },
        ],
      },
      {
        number: "2",
        title: "Tailwind Layout",
        items: [
          { id: "tw-flex", label: "2.1. Flex and Grid", heading: "2.1 Flex and Grid Utilities", intro: "Tailwind maps directly to CSS layout features such as flexbox and grid.", bodyHeading: "Build the layout in markup", body: "Start with a single-column mobile layout, then add larger-screen columns with responsive prefixes.", code: "<div class=\"grid gap-6 md:grid-cols-2 lg:grid-cols-3\">\n  {cards}\n</div>", preview: { title: "Responsive grid", body: "The layout grows from one column to three." } },
          { id: "tw-responsive", label: "2.2. Responsive Variants", heading: "2.2 Responsive Variants", intro: "Prefixes such as sm, md and lg apply utilities at larger breakpoints.", bodyHeading: "Make the component responsive", body: "Change only the values that need more space while keeping the mobile default readable.", code: "<button class=\"w-full px-4 py-3 sm:w-auto sm:px-6\">\n  Start learning\n</button>", preview: { title: "Start learning", body: "The button adapts without custom media-query code." } },
          { id: "tw-states", label: "2.3. Hover, Focus and Dark Mode", heading: "2.3 States and Dark Mode", intro: "State variants make interactive controls clearer and help you support dark mode with the same component.", bodyHeading: "Design the interaction states", body: "Always include a visible focus state for keyboard users and keep contrast strong in both themes.", code: "<a class=\"bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-2 dark:bg-emerald-300 dark:text-slate-900\">\n  Open course\n</a>", preview: { title: "Open course", body: "Hover, focus and dark-mode styles belong to the component." } },
        ],
      },
      {
        number: "3",
        title: "Tailwind Components",
        items: [
          { id: "tw-components", label: "3.1. Reusable Components", heading: "3.1 Reusable Components", intro: "Tailwind works best when utility combinations live inside reusable components with clear props.", bodyHeading: "Extract repeated patterns", body: "Use a component when a visual pattern has a name, behavior or repeated content.", code: "function Badge({ children }) {\n  return <span className=\"rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold\">\n    {children}\n  </span>;\n}", preview: { title: "Reusable badge", body: "A named component keeps repeated UI easy to change." } },
        ],
      },
    ],
  },
  react: {
    slug: "react",
    title: "React",
    description: "Build interactive interfaces with components, props and state in React.",
    codeLabel: "App.jsx",
    tip: "Keep components focused: receive data with props and keep state close to the interaction that owns it.",
    lessons: [
      {
        number: "1",
        title: "React Introduction",
        items: [
          { id: "react-what", label: "1.1. What is React?", heading: "1. React Introduction", intro: "React is a JavaScript library for building user interfaces from reusable components. It helps you describe what the screen should look like for each state.", bodyHeading: "1.1 What is React?", body: "React uses a component-based architecture and a declarative approach to keep interface updates predictable.", code: "function Welcome() {\n  return <h1>Welcome to React</h1>;\n}", preview: { title: "Welcome to React", body: "A component returns the interface it describes." } },
          { id: "react-why", label: "1.2. Why Use React?", heading: "1.2 Why Use React?", intro: "React helps teams organize complex interfaces into small pieces that can be composed, tested and reused.", bodyHeading: "Build with components", body: "A page can combine navigation, course cards, progress bars and forms without duplicating their behavior.", code: "function CourseCard({ title }) {\n  return <article className=\"course-card\">\n    <h2>{title}</h2>\n  </article>;\n}", preview: { title: "HTML Fundamentals", body: "This course card is reusable on any page." } },
          { id: "react-features", label: "1.3. React Features", heading: "1.3 React Features", intro: "Components, props, state and hooks are the core ideas you will use to build a React application.", bodyHeading: "The React mental model", body: "Pass data down with props, keep changing values in state and let React update the rendered result.", code: "function Greeting({ name }) {\n  return <p>Hello, {name}!</p>;\n}\n\n<Greeting name=\"Learner\" />", preview: { title: "Hello, Learner!", body: "Props allow a component to render different data." } },
          { id: "react-setup", label: "1.4. Setting Up React (Vite & CRA)", heading: "1.4 Setting Up React", intro: "Vite gives a fast development server and a production build for modern React applications.", bodyHeading: "Create the first app", body: "Start with a small app, make one visible change and use the browser console to understand the development loop.", code: "npm create vite@latest campusflow-ui\ncd campusflow-ui\nnpm install\nnpm run dev", preview: { title: "CampusFlow UI", body: "Your React development server is ready." } },
          { id: "react-first-app", label: "1.5. Writing First React App", heading: "1.5 Writing Your First React App", intro: "A React app begins with a root component. From there, compose the page from smaller components with clear responsibilities.", bodyHeading: "Render the app", body: "Keep the root simple and move repeated UI into components as the interface grows.", code: "export default function App() {\n  return (\n    <main>\n      <h1>My first React app</h1>\n    </main>\n  );\n}", preview: { title: "My first React app", body: "The root component renders the application." },
          },
        ],
      },
      {
        number: "2",
        title: "React Basics",
        items: [
          { id: "react-jsx", label: "2.1. JSX (JavaScript XML)", heading: "2.1 JSX", intro: "JSX lets you describe UI with a syntax that looks like HTML while keeping the power of JavaScript.", bodyHeading: "Mix data with markup", body: "Use braces to insert expressions and remember that JSX attributes use JavaScript naming conventions.", code: "const name = 'CampusFlow';\nreturn <h1 className=\"title\">{name}</h1>;", preview: { title: "CampusFlow", body: "JSX combines markup and data." } },
          { id: "react-components", label: "2.2. Components and Props", heading: "2.2 Components and Props", intro: "Components are functions that receive props and return UI. Props should be treated as read-only input.", bodyHeading: "Compose small components", body: "A component can render another component and pass only the data it needs.", code: "function LessonTitle({ number, children }) {\n  return <h2>{number}. {children}</h2>;\n}", preview: { title: "1. HTML Basics", body: "A small component can be reused throughout a course." } },
          { id: "react-state", label: "2.3. State and Lifecycle", heading: "2.3 State and Lifecycle", intro: "State stores values that change over time. When state changes, React renders the component again with the new value.", bodyHeading: "Track progress", body: "Keep progress state close to the button that changes it and render the result from one source of truth.", code: "const [complete, setComplete] = useState(false);\n\n<button onClick={() => setComplete(true)}>\n  {complete ? 'Completed' : 'Mark complete'}\n</button>", preview: { title: "Completed", body: "State updates the button label." } },
        ],
      },
    ],
  },
  c_programming: {
    slug: "c_programming",
    title: "C Programming",
    description: "Learn C programming fundamentals, memory, functions and structured problem solving.",
    codeLabel: "main.c",
    tip: "Write small functions, initialize variables and compile often so errors stay easy to understand.",
    lessons: [
      {
        number: "1",
        title: "Introduction to C",
        items: [
          { id: "c-what", label: "1.1. What is C?", heading: "1. Introduction to C", intro: "C is a compiled programming language used to build operating systems, embedded software and fast applications. It gives you a clear view of how programs use memory and instructions.", bodyHeading: "1.1 What is C?", body: "C combines a small language with a powerful standard library. Learning its syntax builds a strong foundation for C++, Java and many other languages.", code: "#include <stdio.h>\n\nint main(void) {\n  printf(\"Hello, C!\\n\");\n  return 0;\n}", preview: { title: "Hello, C!", body: "The program starts in main and prints a message." } },
          { id: "c-setup", label: "1.2. Setting Up a C Compiler", heading: "1.2 Setting Up a C Compiler", intro: "A C compiler translates source code into a program the computer can run. GCC and Clang are popular compilers for learning and production work.", bodyHeading: "Compile and run a program", body: "Keep the source file separate from the executable and use compiler warnings to catch mistakes early.", code: "cc -Wall -Wextra -std=c17 main.c -o main\n./main", preview: { title: "Compiled successfully", body: "Warnings help you improve the program before it grows." } },
          { id: "c-syntax", label: "1.3. C Syntax and Structure", heading: "1.3 C Syntax and Structure", intro: "C programs are made from statements, expressions, functions and blocks. Semicolons end statements and braces define a block of code.", bodyHeading: "Read the program structure", body: "Use indentation and meaningful names to make low-level code as easy to read as possible.", code: "#include <stdio.h>\n\nint add(int left, int right) {\n  return left + right;\n}", preview: { title: "A clear structure", body: "Functions can hide details behind a name that explains the action." } },
        ],
      },
      {
        number: "2",
        title: "C Fundamentals",
        items: [
          { id: "c-variables", label: "2.1. Variables and Data Types", heading: "2.1 Variables and Data Types", intro: "C provides types such as int, double, char and arrays. The type tells the compiler how to store and interpret a value.", bodyHeading: "Choose the right type", body: "Initialize values close to their declaration and use constants when a value should not change.", code: "int lessons = 4;\ndouble progress = 0.75;\nchar level = 'A';\nconst int max_lessons = 10;", preview: { title: "Course progress", body: "4 of 10 lessons are complete." } },
          { id: "c-control", label: "2.2. Control Flow", heading: "2.2 Control Flow", intro: "Conditions and loops let a program choose what to do and repeat work. They are the building blocks of every useful algorithm.", bodyHeading: "Make decisions", body: "Keep conditions simple and give each branch a clear purpose for the reader.", code: "if (score >= 80) {\n  printf(\"Excellent\\n\");\n} else {\n  printf(\"Keep practicing\\n\");\n}", preview: { title: "Keep practicing", body: "The program selected a branch from the score." } },
          { id: "c-loops", label: "2.3. Loops", heading: "2.3 Loops", intro: "for, while and do-while loops repeat a block of code while a condition is true. Pick the loop that makes the stopping rule obvious.", bodyHeading: "Repeat a known number of times", body: "A for loop keeps initialization, the condition and the update together so the iteration is easy to review.", code: "for (int lesson = 1; lesson <= 3; lesson++) {\n  printf(\"Lesson %d\\n\", lesson);\n}", preview: { title: "Lesson 1 · Lesson 2 · Lesson 3", body: "The loop rendered three lesson labels." } },
        ],
      },
      {
        number: "3",
        title: "Functions and Arrays",
        items: [
          { id: "c-functions", label: "3.1. Functions", heading: "3.1 Functions", intro: "Functions group a task behind a reusable name. Parameters provide input and a return value communicates the result.", bodyHeading: "Build reusable logic", body: "Declare functions with a clear return type and keep each function focused on one job.", code: "int square(int value) {\n  return value * value;\n}\n\nint result = square(5);", preview: { title: "Result: 25", body: "The function returned the square of the input." } },
          { id: "c-arrays", label: "3.2. Arrays and Strings", heading: "3.2 Arrays and Strings", intro: "Arrays store values of the same type next to one another. C strings are character arrays that end with a null character.", bodyHeading: "Work with a collection", body: "Track the array length carefully and leave space for the string terminator when allocating character storage.", code: "int scores[] = {80, 92, 88};\nsize_t count = sizeof(scores) / sizeof(scores[0]);\n\nprintf(\"Count: %zu\\n\", count);", preview: { title: "3 scores", body: "Arrays make a group of related values easy to process." } },
          { id: "c-pointers", label: "3.3. Pointers and Memory", heading: "3.3 Pointers and Memory", intro: "A pointer stores the address of another value. Pointers allow functions to update data and let programs work directly with memory.", bodyHeading: "Understand an address", body: "Only dereference valid pointers, initialize them and release memory that was allocated dynamically.", code: "int lessons = 3;\nint *lessons_ptr = &lessons;\n*lessons_ptr += 1;", preview: { title: "Lessons: 4", body: "The pointer changed the value stored at an address." } },
        ],
      },
    ],
  },
  java: {
    slug: "java",
    title: "Java",
    description: "Learn Java syntax, object-oriented programming and collections through practical examples.",
    codeLabel: "Main.java",
    tip: "Prefer small classes with clear responsibilities and let the compiler guide you as you refactor.",
    lessons: [
      {
        number: "1",
        title: "Introduction to Java",
        items: [
          { id: "java-what", label: "1.1. What is Java?", heading: "1. Introduction to Java", intro: "Java is a strongly typed, object-oriented language that runs on the Java Virtual Machine. It is used for services, Android applications and large business systems.", bodyHeading: "1.1 What is Java?", body: "Java source is compiled to bytecode so the same program can run on any platform with a compatible JVM.", code: "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hello, Java!\");\n  }\n}", preview: { title: "Hello, Java!", body: "The JVM runs the compiled class through its main method." } },
          { id: "java-setup", label: "1.2. Setting Up the JDK", heading: "1.2 Setting Up the JDK", intro: "The Java Development Kit includes the compiler, runtime tools and utilities needed to build Java applications.", bodyHeading: "Compile and run a class", body: "Use the same JDK version for local development and the deployment environment when possible.", code: "javac Main.java\njava Main", preview: { title: "JDK ready", body: "The compiler created a class that the JVM can execute." } },
          { id: "java-types", label: "1.3. Variables and Data Types", heading: "1.3 Variables and Data Types", intro: "Java includes primitive types for simple values and reference types for objects. The compiler checks types before the program runs.", bodyHeading: "Declare values clearly", body: "Use final for values that should not be reassigned and choose names that explain the data.", code: "final String course = \"Java\";\nint completedLessons = 2;\nboolean active = true;", preview: { title: "Java", body: "2 lessons completed · account active" } },
        ],
      },
      {
        number: "2",
        title: "Object-Oriented Java",
        items: [
          { id: "java-classes", label: "2.1. Classes and Objects", heading: "2.1 Classes and Objects", intro: "A class describes data and behavior. An object is an instance of that class created while the program runs.", bodyHeading: "Model a learning course", body: "Keep fields private and expose behavior through methods so the class can protect its own rules.", code: "class Course {\n  private final String title;\n\n  Course(String title) { this.title = title; }\n  String getTitle() { return title; }\n}", preview: { title: "Java Fundamentals", body: "An object keeps its title behind a small API." } },
          { id: "java-inheritance", label: "2.2. Inheritance and Interfaces", heading: "2.2 Inheritance and Interfaces", intro: "Interfaces describe capabilities and inheritance can share a base implementation. Prefer composition when a type does not truly have an is-a relationship.", bodyHeading: "Program to an interface", body: "A small interface lets different implementations work with the same calling code.", code: "interface Notifier {\n  void send(String message);\n}\n\nclass EmailNotifier implements Notifier {\n  public void send(String message) {\n    System.out.println(message);\n  }\n}", preview: { title: "Notification sent", body: "The caller uses the interface, not a concrete implementation." } },
          { id: "java-exceptions", label: "2.3. Exceptions", heading: "2.3 Exceptions", intro: "Exceptions represent failures that need a different path. Handle errors where you can add useful context or recover safely.", bodyHeading: "Handle a recoverable error", body: "Do not hide exceptions silently. Give the user a useful message and log enough context for debugging.", code: "try {\n  int lesson = Integer.parseInt(input);\n  System.out.println(lesson);\n} catch (NumberFormatException error) {\n  System.out.println(\"Enter a lesson number.\");\n}", preview: { title: "Enter a lesson number.", body: "The invalid input was handled without crashing the page." } },
        ],
      },
      {
        number: "3",
        title: "Collections and Streams",
        items: [
          { id: "java-collections", label: "3.1. Lists and Maps", heading: "3.1 Lists and Maps", intro: "Collections store groups of objects. Lists preserve order while maps associate a key with a value.", bodyHeading: "Store course data", body: "Choose a collection based on how the data will be accessed and keep the element type explicit.", code: "List<String> courses = List.of(\"Java\", \"C#\", \"Dart\");\nMap<String, Integer> progress = Map.of(\"Java\", 3);", preview: { title: "3 courses", body: "The collection keeps course names and progress together." } },
          { id: "java-streams", label: "3.2. Streams", heading: "3.2 Streams", intro: "Streams describe a pipeline that filters, transforms and collects data. They are useful when a collection needs a readable sequence of operations.", bodyHeading: "Filter active courses", body: "Keep each stream operation small and name complicated predicates so the pipeline stays readable.", code: "List<String> active = courses.stream()\n  .filter(course -> course.length() > 3)\n  .toList();", preview: { title: "Java · Dart", body: "The stream kept courses longer than three characters." } },
        ],
      },
    ],
  },
  csharp: {
    slug: "csharp",
    title: "C#",
    description: "Learn C# fundamentals, classes, LINQ and the .NET way to build applications.",
    codeLabel: "Program.cs",
    tip: "Use the type system and modern C# features to make invalid states harder to represent.",
    lessons: [
      {
        number: "1",
        title: "Introduction to C#",
        items: [
          { id: "csharp-what", label: "1.1. What is C#?", heading: "1. Introduction to C#", intro: "C# is a modern, strongly typed language in the .NET ecosystem. It is used for web APIs, desktop applications, games and cloud services.", bodyHeading: "1.1 What is C#?", body: "C# combines object-oriented design with concise features such as pattern matching, records and async methods.", code: "Console.WriteLine(\"Hello, C#!\");", preview: { title: "Hello, C#!", body: ".NET ran the first C# statement." } },
          { id: "csharp-dotnet", label: "1.2. .NET and the SDK", heading: "1.2 .NET and the SDK", intro: "The .NET SDK provides the compiler, runtime and command-line tools used to create, build and run C# projects.", bodyHeading: "Create a console project", body: "The project file records the target framework and dependencies so the build can be reproduced on another machine.", code: "dotnet new console -n CampusFlow.CSharp\ncd CampusFlow.CSharp\ndotnet run", preview: { title: "Project created", body: "The .NET CLI can create and run a C# application." } },
          { id: "csharp-types", label: "1.3. Types and Variables", heading: "1.3 Types and Variables", intro: "C# has value types, reference types and nullable annotations that communicate how a value may be used.", bodyHeading: "Make values explicit", body: "Use var when the type is obvious from the right side and explicit types when they improve understanding.", code: "string course = \"C#\";\nint lessons = 4;\nbool isPublished = true;", preview: { title: "C#", body: "4 lessons are ready to study." } },
        ],
      },
      {
        number: "2",
        title: "C# Fundamentals",
        items: [
          { id: "csharp-control", label: "2.1. Conditions and Loops", heading: "2.1 Conditions and Loops", intro: "if, switch and loops control the path through a C# program. Pattern matching can keep complex decisions readable.", bodyHeading: "Choose a result", body: "Keep the default case intentional and make the loop condition easy to verify.", code: "string badge = score switch {\n  >= 90 => \"Excellent\",\n  >= 70 => \"Good\",\n  _ => \"Keep practicing\"\n};", preview: { title: "Good", body: "The switch expression selected a badge from the score." } },
          { id: "csharp-methods", label: "2.2. Methods", heading: "2.2 Methods", intro: "Methods organize behavior and can use optional parameters, named arguments and expression-bodied syntax for small operations.", bodyHeading: "Name the operation", body: "A method should make its inputs, output and side effects easy to understand from the signature.", code: "static int AddLessons(int completed, int added)\n  => completed + added;\n\nint total = AddLessons(2, 1);", preview: { title: "Total: 3", body: "The method combined two values." } },
          { id: "csharp-classes", label: "2.3. Classes and Records", heading: "2.3 Classes and Records", intro: "Classes model behavior and mutable identity. Records are useful for immutable data values that are compared by their contents.", bodyHeading: "Represent a course", body: "Choose a class or record based on whether the value has identity and behavior or is simply data.", code: "public record Course(string Title, int Lessons);\n\nvar course = new Course(\"C# Basics\", 6);", preview: { title: "C# Basics", body: "6 lessons are described by an immutable record." } },
        ],
      },
      {
        number: "3",
        title: "Modern .NET",
        items: [
          { id: "csharp-linq", label: "3.1. LINQ", heading: "3.1 LINQ", intro: "LINQ lets you query collections with a consistent syntax. A query can filter, order and project data into a new shape.", bodyHeading: "Query course lessons", body: "Break a long query into named steps when it becomes difficult to read or debug.", code: "var titles = lessons\n  .Where(lesson => lesson.IsPublished)\n  .Select(lesson => lesson.Title)\n  .ToList();", preview: { title: "Published lessons", body: "LINQ selected only lessons visible to learners." } },
          { id: "csharp-async", label: "3.2. Async and Await", heading: "3.2 Async and Await", intro: "Async methods keep applications responsive while they wait for a database, file or web request.", bodyHeading: "Await a course request", body: "Return Task from asynchronous methods and handle cancellation or errors at the boundary of the request.", code: "async Task<Course> LoadCourseAsync(string id)\n{\n  return await repository.GetAsync(id);\n}", preview: { title: "Course loaded", body: "The UI can keep responding while data is requested." } },
        ],
      },
    ],
  },
  "dart-programming": {
    slug: "dart-programming",
    title: "Dart",
    description: "Learn Dart syntax, sound null safety, collections and async programming for modern apps.",
    codeLabel: "main.dart",
    tip: "Use sound null safety and expressive types so your Dart code explains its assumptions.",
    lessons: [
      {
        number: "1",
        title: "Introduction to Dart",
        items: [
          { id: "dart-what", label: "1.1. What is Dart?", heading: "1. Introduction to Dart", intro: "Dart is a client-optimized language created by Google. It is commonly used with Flutter to build mobile, web and desktop interfaces.", bodyHeading: "1.1 What is Dart?", body: "Dart supports just-in-time development and ahead-of-time production compilation, giving developers a fast edit-and-run loop and efficient releases.", code: "void main() {\n  print('Hello, Dart!');\n}", preview: { title: "Hello, Dart!", body: "The Dart runtime started from the main function." } },
          { id: "dart-setup", label: "1.2. Installing the Dart SDK", heading: "1.2 Installing the Dart SDK", intro: "The Dart SDK includes the dart command, formatter, analyzer and package tools used to build Dart programs.", bodyHeading: "Run a Dart file", body: "Format and analyze code as you work so small issues are caught before the application grows.", code: "dart format .\ndart analyze\ndart run bin/main.dart", preview: { title: "Dart SDK ready", body: "The toolchain can format, analyze and run the project." } },
          { id: "dart-vscode", label: "1.3. Setting Up Dart in VS Code", heading: "1.3 Setting Up Dart in VS Code", intro: "The Dart and Flutter extensions add formatting, analysis, debugging and hot reload support to VS Code.", bodyHeading: "Use the editor as a learning tool", body: "Keep format-on-save enabled and read analyzer messages as suggestions about the code's structure.", code: "{\n  \"editor.formatOnSave\": true,\n  \"editor.codeActionsOnSave\": {\n    \"source.fixAll\": \"explicit\"\n  }\n}", preview: { title: "Editor configured", body: "Formatting and analysis run while you build." } },
        ],
      },
      {
        number: "2",
        title: "Dart Basics",
        items: [
          { id: "dart-variables", label: "2.1. Variables and Data Types", heading: "2.1 Variables and Data Types", intro: "Dart supports type inference with var, explicit types and final or const values that cannot be reassigned.", bodyHeading: "Declare safe values", body: "Use final for a value assigned once at runtime and const for a value known at compile time.", code: "final String course = 'Dart';\nvar completedLessons = 2;\nconst maxLessons = 10;", preview: { title: "Dart", body: "2 of 10 lessons are complete." } },
          { id: "dart-null-safety", label: "2.2. Sound Null Safety", heading: "2.2 Sound Null Safety", intro: "Dart's type system distinguishes values that can be null from values that must exist. This prevents many null reference errors before runtime.", bodyHeading: "Make optional data explicit", body: "Use ? for an optional value and check it before reading the value as non-null.", code: "String? nickname;\n\nfinal label = nickname ?? 'Learner';\nprint(label);", preview: { title: "Learner", body: "The fallback is used when optional data is missing." } },
          { id: "dart-control", label: "2.3. Control Flow", heading: "2.3 Control Flow", intro: "Dart uses familiar if statements, loops and switch patterns to express decisions and repeated work.", bodyHeading: "Choose the learning state", body: "Keep branches short and use a default so new states do not create an unexpected empty screen.", code: "final status = progress >= 1.0\n    ? 'Completed'\n    : 'In progress';", preview: { title: "In progress", body: "The conditional expression selected a learner-friendly state." } },
        ],
      },
      {
        number: "3",
        title: "Dart Functions and Async",
        items: [
          { id: "dart-functions", label: "3.1. Functions and Named Parameters", heading: "3.1 Functions and Named Parameters", intro: "Dart functions can use optional and named parameters. This makes calls self-documenting and keeps reusable logic compact.", bodyHeading: "Write a readable function", body: "Use named parameters when a call would be unclear without labels and give important parameters useful defaults.", code: "String greeting({required String name, String prefix = 'Hello'}) {\n  return '$prefix, $name!';\n}\n\ngreeting(name: 'Learner');", preview: { title: "Hello, Learner!", body: "Named parameters make the call easy to understand." } },
          { id: "dart-collections", label: "3.2. Lists and Maps", heading: "3.2 Lists and Maps", intro: "Lists contain ordered values and maps associate keys with values. Collection methods make transformations concise.", bodyHeading: "Transform course titles", body: "Prefer map, where and fold when they make a data transformation clearer than a manual loop.", code: "final courses = ['Dart', 'Flutter', 'C#'];\nfinal labels = courses.map((name) => 'Learn $name').toList();", preview: { title: "Three paths", body: "Learn Dart · Learn Flutter · Learn C#" } },
          { id: "dart-async", label: "3.3. Futures and Async", heading: "3.3 Futures and Async", intro: "Future represents a value that will be available later. async and await make asynchronous code read like a sequence.", bodyHeading: "Load a lesson", body: "Show a loading state, await the request and handle errors before displaying the result to the learner.", code: "Future<String> loadLesson() async {\n  final response = await api.get('/lessons/1');\n  return response.title;\n}", preview: { title: "Lesson loaded", body: "The app can fetch data without blocking the interface." } },
        ],
      },
    ],
  },
};

const cleanLessonTopic = (label) => label.replace(/^\d+(?:\.\d+)*\.?\s*/, "").trim();

const khmerCourseTitles = {
  HTML: "HTML",
  CSS: "CSS",
  JavaScript: "JavaScript",
  React: "React",
  "Tailwind CSS": "Tailwind CSS",
  "C Programming": "ភាសា C",
  "C++": "C++",
  Java: "Java",
  "C#": "C#",
  Dart: "Dart",
  SpringBoot: "Spring Boot",
  "Python": "Python",
  PHP: "PHP",
  Laravel: "Laravel",
  "Node.js": "Node.js",
  Kotlin: "Kotlin",
  Flutter: "Flutter",
  MySQL: "MySQL",
  Git: "Git",
  "Cyber Security": "សុវត្ថិភាពសាយប័រ",
  "Computer Components": "គ្រឿងបន្លាស់កុំព្យូទ័រ",
  Bootstrap: "Bootstrap",
  "Learn Code Yourself": "រៀនសរសេរកូដដោយខ្លួនឯង",
};

const getKhmerCourseTitle = (title) => khmerCourseTitles[title] || title;
const containsKhmer = (value) => typeof value === "string" && /[\u1780-\u17ff]/.test(value);

const getKhmerTopic = (topic, courseTitle) => {
  const cleanTopic = topic.replace(/[?៖:]+$/, "").trim();
  const khmerCourseTitle = getKhmerCourseTitle(courseTitle);
  if (/^what is\b/i.test(cleanTopic)) return `តើ ${cleanTopic.replace(/^what is\s*/i, "")} ជាអ្វី?`;
  if (/^why learn\b/i.test(cleanTopic)) return `ហេតុអ្វីត្រូវរៀន ${khmerCourseTitle}?`;
  if (/(variable|data type|constant|type casting|conversion|storage class|nullable|primitive)/i.test(cleanTopic)) return "អថេរ និងប្រភេទទិន្នន័យ";
  if (/(function|method|procedure|lambda|closure|higher-order)/i.test(cleanTopic)) return "អនុគមន៍ និងវិធីសាស្ត្រ";
  if (/(loop|iteration|for |while|do-while|recursion|break|continue)/i.test(cleanTopic)) return "រង្វិលជុំ និងការធ្វើម្តងហើយម្តងទៀត";
  if (/(class|object|inheritance|polymorphism|interface|encapsulation|constructor|component|widget)/i.test(cleanTopic)) return "ថ្នាក់ វត្ថុ និងសមាសភាគ";
  if (/(array|list|map|set|collection|string|iterator|generics|dictionary|tuple)/i.test(cleanTopic)) return "បញ្ជី អារេ និងការប្រមូលទិន្នន័យ";
  if (/(database|sql|query|repository|entity|jpa|hibernate|crud|migration|transaction)/i.test(cleanTopic)) return "មូលដ្ឋានទិន្នន័យ និងសំណួរ";
  if (/(api|http|request|response|rest|socket|network|websocket|fetch)/i.test(cleanTopic)) return "API និងការទំនាក់ទំនងតាមបណ្តាញ";
  if (/(security|authentication|authorization|password|token|firewall|phishing|owasp|cors|csrf|permission)/i.test(cleanTopic)) return "សុវត្ថិភាព និងការគ្រប់គ្រងសិទ្ធិ";
  if (/(test|debug|error|exception|logging|monitoring|performance|profil|optimization)/i.test(cleanTopic)) return "ការធ្វើតេស្ត កែកំហុស និងប្រសិទ្ធភាព";
  if (/(deploy|docker|cloud|production|ci\/cd|release|publish)/i.test(cleanTopic)) return "ការដាក់ឱ្យប្រើប្រាស់ និងការចេញផ្សាយ";
  if (/(form|input|button|accessib|keyboard|responsive|layout|style|color|typography|navigation)/i.test(cleanTopic)) return "ការរចនា និងបទពិសោធន៍អ្នកប្រើ";
  if (/(document structure|page structure|semantic|html structure)/i.test(cleanTopic)) return "រចនាសម្ព័ន្ធឯកសារ និងធាតុមានអត្ថន័យ";
  if (/(tag|element|attribute)/i.test(cleanTopic)) return "ស្លាក ធាតុ និងគុណលក្ខណៈ";
  if (/(syntax|selector|class selector)/i.test(cleanTopic)) return "វាក្យសម្ព័ន្ធ និងឧបករណ៍ជ្រើសរើស";
  if (/(box model|flexbox|flex and grid|css grid)/i.test(cleanTopic)) return "គំរូប្រអប់ និងប្លង់ CSS";
  if (/(dom|event|browser api|local storage|history api)/i.test(cleanTopic)) return "DOM ព្រឹត្តិការណ៍ និង API របស់កម្មវិធីរុករក";
  if (/(module|package|library|namespace|composer|dependency)/i.test(cleanTopic)) return "ម៉ូឌុល បណ្ណាល័យ និងកញ្ចប់កម្មវិធី";
  if (/(route|routing|controller|middleware|navigation)/i.test(cleanTopic)) return "ផ្លូវ ស្រទាប់កណ្ដាល និងការរុករក";
  if (/(file|stream|input\/output|i\/o|storage)/i.test(cleanTopic)) return "ឯកសារ លំហូរទិន្នន័យ និងការផ្ទុក";
  if (/(operator|condition|control flow|switch)/i.test(cleanTopic)) return "ប្រមាណវិធី លក្ខខណ្ឌ និងលំហូរបញ្ជា";
  if (/(pointer|memory|process|thread|concurrency)/i.test(cleanTopic)) return "អង្គចងចាំ ដំណើរការ និងការប្រតិបត្តិ";
  if (/(configuration|profile|health check|logging|observability)/i.test(cleanTopic)) return "ការកំណត់រចនាសម្ព័ន្ធ និងការតាមដានប្រព័ន្ធ";
  if (/^(introduction|overview|history|features|install|setting up|setup|environment)/i.test(cleanTopic)) return `សេចក្តីផ្តើមអំពី ${khmerCourseTitle}`;
  return `មេរៀន៖ ${cleanTopic}`;
};

const getKhmerSectionTitle = (title, courseTitle) => {
  const khmerCourseTitle = getKhmerCourseTitle(courseTitle);
  if (/introduction|overview|getting started/i.test(title)) return `សេចក្តីផ្តើមអំពី ${khmerCourseTitle}`;
  if (/basic/i.test(title)) return `មូលដ្ឋាន ${khmerCourseTitle}`;
  if (/advanced/i.test(title)) return `មេរៀនកម្រិតខ្ពស់ ${khmerCourseTitle}`;
  if (/project|practice|workflow/i.test(title)) return "ការអនុវត្តគម្រោង";
  if (/testing|debugging/i.test(title)) return "ការធ្វើតេស្ត និងកែកំហុស";
  if (/security/i.test(title)) return "សុវត្ថិភាព";
  return `ផ្នែក៖ ${title}`;
};

const getKhmerLesson = (courseTitle, lesson) => {
  const topic = cleanLessonTopic(lesson.label);
  const khmerTopic = getKhmerTopic(topic, courseTitle);
  const number = (lesson.label.match(/^\d+(?:\.\d+)*/) || [""])[0];
  const label = `${number}${number ? ". " : ""}${khmerTopic}`;
  const khmerCourseTitle = getKhmerCourseTitle(courseTitle);
  return {
    ...lesson,
    label,
    heading: containsKhmer(lesson.heading) ? lesson.heading : `${number ? `${number}. ` : ""}${khmerTopic}`,
    intro: containsKhmer(lesson.intro) ? lesson.intro : `មេរៀននេះណែនាំអំពី ${khmerTopic} ក្នុង ${khmerCourseTitle}។ សូមអានគំនិតសំខាន់ៗ បន្ទាប់មកសាកល្បងកូដដោយខ្លួនឯង ដើម្បីភ្ជាប់ទ្រឹស្តីទៅនឹងការអនុវត្ត។`,
    bodyHeading: containsKhmer(lesson.bodyHeading) ? lesson.bodyHeading : `ចំណុចសំខាន់៖ ${khmerTopic}`,
    body: containsKhmer(lesson.body) ? lesson.body : `សម្រាប់ ${khmerTopic} សូមចាប់ផ្តើមពីឧទាហរណ៍តូចមួយ ហើយពិនិត្យលទ្ធផលបន្ទាប់ពីការផ្លាស់ប្តូរម្តងៗ។ កុំចម្លងកូដដោយមិនយល់ពីមូលហេតុដែលវាដំណើរការ។\n\nចំណុចសម្រាប់អនុវត្ត៖\n- ពន្យល់គំនិតសំខាន់ជាពាក្យរបស់អ្នក។\n- ផ្លាស់ប្តូរតម្លៃមួយ ហើយពិនិត្យលទ្ធផល។\n- សាកល្បងករណីធម្មតា និងករណីខុសប្រក្រតី។`,
    preview: {
      ...lesson.preview,
      title: containsKhmer(lesson.preview?.title) ? lesson.preview.title : khmerTopic,
      body: containsKhmer(lesson.preview?.body) ? lesson.preview.body : `លទ្ធផលសម្រាប់មេរៀន ${khmerTopic}។`,
    },
  };
};

const localizeCourseForLanguage = (course, language) => {
  if (language !== "km") return course;
  const khmerTitle = getKhmerCourseTitle(course.title);
  return {
    ...course,
    title: khmerTitle,
    description: `សិក្សា ${khmerTitle} តាមរយៈមេរៀនជាក់ស្តែង ជំហានអនុវត្ត និងឧទាហរណ៍កូដដែលងាយយល់។`,
    tip: "អនុវត្តមេរៀនមួយៗដោយកែប្រែឧទាហរណ៍តូចៗ ហើយពិនិត្យលទ្ធផលមុននឹងបន្តទៅមេរៀនបន្ទាប់។",
    lessons: course.lessons.map((section) => ({
      ...section,
      title: getKhmerSectionTitle(section.title, course.title),
      items: section.items.map((lesson) => getKhmerLesson(course.title, lesson)),
    })),
  };
};

const getLessonGuidance = (courseTitle, topic) => {
  const lowerTopic = topic.toLowerCase();
  if (/(what is|introduction|overview|history|features|install|setting up|environment)/i.test(lowerTopic)) {
    return {
      intro: `${topic} gives you the context needed to use ${courseTitle} with confidence. Start with the problem it solves, learn the vocabulary, and run the smallest working example before adding more features.`,
      bodyHeading: "Build the mental model",
      body: `In ${courseTitle}, ${topic.toLowerCase()} connects the idea to a real development workflow. Identify the input, the transformation and the result, then explain the example in your own words.\n\nPractice checklist:\n- Run the example once.\n- Change one value and observe the result.\n- Write down one question to investigate next.`,
    };
  }
  if (/(variable|data type|constant|type casting|conversion|storage class|nullable|primitive)/i.test(lowerTopic)) {
    return {
      intro: `${topic} is about representing information safely inside a ${courseTitle} program. Choose a clear name, select the narrowest useful type, and make conversions visible instead of relying on hidden behavior.`,
      bodyHeading: "Name and validate values",
      body: `A good value has a clear purpose and a predictable lifetime. Compare the type before and after a conversion, test an empty or boundary value, and keep mutable state limited to the code that owns it.\n\nPractice checklist:\n- Declare one value with an explicit type.\n- Try a valid and an invalid value.\n- Read the compiler or runtime message carefully.`,
    };
  }
  if (/(function|method|procedure|lambda|closure|higher-order)/i.test(lowerTopic)) {
    return {
      intro: `${topic} helps you divide a ${courseTitle} program into small, testable actions. A useful function has a clear name, focused responsibility, explicit inputs and a predictable result.`,
      bodyHeading: "Design a small reusable action",
      body: "Begin with one responsibility, then decide what the function needs to receive and what it should return. Keep side effects at the boundary so the core logic can be tested with ordinary values.\n\nPractice checklist:\n- Give the function a verb-based name.\n- Test the normal case and one edge case.\n- Reuse it from two different call sites.",
    };
  }
  if (/(loop|iteration|for |while|do-while|recursion|break|continue)/i.test(lowerTopic)) {
    return {
      intro: `${topic} repeats work in a controlled way. In ${courseTitle}, make the stopping condition obvious and keep each iteration small enough to inspect while debugging.`,
      bodyHeading: "Control repetition",
      body: "Choose the loop that matches the problem: iterate over a collection when the data is known, or use a condition when the work continues until a state changes. Always check the initial value, update step and exit condition.\n\nPractice checklist:\n- Trace the first three iterations on paper.\n- Test an empty collection or zero count.\n- Confirm that the loop always makes progress.",
    };
  }
  if (/(class|object|inheritance|polymorphism|interface|encapsulation|constructor|component|widget)/i.test(lowerTopic)) {
    return {
      intro: `${topic} organizes related data and behavior into a reusable design. Use the smallest abstraction that makes the ${courseTitle} code easier to understand, test and change.`,
      bodyHeading: "Model one responsibility",
      body: "Separate public behavior from internal details and keep dependencies explicit. Prefer composition when two pieces can work together without creating a rigid inheritance tree.\n\nPractice checklist:\n- Name the responsibility of the type in one sentence.\n- Expose only the operations callers need.\n- Create one object and exercise its main behavior.",
    };
  }
  if (/(array|list|map|set|collection|string|iterator|generics|dictionary|tuple)/i.test(lowerTopic)) {
    return {
      intro: `${topic} gives ${courseTitle} a structured way to store and transform related values. Select a collection based on ordering, uniqueness, lookup speed and how the data will change.`,
      bodyHeading: "Choose the right collection",
      body: "Start with a small data set and inspect the result after each transformation. Keep the element type clear, handle an empty collection, and avoid mutating shared data unless that behavior is intentional.\n\nPractice checklist:\n- Add three sample values.\n- Read one value by position or key.\n- Transform the collection into the output the UI needs.",
    };
  }
  if (/(database|sql|query|repository|entity|jpa|hibernate|crud|migration|transaction)/i.test(lowerTopic)) {
    return {
      intro: `${topic} connects application behavior to reliable data storage. In ${courseTitle}, design the data shape first, validate inputs at the boundary, and make failures safe to retry or report.`,
      bodyHeading: "Make data operations predictable",
      body: "Use constraints to protect important relationships, parameterized queries to avoid injection, and transactions when several writes must succeed together. Measure slow queries instead of guessing about performance.\n\nPractice checklist:\n- Define the data you need to store.\n- Add validation and a useful error path.\n- Test empty, duplicate and missing records.",
    };
  }
  if (/(api|http|request|response|rest|socket|network|websocket|fetch)/i.test(lowerTopic)) {
    return {
      intro: `${topic} describes how software exchanges information across a boundary. Treat every request as untrusted input, return a clear status, and keep the response shape stable for clients.`,
      bodyHeading: "Follow the request lifecycle",
      body: "A dependable API validates the request, performs one use-case, and returns a useful success or error response. Add timeouts, logging and authentication at the boundary rather than scattering them through business logic.\n\nPractice checklist:\n- Define the request and response shape.\n- Test success, validation failure and not-found cases.\n- Never log passwords, tokens or private user data.",
    };
  }
  if (/(security|authentication|authorization|password|token|firewall|phishing|owasp|cors|csrf|permission)/i.test(lowerTopic)) {
    return {
      intro: `${topic} is a security boundary in ${courseTitle}. Verify identity, check permissions, protect secrets and assume that external input can be deliberately malformed.`,
      bodyHeading: "Reduce risk by default",
      body: "Security is a sequence of small decisions: collect less data, grant the minimum access, validate on the server and record meaningful events without exposing secrets. Review both the happy path and the abuse path.\n\nPractice checklist:\n- Identify the asset being protected.\n- Name the user or service allowed to access it.\n- Add a safe failure response and test it.",
    };
  }
  if (/(test|debug|error|exception|logging|monitoring|performance|profil|optimization)/i.test(lowerTopic)) {
    return {
      intro: `${topic} turns a working ${courseTitle} example into software that is easier to trust. Reproduce the behavior, isolate the smallest failing case, and verify the fix with a repeatable check.`,
      bodyHeading: "Observe, fix and verify",
      body: "A good debugging loop is: observe the actual behavior, form one hypothesis, change one thing, then run the same check again. Keep useful logs and remove sensitive values before they reach a console or monitoring system.\n\nPractice checklist:\n- Write the expected result first.\n- Capture the input that reproduces the issue.\n- Add a regression test or verification step.",
    };
  }
  if (/(deploy|docker|cloud|production|ci\/cd|release|publish)/i.test(lowerTopic)) {
    return {
      intro: `${topic} prepares a ${courseTitle} project for other people to use. Make configuration explicit, keep secrets outside source control, and verify the deployed behavior instead of trusting the build alone.`,
      bodyHeading: "Ship a repeatable build",
      body: "Separate development and production settings, add a health check, and record the version that was released. A small rollback plan is part of a safe deployment.\n\nPractice checklist:\n- Build from a clean checkout.\n- Configure secrets through the deployment environment.\n- Test the public route and review the server logs.",
    };
  }
  return {
    intro: `${topic} is a practical ${courseTitle} skill. Learn the smallest useful rule, connect it to the surrounding unit, and apply it in a short example that you can change and test.`,
    bodyHeading: `Practice ${topic}`,
    body: `Use ${topic.toLowerCase()} to solve one focused problem before combining it with other features. Read the example line by line, predict the result, then make a small change and compare the output.\n\nPractice checklist:\n- Explain the main idea without copying the code.\n- Change one input or rule.\n- Keep the experiment small enough to debug.`,
  };
};

const getGeneratedLessonCode = (courseTitle, topic) => {
  const safeTopic = topic.replace(/["']/g, "").slice(0, 70);
  const lowerTitle = courseTitle.toLowerCase();
  if (lowerTitle === "html") return `<section class="lesson-card">\n  <h2>${safeTopic}</h2>\n  <p>Practice this HTML concept with meaningful structure.</p>\n</section>`;
  if (lowerTitle.includes("tailwind")) return `<article class="rounded-2xl bg-white p-6 shadow-sm">\n  <h2 class="text-2xl font-black text-slate-900">${safeTopic}</h2>\n  <p class="mt-2 text-slate-600">Practice one utility at a time.</p>\n</article>`;
  if (lowerTitle === "css") return `.lesson-card {\n  display: grid;\n  gap: 1rem;\n  padding: 1.5rem;\n  border-radius: 1rem;\n}`;
  if (lowerTitle === "javascript") return `const lessonTopic = "${safeTopic}";\nconst message = document.querySelector("#message");\nmessage.textContent = \`Practice: ${safeTopic}\`;\nconsole.log(lessonTopic);`;
  if (lowerTitle === "react") return `export default function LessonCard() {\n  return (\n    <article>\n      <h2>${safeTopic}</h2>\n      <p>Build this lesson as a focused component.</p>\n    </article>\n  );\n}`;
  if (lowerTitle === "c programming") return `#include <stdio.h>\n\nint main(void) {\n    printf("Practice: ${safeTopic}\\n");\n    return 0;\n}`;
  if (lowerTitle === "c++") return `#include <iostream>\n\nint main() {\n    std::cout << "Practice: ${safeTopic}\\n";\n    return 0;\n}`;
  if (lowerTitle.includes("c#")) return `using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Practice: ${safeTopic}");\n    }\n}`;
  if (lowerTitle === "java") return `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Practice: ${safeTopic}");\n    }\n}`;
  if (lowerTitle === "python") return `topic = "${safeTopic}"\nprint(f"Practice: {topic}")`;
  if (lowerTitle === "php") return `<?php\n$topic = "${safeTopic}";\necho "Practice: $topic";`;
  if (lowerTitle === "laravel") return `use Illuminate\\Support\\Facades\\Route;\n\nRoute::get('/lesson', function () {\n    return '${safeTopic}';\n});`;
  if (lowerTitle === "node.js") return `const http = require("http");\n\nhttp.createServer((request, response) => {\n  response.end("Practice: ${safeTopic}");\n}).listen(3000);`;
  if (lowerTitle === "kotlin") return `fun main() {\n    println("Practice: ${safeTopic}")\n}`;
  if (lowerTitle === "flutter") return `class LessonCard extends StatelessWidget {\n  const LessonCard({super.key});\n\n  @override\n  Widget build(BuildContext context) {\n    return const Text("${safeTopic}");\n  }\n}`;
  if (lowerTitle === "dart") return `void main() {\n  print("Practice: ${safeTopic}");\n}`;
  if (lowerTitle === "mysql") return `SELECT id, name\nFROM students\nWHERE status = 'active'\nORDER BY name;`;
  if (lowerTitle === "git") return `git status\ngit add .\ngit commit -m "Practice ${safeTopic}"`;
  if (lowerTitle.includes("cyber")) return `Security review: ${safeTopic}\n- Identify the asset\n- Check the permission\n- Record a safe result`;
  if (lowerTitle.includes("computer")) return `Computer system\n|- Input\n|- Processing\n|- Memory\n|- Storage\n\\- Output`;
  if (lowerTitle === "bootstrap") return `<div class="container py-4">\n  <h2 class="text-primary">${safeTopic}</h2>\n  <button class="btn btn-success">Practice</button>\n</div>`;
  if (lowerTitle.includes("learn code")) return `const steps = ["understand", "practice", "test", "improve"];\nconsole.log("${safeTopic}", steps);`;
  if (lowerTitle.includes("springboot")) return `@RestController\nclass LessonController {\n    @GetMapping("/lessons")\n    String lessons() {\n        return "${safeTopic}";\n    }\n}`;
  return `// ${safeTopic}\n// Practice this ${courseTitle} lesson in a small example.`;
};

// The course readers use the reference sites for topic coverage, while the
// lesson explanations and examples below are original CampusFlow content.
// Learners can open one lesson, copy its example, mark it complete and move
// through the full subject with Previous/Next.
const createReferenceCourse = ({ slug, title, description, codeLabel, tip, sections, details = {} }) => ({
  slug,
  title,
  description,
  codeLabel,
  tip,
  lessons: sections.map(([number, sectionTitle, labels]) => ({
    number: String(number),
    title: sectionTitle,
    items: labels.map((label, index) => {
      const detail = details[label] || {};
      const topic = cleanLessonTopic(label);
      const generated = getLessonGuidance(title, topic);
      const id = `${slug}-${String(number).replace(/[^a-z0-9]+/gi, "-")}-${index + 1}`;
      return {
        id,
        label,
        heading: detail.heading || label.replace(/\.$/, ""),
        intro: detail.intro || generated.intro,
        bodyHeading: detail.bodyHeading || generated.bodyHeading,
        body: detail.body || generated.body,
        code: detail.code || getGeneratedLessonCode(title, topic),
        preview: detail.preview || { title: topic, body: `Practice output for ${title}: ${topic}.` },
      };
    }),
  })),
});

const referenceCourseCatalog = {
  c_programming: createReferenceCourse({
    slug: "c_programming",
    title: "C Programming",
    description: "មេរៀនកម្មវិធី C តាមលំដាប់ដូច CodeKhmerLearning។",
    codeLabel: "main.c",
    tip: "ចាប់ផ្តើមពីរចនាសម្ព័ន្ធសាមញ្ញ បើក compiler warnings និងសាកល្បងកូដជាបន្តបន្ទាប់។",
    sections: [
      [1, "Introduction to C Programming", ["1.1 Overview of C Programming", "1.2 History of C", "1.3 Features of C", "1.4 Setting Up the C Environment", "1.5 Structure of a C Program"]],
      [2, "Variables and Data Types", ["2.1 Declaring Variables", "2.2 Basic Data Types", "2.3 Constants", "2.4 Type Casting and Conversion", "2.5 Storage Classes"]],
      [3, "Operators in C", ["3.1 Arithmetic Operators", "3.2 Relational Operators", "3.3 Logical Operators", "3.4 Assignment Operators", "3.5 Bitwise Operators", "3.6 Increment and Decrement", "3.7 Conditional Operator"]],
      [4, "Control Statements", ["4.1 if Statement", "4.2 else Statement", "4.3 if elseif else Statement", "4.4 switch Statement", "4.5 break Statement", "4.6 continue Statement", "4.7 goto Statement", "4.8 Nested Control Structures"]],
      [5, "Loops in C", ["5.1 for Loop", "5.2 while Loop", "5.3 do-while Loop", "5.4 Nested Loops", "5.5 Infinite Loops"]],
      [6, "Functions in C", ["6.1 Function Declaration and Definition", "6.2 Function Arguments and Return Types", "6.3 Recursion", "6.4 Call by Value vs. Call by Reference", "6.5 Function Prototypes", "6.6 Header Files and Libraries", "6.7 Standard Library Functions"]],
      [7, "Arrays in C", ["7.1 One-dimensional Arrays", "7.2 Multi-dimensional Arrays", "7.3 Array Initialization", "7.4 Passing Arrays to Functions", "7.5 Array Manipulation"]],
      [8, "Pointers in C", ["8.1 Introduction to Pointers", "8.2 Pointer Declaration and Initialization", "8.3 Pointers and Arrays", "8.4 Pointers to Functions", "8.5 Dynamic Memory Allocation", "8.6 Pointer Arithmetic", "8.7 Pointers to Structures and Arrays"]],
      [9, "Structures and Unions", ["9.1 Introduction to Structures", "9.2 Structure Declaration and Initialization", "9.3 Accessing Structure Members", "9.4 Nested Structures", "9.5 Unions in C", "9.6 Differences Between Structures and Unions"]],
      [10, "File Handling", ["10.1 Introduction to File Handling", "10.2 File Operations: fopen, fclose, fread, fwrite", "10.3 File Pointers and Modes", "10.4 Reading and Writing Text Files", "10.5 Error Handling in File Operations", "10.6 Binary File Handling"]],
      [11, "Dynamic Memory Allocation", ["11.1 Introduction to Dynamic Memory", "11.2 malloc(), calloc(), realloc(), and free()", "11.3 Memory Leaks and Memory Management", "11.4 Using Pointers with Dynamic Memory"]],
      [12, "Preprocessor Directives", ["12.1 #define and Constants", "12.2 #include and Header Files", "12.3 Conditional Compilation", "12.4 Macros and Inline Functions", "12.5 File Inclusion and Guard Directives"]],
      [13, "Error Handling and Debugging", ["13.1 Error Handling in C", "13.2 Using assert() for Debugging", "13.3 Handling Runtime Errors", "13.4 Debugging with GDB", "13.5 Exception Handling Techniques"]],
      [14, "Advanced C Concepts", ["14.1 Multithreading in C", "14.2 Sockets and Networking in C", "14.3 C and Object-Oriented Programming", "14.4 Advanced Data Structures (e.g., Trees, Graphs)", "14.5 Compiler Optimization Techniques"]],
      [15, "C Standard Library", ["15.1 Standard Input/Output", "15.2 String Handling Functions", "15.3 Mathematical Functions", "15.4 Memory Management Functions", "15.5 Date and Time Functions", "15.6 Character Handling Functions"]],
    ],
    details: {
      "1.1 Overview of C Programming": {
        heading: "1. ការណែនាំអំពីការកម្មវិធី C",
        intro: "កម្មវិធី C គឺជាភាសាកម្មវិធីទូទៅដែលមានអំណាច។ វាត្រូវបានប្រើប្រាស់យ៉ាងទូលំទូលាយក្នុង software ប្រព័ន្ធ និងកម្មវិធីដែលត្រូវការប្រសិទ្ធភាពខ្ពស់។",
        bodyHeading: "1.1. សេចក្តីពិពណ៌នាអំពី C",
        body: "C គឺជាភាសាកម្មវិធីដែលមានភាពច្រើនប្រើ និងជាមូលដ្ឋានសំខាន់សម្រាប់ភាសាទំនើបដូចជា C++, Java និង Python។ ភាសានេះផ្តល់ការគ្រប់គ្រងលើធនធានប្រព័ន្ធ។",
        code: "#include <stdio.h>\n\nint main() {\n    printf(\"Hello, World!\");\n    return 0;\n}",
        preview: { title: "Hello, World!", body: "The program starts in main and prints a message." },
      },
    },
  }),
  java: createReferenceCourse({
    slug: "java",
    title: "Java",
    description: "មេរៀន Java តាមលំដាប់ដូច CodeKhmerLearning។",
    codeLabel: "HelloWorld.java",
    tip: "ប្រើ class តូចៗ ឈ្មោះដែលច្បាស់ និងអនុញ្ញាតឱ្យ compiler ជួយរកកំហុសនៅពេលសរសេរកូដ។",
    sections: [
      [1, "Introduction to Java", ["1.1. Introduction to Java", "1.2. History of Java", "1.3. Features of Java", "1.4. JDK, JRE, and JVM", "1.5. Setting up Java Environment"]],
      [2, "Writing Your First Java Program", ["2.1. Hello World Program", "2.2. Understanding the Structure of a Java Program"]],
      [3, "Java Syntax", ["3.1. Keywords and Identifiers", "3.2. Data Types (Primitive and Non-Primitive)", "3.3. Variables and Constants", "3.4. Comments (Single-line, Multi-line, and Documentation)"]],
      [4, "Operators", ["4.1. Arithmetic Operators", "4.2. Relational Operators", "4.3. Logical Operators", "4.4. Bitwise Operators", "4.5. Assignment Operators", "4.6. Ternary Operator"]],
      [5, "Control Flow Statements", ["5.1. If-Else", "5.2. Switch-Case", "5.3. For Loop", "5.4. While Loop", "5.5. Do-While Loop", "5.6. Break and Continue"]],
      [6, "Introduction to OOP", ["6.1. Classes and Objects", "6.2. Constructors (Default and Parameterized)", "6.3. Methods (Instance and Static)"]],
      [7, "Advanced OOP Concepts", ["7.1. Encapsulation", "7.2. Access Modifiers (Public, Private, Protected, Default)", "7.3. Getters and Setters", "7.4. Inheritance", "7.5. Types of Inheritance (Single, Multilevel, Hierarchical)", "7.6. super Keyword", "7.7. Method Overriding", "7.8. Polymorphism", "7.9. Method Overloading", "7.10. Dynamic Method Dispatch", "7.11. Abstraction", "7.12. Abstract Classes", "7.13. Interfaces"]],
      [8, "Advanced OOP Concepts", ["8.1. Static Keyword", "8.2. Final Keyword", "8.3. this Keyword", "8.4. Inner Classes (Nested, Local, Anonymous, Static Nested)"]],
      [9, "Java Data Structures", ["9.1. Arrays", "9.1.1. Single-dimensional Arrays", "9.1.2. Multi-dimensional Arrays", "9.1.3. Array Methods", "9.2. Strings", "9.2.1. String Class and Methods", "9.2.2. StringBuffer and StringBuilder", "9.3. Collections Framework", "9.3.1. List (ArrayList, LinkedList)", "9.3.2. Set (HashSet, TreeSet, LinkedHashSet)", "9.3.3. Map (HashMap, TreeMap, LinkedHashMap)", "9.3.4. Queue (PriorityQueue, Deque)", "9.3.5. Iterators (Iterator, ListIterator)", "9.4. Generics", "9.4.1. Generic Classes and Methods", "9.4.2. Bounded Types", "9.4.3. Wildcards"]],
      [10, "Exception Handling", ["10.1. Introduction to Exceptions", "10.2. Types of Exceptions (Checked and Unchecked)", "10.3. Try-Catch Block", "10.4. Multiple Catch Blocks", "10.5. Finally Block", "10.6. Custom Exceptions"]],
      [11, "File Handling and I/O", ["11.1. File Class", "11.2. Reading and Writing Files", "11.3. FileInputStream and FileOutputStream", "11.4. BufferedReader and BufferedWriter", "11.5. Serializable Interface", "11.6. ObjectInputStream and ObjectOutputStream"]],
      [12, "Multithreading", ["12.1. Introduction to Threads", "12.2. Creating Threads", "12.3. Thread Life Cycle", "12.4. Thread Synchronization", "12.5. Advanced Thread Concepts", "12.6. Deadlock and Livelock", "12.7. Thread Communication"]],
      [13, "Java Networking", ["13.1. Networking Basics", "13.2. Socket Programming", "13.3. TCP Sockets", "13.4. UDP Sockets", "13.5. URL Class", "13.6. URLConnection Class", "13.7. HTTP Requests", "13.8. HttpURLConnection", "13.9. HTTP Client API (Java 11+)"]],
      [14, "Java Database Connectivity (JDBC)", ["14.1. Introduction to JDBC", "14.2. JDBC Architecture", "14.3. Connecting to a Database", "14.4. JDBC Drivers", "14.5. Creating a Connection", "14.6. Executing Queries", "14.7. Statement Interface", "14.8. DML and DQL", "14.9. ResultSet and PreparedStatement"]],
    ],
    details: {
      "1.1. Introduction to Java": {
        heading: "1. Introduction to Java",
        intro: "Java គឺជាភាសាសរសេរកម្មវិធីដែលត្រូវបានប្រើប្រាស់យ៉ាងទូលំទូលាយ ដែលល្បីខាងភាពអាចចល័តបាន និងភាពបត់បែន។ ផ្នែកនេះគ្របដណ្តប់លើមូលដ្ឋានគ្រឹះនៃ Java រួមទាំង JDK, JRE និង JVM។",
        bodyHeading: "1.1. Java ជាអ្វី?",
        body: "Java គឺជាភាសាសរសេរកម្មវិធីកម្រិតខ្ពស់ និងតម្រង់ទិសវត្ថុ។ វាមានភាពឯករាជ្យលើវេទិកា ដូច្នេះកម្មវិធីអាចដំណើរការលើឧបករណ៍ដែលមាន Java Virtual Machine (JVM)។",
        code: "public class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, World!\");\n    }\n}",
        preview: { title: "Hello, World!", body: "The JVM runs the compiled Java class." },
      },
    },
  }),
  csharp: createReferenceCourse({
    slug: "csharp",
    title: "C#",
    description: "មេរៀន C# តាមលំដាប់ដូច CodeKhmerLearning។",
    codeLabel: "Program.cs",
    tip: "ប្រើ type system របស់ C# ដើម្បីធ្វើឱ្យកំហុសកើតមានតិច និងកូដងាយថែទាំ។",
    sections: [
      [1, "Introduction to C#", ["1.1 What is C#?", "1.2 Setting Up the Environment (Installing .NET SDK & Visual Studio)", "1.3 Writing and Running Your First C# Program", "1.4 Understanding the .NET Framework"]],
      [2, "C# Basics", ["2.1 Syntax and Structure", "2.2 Variables and Data Types", "2.3 Constants and Readonly Fields", "2.4 Operators (Arithmetic, Logical, Comparison)", "2.5 Type Casting and Conversions"]],
      [3, "Control Flow", ["3.1 Conditional Statements (if, else, switch)", "3.2 Loops (for, while, do-while, foreach)", "3.3 Jump Statements (break, continue, return, goto)"]],
      [4, "Methods and Functions", ["4.1 Defining and Calling Methods", "4.2 Method Parameters (ref, out, params)", "4.3 Method Overloading", "4.4 Recursion"]],
      [5, "Object-Oriented Programming (OOP) in C#", ["5.1 Classes and Objects", "5.2 Constructors and Destructors", "5.3 Encapsulation (Access Modifiers)", "5.4 Properties and Auto-Properties", "5.5 Static Members", "5.6 Inheritance (base and derived classes)", "5.7 Polymorphism (method overriding, abstract classes, virtual methods)", "5.8 Interfaces", "5.9 Sealed and Partial Classes"]],
      [6, "Exception Handling", ["6.1. Try-Catch-Finally Blocks", "6.2. Throwing Exceptions", "6.3. Custom Exceptions"]],
      [7, "Collections and Data Structures", ["7.1. Arrays (one-dimensional, multi-dimensional, jagged)", "7.2. Lists (List<T>)", "7.3. Dictionaries (Dictionary<TKey, TValue>)", "7.4. Queues and Stacks", "7.5. HashSet and SortedSet"]],
      [8, "File Handling and Streams", ["8.1. Reading and Writing Files (File, StreamReader, StreamWriter)", "8.2. Working with JSON (System.Text.Json)", "8.3. Handling CSV Files"]],
      [9, "LINQ", ["9.1. Introduction to LINQ", "9.2. LINQ Queries (Where, Select, OrderBy)", "9.3. LINQ with Collections", "9.4. LINQ with Databases (Entity Framework)"]],
      [10, "Delegates and Events", ["10.1. Delegates (Func, Action, Predicate)", "10.2. Lambda Expressions", "10.3. Events and Event Handling"]],
      [11, "Multithreading and Asynchronous Programming", ["11.1. Threads (Thread Class)", "11.2. Task-Based Asynchronous Pattern (async and await)", "11.3. Parallel Programming (Parallel.For, Parallel.ForEach)", "11.4. Background Workers"]],
      [12, "Database Programming", ["12.1. ADO.NET Basics", "12.2. Connecting to SQL Server", "12.3. Executing SQL Queries with C#", "12.4. Entity Framework Core Basics"]],
      [13, "Windows Forms", ["13.1. Introduction to Windows Forms", "13.2. Working with Controls (Buttons, Labels, Textboxes)", "13.3. Event Handling in Windows Forms", "13.4. Introduction to WPF (Windows Presentation Foundation)"]],
      [14, "ASP.NET Core", ["14.1. Introduction to ASP.NET Core", "14.2. MVC Architecture in ASP.NET"]],
    ],
    details: {
      "1.1 What is C#?": {
        heading: "1. Introduction to C#",
        intro: "C# (អានថា \"C Sharp\") គឺជាភាសាសរសេរកម្មវិធីទំនើបដែលមានលក្ខណៈវត្ថុនិយម បង្កើតឡើងដោយ Microsoft។ វាត្រូវបានប្រើសម្រាប់បង្កើតកម្មវិធី Windows, កម្មវិធីវេប, ហ្គេម និងកម្មវិធីទូរស័ព្ទ។",
        bodyHeading: "1.1 What is C#?",
        body: "C# គឺជាភាសាដែលមាន type safety និងការគ្រប់គ្រងកំហុសល្អ។ វាគាំទ្រការសរសេរកម្មវិធីបែបវត្ថុ និងដំណើរការលើ .NET។",
        code: "using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine(\"Hello, C#!\");\n    }\n}",
        preview: { title: "Hello, C#!", body: ".NET ran the first C# statement." },
      },
    },
  }),
  springboot: createReferenceCourse({
    slug: "springboot",
    title: "Java & Spring Boot",
    description: "មេរៀន Java និង Spring Boot តាមលំដាប់ដូច CodeKhmerLearning។",
    codeLabel: "HelloWorld.java",
    tip: "រៀន Java fundamentals មុន បន្ទាប់មកអនុវត្ត Spring Boot ដោយបែងចែក application ជាស្រទាប់ច្បាស់លាស់។",
    sections: [
      [1, "Introduction to Java & Spring Boot", ["1.1. What is Java?", "1.2. What is Spring Framework?", "1.3. What is Spring Boot?", "1.4. Advantages of Spring Boot", "1.5. Spring Boot Architecture", "1.6. Spring Boot vs Spring Framework", "1.7. Installing JDK", "1.8. Installing IDE (IntelliJ IDEA / VS Code / Eclipse)", "1.9. Installing Maven & Gradle", "1.10. Creating First Spring Boot Project", "1.11. Running Spring Boot Application", "1.12. Spring Boot Project Structure"]],
      [2, "Java Fundamentals for Spring Boot", ["2.1. Variables and Data Types", "2.2. Operators", "2.3. Conditional Statements", "2.4. Loops", "2.5. Arrays", "2.6. Methods", "2.7. Object-Oriented Programming (OOP)", "2.8. Classes and Objects", "2.9. Inheritance", "2.10. Polymorphism", "2.11. Encapsulation", "2.12. Abstraction", "2.13. Interfaces", "2.14. Exception Handling", "2.15. Collections Framework", "2.16. Generics", "2.17. Lambda Expressions", "2.18. Streams API"]],
      [3, "Spring Boot Basics", ["3.1. Spring Initializr", "3.2. Dependencies Management", "3.3. application.properties", "3.4. application.yml", "3.5. Spring Boot Starter Packages", "3.6. Auto Configuration", "3.7. Spring Boot DevTools", "3.8. Running on Different Ports", "3.9. Profiles (dev, test, prod)", "3.10. Logging in Spring Boot"]],
      [4, "Dependency Injection & Beans", ["4.1. What is IoC?", "4.2. Dependency Injection (DI)", "4.3. Bean Lifecycle", "4.4. @Component", "4.5. @Service", "4.6. @Repository", "4.7. @Controller", "4.8. @RestController", "4.9. @Autowired", "4.10. Constructor Injection", "4.11. Setter Injection", "4.12. Bean Scope", "4.13. Configuration Class", "4.14. @Bean Annotation"]],
      [5, "Building REST API", ["5.1. What is REST API?", "5.2. HTTP Methods (GET, POST, PUT, DELETE)", "5.3. Request Mapping", "5.4. Path Variables", "5.5. Query Parameters", "5.6. Request Body", "5.7. Response Entity", "5.8. JSON Response", "5.9. CRUD API", "5.10. REST Best Practices", "5.11. Status Codes", "5.12. API Testing with Postman"]],
      [6, "Spring Boot MVC", ["6.1. MVC Architecture", "6.2. Controllers", "6.3. Views", "6.4. Thymeleaf Introduction", "6.5. Form Handling", "6.6. Validation", "6.7. Redirect and Forward", "6.8. Template Layout", "6.9. Static Resources", "6.10. Error Pages"]],
      [7, "Database Integration", ["7.1. Introduction to Databases", "7.2. SQL Basics", "7.3. MySQL Installation", "7.4. PostgreSQL Setup", "7.5. Connecting Database", "7.6. JDBC Basics", "7.7. Spring Data JPA", "7.8. Hibernate ORM", "7.9. Entity Class", "7.10. Repository Interface", "7.11. CRUD Repository", "7.12. JpaRepository", "7.13. Relationships", "7.14. One-to-One", "7.15. One-to-Many", "7.16. Many-to-Many", "7.17. Lazy vs Eager Loading", "7.18. Transactions"]],
      [8, "Advanced JPA & Hibernate", ["8.1. JPQL", "8.2. Native Query", "8.3. Pagination", "8.4. Sorting", "8.5. Auditing", "8.6. Entity Lifecycle", "8.7. Caching", "8.8. Optimistic Locking", "8.9. Pessimistic Locking", "8.10. Performance Optimization", "8.11. N+1 Query Problem", "8.12. DTO Projection"]],
      [9, "Validation & Exception Handling", ["9.1. Bean Validation", "9.2. @Valid Annotation", "9.3. Validation Constraints", "9.4. Custom Validation", "9.5. Global Exception Handling", "9.6. @ControllerAdvice", "9.7. Custom Exceptions", "9.8. API Error Response"]],
      [10, "Spring Security", ["10.1. Introduction to Security", "10.2. Authentication", "10.3. Authorization", "10.4. Spring Security Setup", "10.5. Password Encoding", "10.6. UserDetailsService", "10.7. Role-Based Access", "10.8. JWT Authentication", "10.9. JWT Access Token", "10.10. Refresh Token", "10.11. Security Filters", "10.12. OAuth2 Login", "10.13. Google Login", "10.14. CORS Configuration", "10.15. CSRF Protection"]],
      [11, "File Upload & Storage", ["11.1. Multipart File", "11.2. Upload Single File", "11.3. Upload Multiple Files", "11.4. Download File", "11.5. File Validation", "11.6. Store File in Database", "11.7. Store File in Server", "11.8. Cloud Storage Basics"]],
      [12, "API Documentation", ["12.1. Swagger/OpenAPI", "12.2. SpringDoc OpenAPI", "12.3. API Testing", "12.4. API Versioning", "12.5. Postman Collection"]],
      [13, "Spring Boot Testing", ["13.1. Unit Testing", "13.2. JUnit 5", "13.3. Mockito", "13.4. MockBean", "13.5. Integration Testing", "13.6. Test Containers", "13.7. API Testing", "13.8. Code Coverage"]],
      [14, "Spring Boot with Frontend", ["14.1. React + Spring Boot", "14.2. Vue + Spring Boot", "14.3. Angular + Spring Boot", "14.4. CORS Setup", "14.5. REST API Connection", "14.6. Authentication Integration"]],
      [15, "Spring Boot Microservices", ["15.1. What are Microservices?", "15.2. Monolith vs Microservices", "15.3. Service Discovery", "15.4. Eureka Server", "15.5. API Gateway", "15.6. Load Balancing", "15.7. Config Server", "15.8. OpenFeign", "15.9. Circuit Breaker", "15.10. Distributed Tracing"]],
      [16, "Messaging & Real-Time", ["16.1. WebSocket", "16.2. STOMP Protocol", "16.3. RabbitMQ", "16.4. Apache Kafka", "16.5. Event-Driven Architecture", "16.6. Real-Time Notification"]],
      [17, "Caching & Performance", ["17.1. Spring Cache", "17.2. Redis Integration", "17.3. Cache Eviction", "17.4. Performance Monitoring", "17.5. Profiling", "17.6. Async Programming", "17.7. Scheduling Tasks"]],
      [18, "Docker & Deployment", ["18.1. Introduction to Docker", "18.2. Dockerizing Spring Boot App", "18.3. Docker Compose", "18.4. Environment Variables", "18.5. CI/CD Basics", "18.6. GitHub Actions", "18.7. Deploy to VPS", "18.8. Deploy to Render", "18.9. Deploy to Railway", "18.10. Deploy to AWS", "18.11. Nginx Reverse Proxy"]],
      [19, "Advanced Spring Boot", ["19.1. Custom Starter", "19.2. AOP (Aspect Oriented Programming)", "19.3. Reflection", "19.4. Event Listener", "19.5. Custom Annotation", "19.6. Spring Batch", "19.7. Spring Scheduler", "19.8. Reactive Programming", "19.9. WebFlux"]],
      [20, "Real-World Projects", ["20.1. Authentication System", "20.2. E-commerce API", "20.3. POS Management System", "20.4. Blog API", "20.5. School Management System", "20.6. Banking API", "20.7. Inventory System", "20.8. Chat Application", "20.9. Booking System", "20.10. Social Media Backend"]],
      [21, "Best Practices & Clean Code", ["21.1. Layered Architecture", "21.2. DTO Pattern", "21.3. Service Pattern", "21.4. Repository Pattern", "21.5. SOLID Principles", "21.6. Clean Code", "21.7. API Security Best Practices", "21.8. Environment Configuration", "21.9. Logging Best Practices", "21.10. Production Optimization"]],
      [22, "Final Capstone Project", ["22.1. Full Authentication", "22.2. Admin Dashboard", "22.3. User Management", "22.4. Payment Integration", "22.5. File Upload", "22.6. Docker Deployment", "22.7. Cloud Deployment", "22.8. Documentation", "22.9. Testing", "22.10. Production Release"]],
    ],
    details: {
      "1.1. What is Java?": {
        heading: "មេរៀនទី១: ការណែនាំអំពី Java និង Spring Boot (Module 1: Introduction to Java & Spring Boot)",
        intro: "Java គឺជាភាសាសរសេរកម្មវិធីដ៏មានអានុភាព តម្រង់ទិសវត្ថុ (Object-Oriented) ដែលត្រូវបានប្រើប្រាស់យ៉ាងទូលំទូលាយសម្រាប់កម្មវិធីសហគ្រាស (Enterprise Applications)។ Spring Boot គឺជា Framework ដែលបង្កើតឡើងលើ Spring Framework ដើម្បីសម្រួលដល់ការបង្កើតកម្មវិធី Java ដែលត្រៀមផលិតកម្ម (Production-Ready Applications) ជាមួយការកំណត់រចនាសម្ព័ន្ធតិចតួចបំផុត (Minimal Configuration)។",
        bodyHeading: "1.1. តើ Java ជាអ្វី? (What is Java?)",
        body: "Java គឺជាភាសាសរសេរកម្មវិធីកម្រិតខ្ពស់ (High-level Programming Language) ដែលផ្អែកលើ Class និងតម្រង់ទិសវត្ថុ (Object-Oriented)។ វាត្រូវបានបង្កើតឡើងដោយ James Gosling នៅ Sun Microsystems ហើយបានចេញផ្សាយជាលើកដំបូងក្នុងឆ្នាំ 1995។\n\nគោលការណ៍សំខាន់របស់ Java: \"Write Once, Run Anywhere\" (WORA) — កូដ Java អាចដំណើរការលើវេទិកាណាមួយដែលមាន Java Virtual Machine (JVM) ដោយមិនចាំបាច់ Compile ឡើងវិញ។\n\nលក្ខណៈសំខាន់ៗ៖\n- Platform Independent\n- Object-Oriented\n- Robust និង Secure\n- Multithreaded\n- Rich Standard Library\n- High Performance",
        code: "// This is a simple Java program\npublic class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, Welcome to Java!\");\n        System.out.println(\"Java is platform independent.\");\n    }\n}\n\n// Output:\n// Hello, Welcome to Java!\n// Java is platform independent.",
        preview: { title: "Hello, Welcome to Java!", body: "Java is platform independent." },
      },
    },
  }),
  "dart-programming": createReferenceCourse({
    slug: "dart-programming",
    title: "Dart",
    description: "មេរៀនកម្មវិធី Dart តាមលំដាប់ដូច CodeKhmerLearning។",
    codeLabel: "main.dart",
    tip: "ប្រើ sound null safety និងប្រភេទទិន្នន័យដែលបង្ហាញច្បាស់ពីការសន្មត់របស់កូដ។",
    sections: [
      [1, "Introduction to Dart", ["1.1. What is Dart?", "1.2. Why Learn Dart?", "1.3. Installing Dart SDK", "1.4. Setting Up Dart in VS Code"]],
      [2, "Dart Basics", ["2.1. Variables and Data Types", "2.2. Constants (final & const)", "2.3. Operators (Arithmetic, Logical, Comparison, Bitwise)"]],
      [3, "Control Flow", ["3.1. Conditional Statements (if, if-else, if else-if else, switch)", "3.2. Loops (for, while, do-while)", "3.3. Exception Handling (try-catch-finally, throw)"]],
      [4, "Functions in Dart", ["4.1. Defining Functions", "4.2. Parameters & Return Types", "4.3. Optional & Named Parameters", "4.4. Higher-Order Functions & Anonymous Functions"]],
      [5, "Object-Oriented Programming (OOP)", ["5.1. Classes and Objects", "5.2. Constructors", "5.3. Inheritance", "5.3.1. Single Inheritance", "5.3.2. Multilevel Inheritance", "5.3.3. Hierarchical Inheritance", "5.3.4. Multiple Inheritance (via Mixins)", "5.4. Polymorphism", "5.5. Abstract Classes & Interfaces", "5.6. Getters & Setters"]],
      [6, "Collections (Lists, Sets, Maps)", ["6.1. List and List Methods", "6.2. Set and Set Operations", "6.3. Map (Key-Value Pairs) & Manipulation"]],
      [7, "Asynchronous Programming", ["7.1. Understanding Future and async-await", "7.2. Stream and Stream API", "7.3. Handling Asynchronous Errors"]],
      [8, "Dart Packages & Libraries", ["8.1. Using External Packages (pub.dev)", "8.2. Creating and Publishing Your Own Package", "8.3. Importing and Exporting Files"]],
      [9, "Functional Programming in Dart", ["9.1. Closures and Lambdas", "9.2. Immutable Data Structures", "9.3. Streams and Reactive Programming"]],
      [10, "Memory Management & Performance", ["10.1. Garbage Collection", "10.2. Optimizing Dart Code", "10.3. Profiling & Debugging"]],
      [11, "Dart for Web & Mobile (Flutter)", ["11.1. Introduction to Flutter", "11.2. Connecting Dart with Flutter UI", "11.3. State Management in Flutter", "11.4. Using APIs in Flutter (HTTP Requests)"]],
    ],
    details: {
      "1.1. What is Dart?": {
        heading: "1. Introduction to Dart",
        intro: "Dart គឺជាភាសាកម្មវិធីដែលត្រូវបានបង្កើតឡើងដោយ Google ដែលត្រូវបានរចនាឡើងសម្រាប់ការអភិវឌ្ឍកម្មវិធីឆ្លងវេទិកា។ វាត្រូវបានគេស្គាល់ជាចម្បងសម្រាប់ការប្រើប្រាស់ជាមួយ Flutter ដែលជាក្របខ័ណ្ឌ UI សម្រាប់បង្កើតកម្មវិធីទូរស័ព្ទ។ ផ្នែកនេះនឹងណែនាំអ្នកអំពីភាសា Dart និងរបៀបចាប់ផ្តើមប្រើវា។",
        bodyHeading: "1.1. What is Dart?",
        body: "Dart គឺជាភាសាកម្មវិធីបើកចំហ (open-source) ដែលមានគោលបំណងផ្តល់នូវភាពងាយស្រួល និងប្រសិទ្ធភាពក្នុងការសរសេរកូដ។ វាត្រូវបានបង្កើតឡើងក្នុងឆ្នាំ 2011 ដោយ Google និងត្រូវបានប្រើប្រាស់យ៉ាងទូលំទូលាយជាមួយ Flutter សម្រាប់ការអភិវឌ្ឍកម្មវិធីទូរស័ព្ទ គេហទំព័រ និង desktop។\n\nDart មានលក្ខណៈពិសេសដូចជា៖\n- ការគាំទ្រ JIT (Just-In-Time) និង AOT (Ahead-Of-Time) compilation។\n- វាក្យសម្ព័ន្ធសាមញ្ញ និងងាយយល់ស្រដៀងទៅនឹង Java និង JavaScript។\n- គាំទ្រការសរសេរកម្មវិធីទាំង object-oriented និង functional។",
        code: "void main() {\n  print(\"Hello, Dart!\");\n}",
        preview: { title: "Hello, Dart!", body: "The Dart runtime started from the main function." },
      },
      "1.2. Why Learn Dart?": {
        heading: "1.2. Why Learn Dart?",
        intro: "ការរៀន Dart មានអត្ថប្រយោជន៍ជាច្រើន ជាពិសេសប្រសិនបើអ្នកចាប់អារម្មណ៍លើការអភិវឌ្ឍកម្មវិធីជាមួយ Flutter។",
        bodyHeading: "ឧទាហរណ៍កូដ Dart សាមញ្ញ៖",
        body: "• ងាយស្រួលរៀនសម្រាប់អ្នកដែលស្គាល់ Java ឬ JavaScript។\n• បង្កើនផលិតភាពជាមួយ Flutter សម្រាប់ការបង្កើត UI ដ៏ស្រស់ស្អាត។\n• អាចប្រើបានសម្រាប់កម្មវិធីគ្រប់វេទិកា (mobile, web, desktop)។",
        code: "void main() {\n  print(\"Hello, Dart!\");\n}",
        preview: { title: "Hello, Dart!", body: "A simple Dart program prints to the console." },
      },
    },
  }),
};

// Keep every subject on the CampusFlow domain. These local readers use the
// same outline, progress, copy-code and playground flow as the reference
// readers, so a subject click never sends a learner to another website.
const localCourseBlueprints = [
  {
    slug: "cpp_programming", title: "C++", codeLabel: "main.cpp", tip: "Compile with warnings enabled and keep ownership of memory explicit.",
    firstLabel: "1.1 What is C++?", firstHeading: "1. Introduction to C++", firstCode: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, C++!\";\n    return 0;\n}", firstPreview: { title: "Hello, C++!", body: "The program starts in main and writes to standard output." },
    sections: [[1, "Introduction to C++", ["1.1 What is C++?", "1.2 History and Features of C++", "1.3 Setting Up a C++ Environment", "1.4 Structure of a C++ Program"]], [2, "C++ Basics", ["2.1 Variables and Data Types", "2.2 Constants", "2.3 Input and Output", "2.4 Type Casting"]], [3, "Operators and Control Flow", ["3.1 Operators", "3.2 if and switch", "3.3 for, while and do-while", "3.4 break and continue"]], [4, "Functions and Arrays", ["4.1 Functions", "4.2 Parameters and Return Values", "4.3 Arrays and Strings", "4.4 Recursion"]], [5, "Object-Oriented C++", ["5.1 Classes and Objects", "5.2 Constructors and Destructors", "5.3 Inheritance", "5.4 Polymorphism", "5.5 Encapsulation"]], [6, "STL and Modern C++", ["6.1 Vectors and Iterators", "6.2 Maps and Sets", "6.3 Templates", "6.4 Smart Pointers"]]],
  },
  {
    slug: "python", title: "Python", codeLabel: "main.py", tip: "Use small functions, readable names and virtual environments for each project.",
    firstLabel: "1.1 What is Python?", firstHeading: "1. Introduction to Python", firstCode: "def greet(name):\n    return f\"Hello, {name}!\"\n\nprint(greet(\"Learner\"))", firstPreview: { title: "Hello, Learner!", body: "Python keeps the first program short and readable." },
    sections: [[1, "Introduction to Python", ["1.1 What is Python?", "1.2 Installing Python", "1.3 Running Your First Program", "1.4 Python Syntax and Indentation"]], [2, "Variables and Data Types", ["2.1 Variables", "2.2 Numbers and Strings", "2.3 Lists, Tuples and Sets", "2.4 Dictionaries", "2.5 Type Conversion"]], [3, "Control Flow", ["3.1 if, elif and else", "3.2 for Loops", "3.3 while Loops", "3.4 break and continue"]], [4, "Functions", ["4.1 Defining Functions", "4.2 Parameters and Arguments", "4.3 Return Values", "4.4 Lambda Functions", "4.5 Modules and Packages"]], [5, "Object-Oriented Python", ["5.1 Classes and Objects", "5.2 Constructors", "5.3 Inheritance", "5.4 Encapsulation"]], [6, "Files and Errors", ["6.1 Reading and Writing Files", "6.2 Exceptions", "6.3 JSON Data", "6.4 Virtual Environments"]]],
  },
  {
    slug: "php", title: "PHP", codeLabel: "index.php", tip: "Validate input, escape output and keep database queries parameterized.",
    firstLabel: "1.1 What is PHP?", firstHeading: "1. Introduction to PHP", firstCode: "<?php\n$name = \"Learner\";\necho \"Hello, $name!\";", firstPreview: { title: "Hello, Learner!", body: "PHP generates text on the server before the page reaches the browser." },
    sections: [[1, "Introduction to PHP", ["1.1 What is PHP?", "1.2 Installing PHP", "1.3 Your First PHP Script", "1.4 PHP Syntax"]], [2, "PHP Basics", ["2.1 Variables", "2.2 Constants", "2.3 Strings and Numbers", "2.4 Arrays"]], [3, "Control Flow and Functions", ["3.1 if and switch", "3.2 Loops", "3.3 Functions", "3.4 Include and Require"]], [4, "Forms and Requests", ["4.1 HTML Forms", "4.2 GET and POST", "4.3 Input Validation", "4.4 Sessions and Cookies"]], [5, "PHP and Databases", ["5.1 MySQL Connection", "5.2 Prepared Statements", "5.3 CRUD Operations", "5.4 Error Handling"]], [6, "Object-Oriented PHP", ["6.1 Classes and Objects", "6.2 Inheritance", "6.3 Interfaces", "6.4 Namespaces"]]],
  },
  {
    slug: "laravel", title: "Laravel", codeLabel: "routes/web.php", tip: "Keep validation, authorization and database access inside clear application layers.",
    firstLabel: "1.1 What is Laravel?", firstHeading: "1. Introduction to Laravel", firstCode: "use Illuminate\\Support\\Facades\\Route;\n\nRoute::get('/hello', function () {\n    return 'Hello, Laravel!';\n});", firstPreview: { title: "Hello, Laravel!", body: "A route connects a browser request to application code." },
    sections: [[1, "Introduction to Laravel", ["1.1 What is Laravel?", "1.2 Installing Laravel", "1.3 Laravel Project Structure", "1.4 Configuration and Environment"]], [2, "Routing and Controllers", ["2.1 Web Routes", "2.2 Route Parameters", "2.3 Controllers", "2.4 Middleware"]], [3, "Blade and Frontend", ["3.1 Blade Templates", "3.2 Layouts and Components", "3.3 Forms", "3.4 Validation"]], [4, "Database and Eloquent", ["4.1 Migrations", "4.2 Models", "4.3 Eloquent Queries", "4.4 Relationships", "4.5 Seeders and Factories"]], [5, "Authentication and APIs", ["5.1 Authentication", "5.2 Authorization and Policies", "5.3 API Resources", "5.4 API Authentication"]], [6, "Testing and Deployment", ["6.1 Feature Tests", "6.2 Unit Tests", "6.3 Queues and Jobs", "6.4 Production Deployment"]]],
  },
  {
    slug: "node", title: "Node.js", codeLabel: "server.js", tip: "Keep secrets in environment variables and validate every request at the API boundary.",
    firstLabel: "1.1 What is Node.js?", firstHeading: "1. Introduction to Node.js", firstCode: "const http = require('http');\n\nhttp.createServer((request, response) => {\n  response.end('Hello, Node.js!');\n}).listen(3000);", firstPreview: { title: "Hello, Node.js!", body: "Node.js runs JavaScript outside the browser." },
    sections: [[1, "Introduction to Node.js", ["1.1 What is Node.js?", "1.2 Installing Node.js", "1.3 npm and package.json", "1.4 Running a Node Program"]], [2, "JavaScript for Node.js", ["2.1 Modules", "2.2 Callbacks and Promises", "2.3 async and await", "2.4 Working with Events"]], [3, "Files and HTTP", ["3.1 File System Module", "3.2 Creating an HTTP Server", "3.3 URL and Query Parameters", "3.4 Streams"]], [4, "Express.js", ["4.1 Express Setup", "4.2 Routes", "4.3 Middleware", "4.4 Request and Response", "4.5 Error Handling"]], [5, "Databases and APIs", ["5.1 Connecting to a Database", "5.2 REST API Design", "5.3 Authentication", "5.4 Input Validation"]], [6, "Testing and Deployment", ["6.1 Testing APIs", "6.2 Environment Variables", "6.3 Logging", "6.4 Production Deployment"]]],
  },
  {
    slug: "kotlin", title: "Kotlin", codeLabel: "Main.kt", tip: "Use null safety and immutable values to make Kotlin code easier to maintain.",
    firstLabel: "1.1 What is Kotlin?", firstHeading: "1. Introduction to Kotlin", firstCode: "fun main() {\n    println(\"Hello, Kotlin!\")\n}", firstPreview: { title: "Hello, Kotlin!", body: "Kotlin starts from a concise main function." },
    sections: [[1, "Introduction to Kotlin", ["1.1 What is Kotlin?", "1.2 Installing Kotlin", "1.3 Your First Kotlin Program", "1.4 Kotlin and Java"]], [2, "Kotlin Basics", ["2.1 Variables and Constants", "2.2 Data Types", "2.3 Strings", "2.4 Nullable Types"]], [3, "Control Flow and Functions", ["3.1 if Expressions", "3.2 when Expressions", "3.3 Loops", "3.4 Functions and Parameters"]], [4, "Object-Oriented Kotlin", ["4.1 Classes and Objects", "4.2 Data Classes", "4.3 Inheritance", "4.4 Interfaces"]], [5, "Collections and Coroutines", ["5.1 Lists, Sets and Maps", "5.2 Lambdas", "5.3 Extension Functions", "5.4 Coroutines"]]],
  },
  {
    slug: "flutter", title: "Flutter", codeLabel: "lib/main.dart", tip: "Keep widgets small, make state explicit and test layouts at multiple screen sizes.",
    firstLabel: "1.1 What is Flutter?", firstHeading: "1. Introduction to Flutter", firstCode: "import 'package:flutter/material.dart';\n\nvoid main() => runApp(const MaterialApp(\n  home: Scaffold(body: Center(child: Text('Hello, Flutter!'))),\n));", firstPreview: { title: "Hello, Flutter!", body: "Flutter builds the interface from reusable widgets." },
    sections: [[1, "Introduction to Flutter", ["1.1 What is Flutter?", "1.2 Installing Flutter", "1.3 Creating a Flutter Project", "1.4 Flutter Project Structure"]], [2, "Dart for Flutter", ["2.1 Variables and Functions", "2.2 Classes and Objects", "2.3 Lists and Maps", "2.4 Futures and async"]], [3, "Flutter Widgets", ["3.1 StatelessWidget", "3.2 StatefulWidget", "3.3 Text, Image and Icon", "3.4 Rows, Columns and Containers"]], [4, "Layouts and Navigation", ["4.1 Responsive Layouts", "4.2 Lists and Grids", "4.3 Navigation", "4.4 Forms and Validation"]], [5, "State and Data", ["5.1 Managing State", "5.2 Calling APIs", "5.3 Local Storage", "5.4 Error and Loading States"]]],
  },
  {
    slug: "mysql", title: "MySQL", codeLabel: "query.sql", tip: "Use constraints and parameterized queries to protect data integrity and security.",
    firstLabel: "1.1 What is MySQL?", firstHeading: "1. Introduction to MySQL", firstCode: "CREATE DATABASE campusflow;\nUSE campusflow;\n\nCREATE TABLE students (\n  id INT PRIMARY KEY AUTO_INCREMENT,\n  name VARCHAR(120) NOT NULL\n);", firstPreview: { title: "campusflow", body: "A database and students table are ready for queries." },
    sections: [[1, "Introduction to MySQL", ["1.1 What is MySQL?", "1.2 Installing MySQL", "1.3 Creating a Database", "1.4 MySQL Workbench"]], [2, "SQL Basics", ["2.1 CREATE and ALTER", "2.2 INSERT", "2.3 SELECT", "2.4 UPDATE and DELETE"]], [3, "Filtering and Functions", ["3.1 WHERE", "3.2 ORDER BY and LIMIT", "3.3 Aggregate Functions", "3.4 GROUP BY and HAVING"]], [4, "Relationships", ["4.1 Primary Keys", "4.2 Foreign Keys", "4.3 INNER JOIN", "4.4 LEFT JOIN"]], [5, "Indexes and Transactions", ["5.1 Indexes", "5.2 Transactions", "5.3 Constraints", "5.4 Views"]], [6, "Security and Performance", ["6.1 Users and Privileges", "6.2 Backups", "6.3 Query Optimization", "6.4 Prepared Statements"]]],
  },
  {
    slug: "git", title: "Git", codeLabel: "terminal", tip: "Make focused commits and never commit passwords, tokens or generated secrets.",
    firstLabel: "1.1 What is Git?", firstHeading: "1. Introduction to Git", firstCode: "git init\ngit add .\ngit commit -m \"Start project\"", firstPreview: { title: "Repository created", body: "Git records a project snapshot that can be shared and restored." },
    sections: [[1, "Introduction to Git", ["1.1 What is Git?", "1.2 Installing Git", "1.3 Creating a Repository", "1.4 Git Configuration"]], [2, "Working with Commits", ["2.1 git status", "2.2 git add", "2.3 git commit", "2.4 Viewing History"]], [3, "Branches and Merging", ["3.1 Creating Branches", "3.2 Switching Branches", "3.3 Merging", "3.4 Resolving Conflicts"]], [4, "Remote Repositories", ["4.1 git clone", "4.2 git remote", "4.3 git push", "4.4 git pull"]], [5, "Team Workflow", ["5.1 Pull Requests", "5.2 Code Review", "5.3 Tags and Releases", "5.4 .gitignore"]]],
  },
  {
    slug: "Cyber-Security", title: "Cyber Security", codeLabel: "security-checklist.txt", tip: "Protect accounts, minimize access and treat every external input as untrusted.",
    firstLabel: "1.1 What is Cyber Security?", firstHeading: "1. Introduction to Cyber Security", firstCode: "Security checklist:\n- Use unique passwords\n- Enable MFA\n- Update software\n- Verify links before opening", firstPreview: { title: "Safer habits", body: "Small security practices reduce common risks." },
    sections: [[1, "Introduction to Cyber Security", ["1.1 What is Cyber Security?", "1.2 Common Threats", "1.3 Security Principles", "1.4 Security Careers"]], [2, "Account and Device Security", ["2.1 Passwords and MFA", "2.2 Phishing", "2.3 Secure Devices", "2.4 Updates and Backups"]], [3, "Network Security", ["3.1 Networks and Protocols", "3.2 Firewalls", "3.3 Wi-Fi Security", "3.4 VPN Basics"]], [4, "Web Application Security", ["4.1 Authentication", "4.2 Authorization", "4.3 Input Validation", "4.4 OWASP Top Risks"]], [5, "Security Operations", ["5.1 Logging and Monitoring", "5.2 Incident Response", "5.3 Risk Assessment", "5.4 Security Policies"]]],
  },
  {
    slug: "components-of-computer", title: "Computer Components", codeLabel: "computer-parts.txt", tip: "Understand compatibility, cooling and safe handling before upgrading hardware.",
    firstLabel: "1.1 What is a Computer?", firstHeading: "1. Introduction to Computer Components", firstCode: "Computer system\n├── Input devices\n├── CPU and memory\n├── Storage\n└── Output devices", firstPreview: { title: "Computer system", body: "Hardware components work together to process, store and display information." },
    sections: [[1, "Introduction to Computers", ["1.1 What is a Computer?", "1.2 Hardware and Software", "1.3 Input and Output", "1.4 Digital Data"]], [2, "Core Components", ["2.1 CPU", "2.2 Motherboard", "2.3 RAM", "2.4 Power Supply"]], [3, "Storage and Graphics", ["3.1 Hard Drives", "3.2 SSDs", "3.3 Graphics Cards", "3.4 Cooling Systems"]], [4, "Building and Maintenance", ["4.1 Component Compatibility", "4.2 Installing Components", "4.3 Troubleshooting", "4.4 Safe Maintenance"]]],
  },
  {
    slug: "bootstrap", title: "Bootstrap", codeLabel: "index.html", tip: "Use responsive utilities consistently and keep components accessible across breakpoints.",
    firstLabel: "1.1 What is Bootstrap?", firstHeading: "1. Introduction to Bootstrap", firstCode: "<div class=\"container py-4\">\n  <h1 class=\"text-primary\">Hello, Bootstrap!</h1>\n  <button class=\"btn btn-success\">Start learning</button>\n</div>", firstPreview: { title: "Hello, Bootstrap!", body: "Bootstrap utilities help build responsive interfaces quickly." },
    sections: [[1, "Introduction to Bootstrap", ["1.1 What is Bootstrap?", "1.2 Installing Bootstrap", "1.3 Containers", "1.4 Breakpoints"]], [2, "Layout and Grid", ["2.1 Rows and Columns", "2.2 Responsive Grid", "2.3 Flex Utilities", "2.4 Spacing Utilities"]], [3, "Components", ["3.1 Buttons", "3.2 Cards", "3.3 Navbar", "3.4 Modal and Alerts"]], [4, "Forms and Utilities", ["4.1 Form Controls", "4.2 Validation", "4.3 Typography", "4.4 Colors and Helpers"]]],
  },
  {
    slug: "Learn-the-code-yourself", title: "Learn Code Yourself", codeLabel: "practice.html", tip: "Break a problem into small steps, test each step and keep practicing consistently.",
    firstLabel: "1.1 How to Start Coding", firstHeading: "1. Introduction to Programming", firstCode: "const goal = 'Build something useful';\nconst steps = ['learn', 'practice', 'test', 'improve'];\nconsole.log(goal, steps);", firstPreview: { title: "Keep learning", body: "Programming improves through small projects and regular practice." },
    sections: [[1, "Introduction to Programming", ["1.1 How to Start Coding", "1.2 What is an Algorithm?", "1.3 Variables and Values", "1.4 Input and Output"]], [2, "Problem Solving", ["2.1 Breaking Down a Problem", "2.2 Conditions", "2.3 Loops", "2.4 Functions"]], [3, "Web Development", ["3.1 HTML Structure", "3.2 CSS Styling", "3.3 JavaScript Interaction", "3.4 Responsive Design"]], [4, "Building Projects", ["4.1 Planning a Project", "4.2 Working with Data", "4.3 Testing and Debugging", "4.4 Publishing a Project"]]],
  },
];

const additionalReferenceCourseCatalog = Object.fromEntries(localCourseBlueprints.map((blueprint) => [
  blueprint.slug,
  createReferenceCourse({
    ...blueprint,
    description: `Learn ${blueprint.title} through a CampusFlow reader with practical lessons and examples.`,
    sections: blueprint.sections,
    details: {
      [blueprint.firstLabel]: {
        heading: blueprint.firstHeading,
        intro: `Learn the foundations of ${blueprint.title} with a practical first example.`,
        bodyHeading: blueprint.firstLabel,
        body: `This local CampusFlow lesson follows the same outline and reading flow as the other course subjects.`,
        code: blueprint.firstCode,
        preview: blueprint.firstPreview,
      },
    },
  }),
]));

Object.assign(referenceCourseCatalog, additionalReferenceCourseCatalog);
Object.assign(courseCatalog, referenceCourseCatalog);

// Additional original units keep every subject useful beyond the first
// reference outline. The labels follow the same progression style, but the
// explanations, examples and practice prompts are generated locally above.
const supplementalCourseUnits = {
  html: [
    [1, "Forms and Accessibility", ["Forms and Labels", "Input Types", "Accessible Buttons", "Keyboard Navigation"]],
    [2, "HTML for Search and Sharing", ["Metadata", "Semantic Landmarks", "Images and Responsive Media", "Social Sharing Cards"]],
    [3, "HTML Project Practice", ["Plan a Profile Page", "Build a Course Page", "Review HTML Structure", "Publish a Static Page"]],
  ],
  css: [
    [1, "Advanced CSS", ["Positioning", "Transitions and Transforms", "Custom Properties", "Container Queries"]],
    [2, "Accessible Responsive Design", ["Color Contrast", "Focus Styles", "Reduced Motion", "Responsive Typography"]],
    [3, "CSS Project Practice", ["Build a Course Card", "Build a Navigation Bar", "Create a Dashboard Grid", "Review and Refactor Styles"]],
  ],
  javascript: [
    [1, "Objects and Modules", ["Objects and Properties", "Destructuring", "ES Modules", "Error Boundaries"]],
    [2, "Browser APIs", ["Local Storage", "Form Validation", "Timers", "URL and History APIs"]],
    [3, "Testing and Projects", ["Write a Small Test", "Debug with DevTools", "Build a Quiz Interaction", "Deploy a JavaScript Page"]],
  ],
  tailwindcss: [
    [1, "Themes and Customization", ["Theme Tokens", "Custom Utilities", "Component Variants", "Plugin Basics"]],
    [2, "Accessible Components", ["Accessible Buttons", "Navigation States", "Form Feedback", "Dark Mode Contrast"]],
    [3, "Production Workflow", ["Class Organization", "Purge and Build Output", "Responsive Review", "Tailwind Project Checklist"]],
  ],
  react: [
    [1, "Hooks and State", ["useState", "useEffect", "useMemo and useCallback", "Custom Hooks"]],
    [2, "Data and Forms", ["Controlled Forms", "Loading and Error States", "Fetching API Data", "Optimistic Updates"]],
    [3, "Testing and Deployment", ["Component Testing", "Accessibility Testing", "Production Build", "React Project Review"]],
  ],
  c_programming: [
    [1, "C Projects and Tooling", ["Command-Line Projects", "Makefiles", "Testing C Functions", "Building a Release"]],
    [2, "C Safety Review", ["Input Validation", "Resource Ownership", "Undefined Behavior", "C Project Checklist"]],
  ],
  java: [
    [1, "Modern Java", ["Records", "Streams", "Optional Values", "Date and Time API"]],
    [2, "Java Projects", ["Unit Testing", "Maven Project Structure", "REST Client Practice", "Package and Deploy"]],
  ],
  csharp: [
    [1, "Modern C#", ["Properties and Records", "LINQ", "Async and Await", "Pattern Matching"]],
    [2, ".NET Application Practice", ["Build a Console App", "Create a Web API", "Dependency Injection", "Test and Publish"]],
  ],
  "dart-programming": [
    [1, "Dart Packages and Testing", ["pubspec.yaml", "Reusable Libraries", "Unit Testing", "Dart Analyzer"]],
    [2, "Dart Project Practice", ["Read JSON Data", "Build a CLI Tool", "Handle Errors", "Prepare a Release"]],
  ],
  springboot: [
    [1, "Production Readiness", ["Health Checks", "Structured Logging", "Configuration Profiles", "Observability"]],
    [2, "Spring Boot Project Review", ["Design the Use Case", "Secure the API", "Test the Deployment", "Document the Release"]],
  ],
  cpp_programming: [
    [1, "Modern C++ Practice", ["RAII", "Move Semantics", "Lambda Expressions", "Concurrency Basics"]],
    [2, "C++ Project Workflow", ["CMake", "Unit Testing", "Debugging", "Release Checklist"]],
  ],
  python: [
    [1, "Python Data and Web", ["Comprehensions", "Iterators and Generators", "HTTP Requests", "Working with APIs"]],
    [2, "Python Project Workflow", ["Testing with pytest", "Logging", "Packaging", "Deploying a Python App"]],
  ],
  php: [
    [1, "Modern PHP", ["Namespaces", "Composer", "Object Interfaces", "Typed Properties"]],
    [2, "PHP Application Practice", ["Secure Forms", "REST Endpoints", "Testing PHP", "Production Configuration"]],
  ],
  laravel: [
    [1, "Laravel Application Quality", ["Form Requests", "Authorization Policies", "API Resources", "Automated Tests"]],
    [2, "Laravel Production", ["Queues", "Events and Listeners", "Caching", "Deployment Checklist"]],
  ],
  node: [
    [1, "Node.js Application Quality", ["Environment Configuration", "Input Validation", "Testing Routes", "Structured Logging"]],
    [2, "Node.js Production", ["Authentication Middleware", "Database Transactions", "Caching", "Deploy an API"]],
  ],
  kotlin: [
    [1, "Kotlin Application Patterns", ["Sealed Classes", "Generics", "Extension Functions", "Testing Kotlin"]],
    [2, "Kotlin Project Practice", ["Coroutines and Cancellation", "HTTP Client", "Persistence", "Package a Release"]],
  ],
  flutter: [
    [1, "Flutter Application Quality", ["Widget Testing", "Accessibility", "Animations", "Responsive Breakpoints"]],
    [2, "Flutter Project Practice", ["Navigation Shell", "API Loading States", "Local Persistence", "Build for Release"]],
  ],
  mysql: [
    [1, "Advanced SQL", ["Subqueries", "Common Table Expressions", "Window Functions", "Stored Procedures"]],
    [2, "Database Operations", ["User Roles", "Backup and Restore", "Query Plans", "Production Checklist"]],
  ],
  git: [
    [1, "Collaboration Workflow", ["Pull Requests", "Code Review", "Rebasing", "Release Tags"]],
    [2, "Git Project Practice", ["Protect Secrets", "Recover a Commit", "Automate Checks", "Repository Checklist"]],
  ],
  "Cyber-Security": [
    [1, "Security Assessment", ["Threat Modeling", "Asset Inventory", "Vulnerability Triage", "Security Testing"]],
    [2, "Incident Readiness", ["Alert Handling", "Evidence Preservation", "Recovery Planning", "Security Review"]],
  ],
  "components-of-computer": [
    [1, "Operating Systems", ["Processes", "Filesystems", "Drivers", "System Updates"]],
    [2, "Hardware Troubleshooting", ["Read Error Symptoms", "Check Power and Cooling", "Test Components", "Maintenance Plan"]],
  ],
  bootstrap: [
    [1, "Bootstrap Components", ["Responsive Navbar", "Cards and Modals", "Alerts and Toasts", "Accessible Forms"]],
    [2, "Bootstrap Project Practice", ["Build a Landing Page", "Build a Course Grid", "Customize Theme Colors", "Production Review"]],
  ],
  "Learn-the-code-yourself": [
    [1, "Practice Habits", ["Read Documentation", "Ask Better Questions", "Use Version Control", "Learn from Errors"]],
    [2, "Build Your First Project", ["Choose a Small Scope", "Design the Data", "Test the Main Flow", "Share the Result"]],
  ],
};

Object.entries(supplementalCourseUnits).forEach(([slug, sections]) => {
  const course = courseCatalog[slug];
  if (!course) return;
  const highestNumber = course.lessons.reduce((max, unit) => Math.max(max, Number(unit.number) || 0), 0);
  const normalizedSections = sections.map(([unusedNumber, sectionTitle, labels], index) => [highestNumber + index + 1, sectionTitle, labels]);
  const generated = createReferenceCourse({
    slug: course.slug,
    title: course.title,
    description: course.description,
    codeLabel: course.codeLabel,
    tip: course.tip,
    sections: normalizedSections,
  });
  course.lessons = [...course.lessons, ...generated.lessons];
});

const technologyCourseSlugs = {
  HTML: "html",
  CSS: "css",
  JavaScript: "javascript",
  React: "react",
  "Tailwind CSS": "tailwindcss",
  C: "c_programming",
  Java: "java",
  "C#": "csharp",
  Dart: "dart-programming",
  SpringBoot: "springboot",
  Kotlin: "kotlin",
  "C++": "cpp_programming",
  Python: "python",
  PHP: "php",
  Laravel: "laravel",
  "Node.js": "node",
  MySQL: "mysql",
  Git: "git",
  "Cyber Security": "Cyber-Security",
  "Computer Components": "components-of-computer",
  Bootstrap: "bootstrap",
  "Learn Code Yourself": "Learn-the-code-yourself",
  Flutter: "flutter",
};

const codeLanguageBySlug = {
  html: "html",
  css: "css",
  javascript: "javascript",
  react: "javascript",
  tailwindcss: "html",
  c_programming: "c",
  cpp_programming: "cpp",
  python: "python",
  java: "java",
  csharp: "csharp",
  "dart-programming": "dart",
  springboot: "java",
  php: "php",
  laravel: "php",
  node: "javascript",
  mysql: "sql",
  git: "shell",
  "Cyber-Security": "shell",
  "components-of-computer": "text",
  bootstrap: "html",
  "Learn-the-code-yourself": "text",
  flutter: "dart",
};

const browserRunnableLanguages = new Set(["html", "css", "javascript"]);
const serverRunnableLanguages = new Set(["c", "cpp", "csharp", "dart", "java", "javascript", "kotlin", "php", "python", "shell", "sql"]);

const syntaxKeywords = new Set([
  "as", "async", "await", "break", "case", "catch", "class", "const", "continue", "def", "do", "else", "export",
  "extends", "final", "finally", "for", "from", "function", "if", "implements", "import", "in", "interface", "let",
  "new", "null", "private", "protected", "public", "return", "static", "struct", "switch", "this", "throw", "try",
  "using", "var", "void", "while", "with", "yield", "true", "false", "None", "True", "False", "print", "echo",
]);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function highlightCode(source, language) {
  const commentHash = new Set(["python", "shell", "sql", "c", "cpp"]);
  const pattern = [
    language === "html" ? "</?[A-Za-z][^>]*>" : null,
    "//[^\\n]*|/\\*[\\s\\S]*?\\*/",
    commentHash.has(language) ? "#[^\\n]*" : null,
    "#[0-9a-fA-F]{3,8}\\b",
    "\\\"(?:\\\\.|[^\\\"\\\\])*\\\"|'(?:\\\\.|[^'\\\\])*'|`(?:\\\\.|[^`\\\\])*`",
    "\\b\\d+(?:\\.\\d+)?\\b",
    language === "css" ? "[A-Za-z_-]+(?=\\s*:)" : null,
    "\\b[A-Za-z_$][\\w$]*(?=\\s*\\()",
    "\\b[A-Za-z_$][\\w$]*\\b",
  ].filter(Boolean).join("|");
  const tokenPattern = new RegExp(pattern, "gm");
  let output = "";
  let lastIndex = 0;
  let match;
  while ((match = tokenPattern.exec(String(source || "")))) {
    output += escapeHtml(String(source || "").slice(lastIndex, match.index));
    const token = match[0];
    let tokenClass = "syntax-plain";
    if (language === "html" && /^<\/?[A-Za-z]/.test(token)) tokenClass = "syntax-tag";
    else if (/^(\/\/|\/\*|#)/.test(token) && !(language === "css" && /^#[0-9a-f]/i.test(token))) tokenClass = "syntax-comment";
    else if (/^(\"|'|`)/.test(token)) tokenClass = "syntax-string";
    else if (/^#?[0-9a-f]+$/i.test(token) || /^\d/.test(token)) tokenClass = "syntax-number";
    else if (syntaxKeywords.has(token)) tokenClass = "syntax-keyword";
    else if (/^[A-Za-z_$][\w$]*$/.test(token) && new RegExp(`\\b${token}\\b\\s*\\(`).test(String(source || "").slice(Math.max(0, match.index - 1)))) tokenClass = "syntax-function";
    else if (language === "css" && /[A-Za-z_-]/.test(token)) tokenClass = "syntax-property";
    output += `<span class="${tokenClass}">${escapeHtml(token)}</span>`;
    lastIndex = match.index + token.length;
  }
  output += escapeHtml(String(source || "").slice(lastIndex));
  return output || " ";
}

function getCodeLanguage(slug) {
  return codeLanguageBySlug[slug] || "text";
}

function buildPlaygroundDocument(language, code) {
  const safeCode = String(code || "");
  const instrumentation = `<script>
    (() => {
      const report = (type, payload = {}) => window.parent.postMessage({ source: "campusflow-playground", type, ...payload }, "*");
      const stringify = (value) => {
        try { return typeof value === "string" ? value : JSON.stringify(value, null, 2); }
        catch { return String(value); }
      };
      const originalLog = console.log.bind(console);
      console.log = (...values) => { report("log", { message: values.map(stringify).join(" ") }); originalLog(...values); };
      window.addEventListener("error", (event) => report("error", { message: event.message + " (" + event.lineno + ":" + event.colno + ")" }));
      window.addEventListener("unhandledrejection", (event) => report("error", { message: stringify(event.reason) }));
      report("ready");
    })();
  <\/script>`;

  if (language === "html") {
    const normalized = safeCode.replace(/<\/script/gi, "<\\/script");
    if (/<(?:!doctype|html)[\s>]/i.test(normalized)) {
      return normalized.replace(/<\/body>/i, `${instrumentation}</body>`);
    }
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${instrumentation}${normalized}</body></html>`;
  }

  if (language === "css") {
    const normalized = safeCode.replace(/<\/style/gi, "<\\/style");
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
      body { font-family: Inter, system-ui, sans-serif; margin: 0; padding: 1rem; color: #17335b; background: #fff; }
      .playground-card { border: 1px solid #d8e4f2; border-radius: 14px; padding: 1rem; }
      .playground-card button { border: 0; border-radius: 10px; padding: .7rem 1rem; color: #fff; background: linear-gradient(135deg, #2858d5, #229ed9); box-shadow: 0 8px 18px rgba(40,88,213,.22); cursor: pointer; font: 700 .9rem/1.2 Inter, system-ui, sans-serif; transition: transform .18s ease, box-shadow .18s ease, filter .18s ease; }
      .playground-card button:hover { filter: brightness(1.05); transform: translateY(-2px); box-shadow: 0 12px 24px rgba(40,88,213,.28); }
      .playground-card button:focus-visible { outline: 3px solid rgba(34,158,217,.35); outline-offset: 3px; }
    ${normalized}
    </style></head><body><div class="playground-card"><h2>Live CSS preview</h2><p>Edit the CSS to change this card.</p><button>Example button</button></div>${instrumentation}</body></html>`;
  }

  const normalized = safeCode.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
    body { font-family: Inter, system-ui, sans-serif; margin: 0; padding: 1rem; color: #17335b; background: #fff; }
    button { border: 0; border-radius: 10px; padding: .65rem .85rem; color: #fff; background: #2858d5; cursor: pointer; }
  </style></head><body><div id="app"><h2 id="message">JavaScript preview</h2><p id="status" role="status">Ready to run.</p><button id="run-demo" type="button">Demo action</button></div>${instrumentation}<script>${normalized}</script></body></html>`;
}

function CodePlayground({ course, lesson }) {
  const { language: uiLanguage } = useLanguage();
  const copy = getReaderText(uiLanguage);
  const language = getCodeLanguage(course.slug);
  const canRunInBrowser = browserRunnableLanguages.has(language);
  const canRunOnServer = serverRunnableLanguages.has(language);
  const [draftCode, setDraftCode] = useState(lesson.code || "");
  const [runCode, setRunCode] = useState(lesson.code || "");
  const [runKey, setRunKey] = useState(0);
  const [autoRun, setAutoRun] = useState(canRunInBrowser);
  const [messages, setMessages] = useState([]);
  const [serverResult, setServerResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const highlightRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    setDraftCode(lesson.code || "");
    setRunCode(lesson.code || "");
    setRunKey((current) => current + 1);
    setMessages([]);
    setServerResult(null);
    setIsRunning(false);
    setAutoRun(canRunInBrowser);
  }, [lesson.id, lesson.code, canRunInBrowser]);

  useEffect(() => {
    const receiveMessage = (event) => {
      if (event.data?.source !== "campusflow-playground") return;
      if (event.data.type === "ready") return;
      setMessages((current) => [...current.slice(-7), { type: event.data.type, message: event.data.message || "" }]);
    };
    window.addEventListener("message", receiveMessage);
    return () => window.removeEventListener("message", receiveMessage);
  }, []);

  useEffect(() => {
    if (!canRunInBrowser || !autoRun) return undefined;
    const timer = window.setTimeout(() => {
      setRunCode(draftCode);
      setMessages([]);
      setRunKey((current) => current + 1);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [autoRun, canRunInBrowser, draftCode]);

  const syncEditorScroll = (event) => {
    if (!highlightRef.current) return;
    highlightRef.current.scrollTop = event.currentTarget.scrollTop;
    highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
  };

  const run = async () => {
    setMessages([]);
    setServerResult(null);
    if (canRunInBrowser) {
      setRunCode(draftCode);
      setRunKey((current) => current + 1);
      return;
    }
    if (!canRunOnServer) {
      setMessages([{ type: "info", message: copy.secureRunnerMessage(language) }]);
      return;
    }
    setIsRunning(true);
    try {
      const response = await api.post("/code/run", { language, code: draftCode });
      const result = response.data?.data ?? response.data;
      setServerResult(result);
    } catch (error) {
      setMessages([{ type: "error", message: error?.response?.data?.message || error?.message || copy.runnerUnavailable }]);
    } finally {
      setIsRunning(false);
    }
  };

  const reset = () => {
    setDraftCode(lesson.code || "");
    setRunCode(lesson.code || "");
    setMessages([]);
    setServerResult(null);
    setRunKey((current) => current + 1);
  };

  const handleEditorKeyDown = (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const target = event.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const next = `${draftCode.slice(0, start)}  ${draftCode.slice(end)}`;
      setDraftCode(next);
      window.requestAnimationFrame(() => {
        target.selectionStart = start + 2;
        target.selectionEnd = start + 2;
      });
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void run();
    }
  };

  const serverOutput = serverResult && [
    serverResult.compile?.stderr,
    serverResult.compile?.stdout,
    serverResult.run?.stdout,
    serverResult.run?.stderr,
    serverResult.compile?.message,
    serverResult.run?.message,
    serverResult.run?.code !== null && serverResult.run?.code !== undefined ? `Exit code: ${serverResult.run.code}` : "",
  ].filter(Boolean).join("\n");

  return (
    <section className="course-playground" aria-label={copy.codePlayground}>
      <div className="course-playground-heading">
        <div><p className="course-panel-eyebrow">{copy.interactiveCoding}</p><h3>{copy.writeAndRun}</h3></div>
        <span className={`course-playground-status ${canRunInBrowser || canRunOnServer ? "is-ready" : "is-server"}`}>
          {canRunInBrowser ? copy.browserSandbox : canRunOnServer ? copy.secureRunnerReady : copy.secureRunnerNeeded}
        </span>
      </div>
      <div className="course-playground-toolbar">
        <span className="course-playground-language">{language}</span>
        <div className="course-playground-actions">
          {canRunInBrowser && <label className="course-live-toggle"><input type="checkbox" checked={autoRun} onChange={(event) => setAutoRun(event.target.checked)} /> {copy.live}</label>}
          <span className="course-syntax-badge">{copy.syntaxOn}</span>
          <button type="button" onClick={reset}>{copy.reset}</button>
          <button type="button" className="is-primary" onClick={() => void run()} disabled={isRunning}>
            {isRunning ? copy.running : canRunInBrowser || canRunOnServer ? (canRunOnServer && !canRunInBrowser ? copy.compileAndRun : copy.run) : copy.checkRunner}
          </button>
        </div>
      </div>
      <div className="course-playground-editor-shell">
        <pre ref={highlightRef} className="course-playground-highlight" aria-hidden="true"><code dangerouslySetInnerHTML={{ __html: highlightCode(draftCode, language) }} /></pre>
        <textarea
          ref={editorRef}
          className="course-playground-editor"
          value={draftCode}
          onChange={(event) => setDraftCode(event.target.value)}
          onScroll={syncEditorScroll}
          onKeyDown={handleEditorKeyDown}
          spellCheck="false"
          aria-label={copy.editCode(language)}
        />
      </div>
      <div className="course-playground-output-heading"><span>{copy.result}</span><small>{copy.runShortcut}</small></div>
      {canRunInBrowser ? (
        <iframe
          key={`${lesson.id}-${runKey}`}
          className="course-playground-frame"
          title={`${course.title} live result`}
          sandbox="allow-scripts"
          srcDoc={buildPlaygroundDocument(language, runCode)}
        />
      ) : canRunOnServer && serverResult ? (
        <pre className="course-playground-server-output" role="status">{serverOutput || copy.outputEmpty}</pre>
      ) : (
        <div className="course-playground-unavailable" role="status">
          <strong>{canRunOnServer ? copy.editorReady : copy.secureRunnerNeeded}</strong>
          <p>{canRunOnServer ? copy.editorReadyBody(language) : copy.secureRunnerMessage(language)}</p>
        </div>
      )}
      {messages.length > 0 && <div className="course-playground-console" role="status"><strong>{copy.console}</strong>{messages.map((entry, index) => <div className={entry.type === "error" ? "is-error" : ""} key={`${entry.type}-${index}`}>{entry.type === "error" ? `${copy.error}: ` : entry.type === "info" ? `${copy.info}: ` : ""}{entry.message}</div>)}</div>}
    </section>
  );
}

export default function CourseReader() {
  const { slug = "html" } = useParams();
  const { language } = useLanguage();
  const copy = getReaderText(language);
  const sourceCourse = courseCatalog[slug] || courseCatalog.html;
  const course = useMemo(() => localizeCourseForLanguage(sourceCourse, language), [sourceCourse, language]);
  const isReferenceCourse = Boolean(referenceCourseCatalog[slug]);
  const courseSections = course.lessons;
  const courseLessons = useMemo(() => courseSections.flatMap((section) => section.items), [courseSections]);
  const [selectedId, setSelectedId] = useState(courseLessons[0].id);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [completed, setCompleted] = useState(() => new Set());
  const [copied, setCopied] = useState("");
  const techBarRef = useRef(null);
  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);

  const selectedLesson = useMemo(
    () => courseLessons.find((lesson) => lesson.id === selectedId) || courseLessons[0],
    [courseLessons, selectedId],
  );
  const selectedIndex = courseLessons.findIndex((lesson) => lesson.id === selectedLesson.id);
  const previousLesson = courseLessons[selectedIndex - 1];
  const nextLesson = courseLessons[selectedIndex + 1];

  useEffect(() => {
    setSelectedId(courseLessons[0].id);
    setCompleted(new Set());
    setCopied("");
    leftPanelRef.current?.scrollTo({ top: 0, behavior: "auto" });
    rightPanelRef.current?.scrollTo({ top: 0, behavior: "auto" });
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  useEffect(() => {
    document.body.classList.add("course-reader-active");
    return () => document.body.classList.remove("course-reader-active");
  }, []);

  useEffect(() => {
    const closeDrawers = (event) => {
      if (event.key === "Escape") {
        setLeftOpen(false);
        setRightOpen(false);
      }
    };
    window.addEventListener("keydown", closeDrawers);
    return () => window.removeEventListener("keydown", closeDrawers);
  }, []);

  const selectLesson = (lesson) => {
    setSelectedId(lesson.id);
    setCopied("");
    setLeftOpen(false);
    setRightOpen(false);
    window.requestAnimationFrame(() => rightPanelRef.current?.scrollTo({ top: 0, behavior: "auto" }));
    if (isReferenceCourse) {
      window.requestAnimationFrame(() => document.getElementById(`course-lesson-${lesson.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const copyCode = async (code = selectedLesson.code, lessonId = selectedLesson.id) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(lessonId);
      window.setTimeout(() => setCopied((current) => (current === lessonId ? "" : current)), 1600);
    } catch {
      setCopied("");
    }
  };

  const toggleCompleted = (lessonId = selectedLesson.id) => {
    setCompleted((current) => {
      const next = new Set(current);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  const moveTechBar = (amount) => {
    techBarRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  const renderTechnologyLink = ([name, color]) => {
    const courseSlug = technologyCourseSlugs[name] || "html";
    const label = <><i style={{ backgroundColor: color }} />{language === "km" ? getKhmerCourseTitle(name) : name}</>;
    return <Link className="course-tech-pill" to={`/course/${courseSlug}`} key={name}>{label}</Link>;
  };

  return (
    <div className="course-reader">
      <Seo
        title={`${course.title} Course | CampusFlow LMS`}
        description={course.description}
        path={`/course/${course.slug}`}
      />

      <div className="course-techbar course-techbar-before-header" aria-label={copy.availableTechnologies} aria-hidden="true">
        <button type="button" className="course-techbar-arrow" onClick={() => moveTechBar(-240)} aria-label={copy.scrollTechnologiesLeft}>‹</button>
        <div className="course-techbar-track" ref={techBarRef}>
          {technologies.map(renderTechnologyLink)}
        </div>
        <button type="button" className="course-techbar-arrow" onClick={() => moveTechBar(240)} aria-label={copy.scrollTechnologiesRight}>›</button>
      </div>

      <header className="course-reader-header">
        <div className="course-reader-brand">
          <Link to="/" className="course-reader-logo" aria-label={copy.home}><BrandLogo alt="" /></Link>
          <div>
            <p className="course-reader-kicker">CampusFlow Academy</p>
            <h1>{copy.courseTitle(course.title)}</h1>
          </div>
        </div>
        <nav className="course-reader-nav" aria-label="CampusFlow navigation">
          <a className="course-reader-nav-academy" href="/courses#courses">{copy.academy}</a>
          <a href="/courses#courses">{copy.browseCourses}</a>
          <Link to="/community">{copy.community}</Link>
          <Link to="/about">{copy.about}</Link>
          <a href="/#faq">{copy.faq}</a>
          <Link to="/contact">{copy.contact}</Link>
        </nav>
        <div className="course-reader-header-actions">
          <LanguageSwitcher variant="course" />
          <Link className="course-reader-back" to="/courses">{copy.backToCourses}</Link>
          <ThemeSwitch />
          <button type="button" className="course-mobile-action" onClick={() => setLeftOpen(true)} aria-label={copy.openLessonMenu}>☰ <span>{copy.lessons}</span></button>
          <button type="button" className="course-mobile-action" onClick={() => setRightOpen(true)} aria-label={copy.openPreview}>▣ <span>{copy.preview}</span></button>
        </div>
      </header>

      <div className="course-techbar" aria-label={copy.availableTechnologies}>
        <button type="button" className="course-techbar-arrow" onClick={() => moveTechBar(-240)} aria-label={copy.scrollTechnologiesLeft}>&lsaquo;</button>
        <div className="course-techbar-track" ref={techBarRef}>
          {technologies.map(renderTechnologyLink)}
        </div>
        <button type="button" className="course-techbar-arrow" onClick={() => moveTechBar(240)} aria-label={copy.scrollTechnologiesRight}>&rsaquo;</button>
      </div>

      <div className={`course-reader-backdrop ${(leftOpen || rightOpen) ? "is-visible" : ""}`} onClick={() => { setLeftOpen(false); setRightOpen(false); }} aria-hidden="true" />

      <div className="course-reader-layout">
         <aside ref={leftPanelRef} className={`course-lessons-panel ${leftOpen ? "is-open" : ""}`} aria-label={`${course.title} ${copy.lessons}`}>
          <div className="course-panel-heading">
            <div><p className="course-panel-eyebrow">{copy.courseOutline}</p><h2>{course.title} {copy.lessons}</h2></div>
            <button type="button" className="course-drawer-close" onClick={() => setLeftOpen(false)} aria-label={copy.closeLessonMenu}>×</button>
          </div>
          <div className="course-progress-row"><span>{completed.size}/{courseLessons.length} {copy.complete}</span><span>{Math.round((completed.size / courseLessons.length) * 100)}%</span></div>
          <div className="course-progress"><span style={{ width: `${(completed.size / courseLessons.length) * 100}%` }} /></div>
          <nav className="course-outline">
            {courseSections.map((section) => (
              <div className="course-outline-section" key={section.number}>
                <div className={`course-outline-heading ${section.items.some((item) => item.id === selectedLesson.id) ? "is-active" : ""}`}>
                  <span className="course-section-number">{section.number}</span>
                  <span>{section.title}</span>
                  <span className="course-section-chevron">›</span>
                </div>
                <div className="course-outline-items">
                  {section.items.map((lesson) => (
                    <button type="button" key={lesson.id} onClick={() => selectLesson(lesson)} className={`course-outline-item ${lesson.id === selectedLesson.id ? "is-selected" : ""}`}>
                      <span className={`course-outline-dot ${completed.has(lesson.id) ? "is-complete" : ""}`} />
                      <span>{lesson.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="course-sidebar-note"><span>♥</span><p>{copy.learnAtYourOwnPace}</p></div>
        </aside>

        <main className="course-reader-main">
          <div className="course-reader-mobile-toolbar">
            <button type="button" onClick={() => setLeftOpen(true)}>☰ <span>{copy.lessons}</span></button>
            <span>{course.title} / {selectedLesson.label}</span>
            <button type="button" onClick={() => setRightOpen(true)}>▣ <span>{copy.preview}</span></button>
          </div>
          {isReferenceCourse ? (
            <article className="course-lesson-article course-reference-article">
              <div className="course-breadcrumb"><Link to="/courses">{copy.courses}</Link><span>/</span><strong>{course.title}</strong></div>
              <div className="course-reference-note">{copy.referenceNote}</div>
              {courseLessons.map((lesson, index) => (
                <section className="course-reference-lesson" id={`course-lesson-${lesson.id}`} key={lesson.id}>
                  <div className="course-lesson-meta"><span>{copy.lessonProgress(index + 1, courseLessons.length)}</span><span>{copy.beginner}</span></div>
                  <h2>{lesson.heading}</h2>
                  <p className="course-lesson-lead" style={{ whiteSpace: "pre-line" }}>{lesson.intro}</p>
                  <section className="course-lesson-section">
                    <h3>{lesson.bodyHeading}</h3>
                    <p style={{ whiteSpace: "pre-line" }}>{lesson.body}</p>
                    <div className="course-code-wrap">
                      <div className="course-code-toolbar"><span><i /> <i /> <i /></span><span>{course.codeLabel}</span><button type="button" onClick={() => copyCode(lesson.code, lesson.id)}>{copied === lesson.id ? copy.copied : copy.copy}</button></div>
                      <pre><code>{lesson.code}</code></pre>
                    </div>
                  </section>
                  <div className="course-lesson-actions">
                    <button type="button" className={`course-complete-button ${completed.has(lesson.id) ? "is-complete" : ""}`} onClick={() => toggleCompleted(lesson.id)}>{completed.has(lesson.id) ? copy.completed : copy.markAsComplete}</button>
                  </div>
                </section>
              ))}
            </article>
          ) : (
          <article className="course-lesson-article">
            <div className="course-breadcrumb"><Link to="/courses">{copy.courses}</Link><span>/</span><span>{course.title}</span><span>/</span><strong>{selectedLesson.label}</strong></div>
            <div className="course-lesson-meta"><span>{copy.lessonProgress(selectedIndex + 1, courseLessons.length)}</span><span>⌁ {copy.beginner}</span></div>
            <h2>{selectedLesson.heading}</h2>
            <p className="course-lesson-lead">{selectedLesson.intro}</p>

            <section className="course-lesson-section">
              <h3>{selectedLesson.bodyHeading}</h3>
              <p>{selectedLesson.body}</p>
              <div className="course-code-wrap">
                <div className="course-code-toolbar"><span><i /> <i /> <i /></span><span>{course.codeLabel}</span><button type="button" onClick={copyCode}>{copied === selectedLesson.id ? copy.copied : copy.copy}</button></div>
                <pre><code>{selectedLesson.code}</code></pre>
              </div>
            </section>

            <div className="course-lesson-tip"><span>!</span><p><strong>{language === "km" ? "ការអនុវត្តល្អ៖" : "Good practice:"}</strong> {course.tip}</p></div>

            <div className="course-lesson-actions">
              <button type="button" className={`course-complete-button ${completed.has(selectedLesson.id) ? "is-complete" : ""}`} onClick={toggleCompleted}>{completed.has(selectedLesson.id) ? `✓ ${copy.completed}` : copy.markAsComplete}</button>
              <div className="course-prev-next">
                {previousLesson ? <button type="button" onClick={() => selectLesson(previousLesson)}><small>← {copy.previous}</small><span>{previousLesson.label}</span></button> : <span />}
                {nextLesson ? <button type="button" onClick={() => selectLesson(nextLesson)}><small>{copy.next} →</small><span>{nextLesson.label}</span></button> : <span />}
              </div>
            </div>
          </article>
          )}
        </main>

        <aside ref={rightPanelRef} className={`course-preview-panel ${rightOpen ? "is-open" : ""}`} aria-label={copy.openPreview}>
          <CodePlayground course={course} lesson={selectedLesson} />
          <div className="course-panel-heading"><div><p className="course-panel-eyebrow">{copy.liveExample}</p><h2>{copy.preview}</h2></div><button type="button" className="course-drawer-close" onClick={() => setRightOpen(false)} aria-label={copy.closePreview}>×</button></div>
          <div className="course-preview-code"><div className="course-preview-code-bar"><span>{course.title}</span><span>● ● ●</span></div><pre><code>{selectedLesson.code}</code></pre></div>
          <div className="course-preview-label">{copy.renderedResult}</div>
          <div className="course-rendered-preview"><h3>{selectedLesson.preview.title}</h3><p>{selectedLesson.preview.body}</p><span className="course-preview-link">CampusFlow LMS</span></div>
          <div className="course-preview-help"><strong>{copy.tryItYourself}</strong><p>{copy.tryItYourselfBody}</p></div>
        </aside>
      </div>
      <SiteFooter />
      <footer className="course-reader-footer"><span>CampusFlow LMS</span><span>{copy.practiceEveryDay}</span></footer>
    </div>
  );
}

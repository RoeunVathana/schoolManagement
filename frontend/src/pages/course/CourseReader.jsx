import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import Seo from "../../components/Seo";
import ThemeSwitch from "../../components/ThemeSwitch";

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
];

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
};

const technologyCourseSlugs = {
  HTML: "html",
  CSS: "css",
  JavaScript: "javascript",
  React: "react",
  "Tailwind CSS": "tailwindcss",
};

export default function CourseReader() {
  const { slug = "html" } = useParams();
  const course = courseCatalog[slug] || courseCatalog.html;
  const courseSections = course.lessons;
  const courseLessons = useMemo(() => courseSections.flatMap((section) => section.items), [courseSections]);
  const [selectedId, setSelectedId] = useState(courseLessons[0].id);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [completed, setCompleted] = useState(() => new Set());
  const [copied, setCopied] = useState(false);
  const techBarRef = useRef(null);

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
    setCopied(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [courseLessons, slug]);

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
    setCopied(false);
    setLeftOpen(false);
    setRightOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(selectedLesson.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const toggleCompleted = () => {
    setCompleted((current) => {
      const next = new Set(current);
      if (next.has(selectedLesson.id)) next.delete(selectedLesson.id);
      else next.add(selectedLesson.id);
      return next;
    });
  };

  const moveTechBar = (amount) => {
    techBarRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="course-reader">
      <Seo
        title={`${course.title} Course | CampusFlow LMS`}
        description={course.description}
        path={`/course/${course.slug}`}
      />

      <div className="course-techbar" aria-label="Available technologies">
        <button type="button" className="course-techbar-arrow" onClick={() => moveTechBar(-240)} aria-label="Scroll technologies left">‹</button>
        <div className="course-techbar-track" ref={techBarRef}>
          {technologies.map(([name, color]) => <Link className="course-tech-pill" to={`/course/${technologyCourseSlugs[name] || "html"}`} key={name}><i style={{ backgroundColor: color }} />{name}</Link>)}
        </div>
        <button type="button" className="course-techbar-arrow" onClick={() => moveTechBar(240)} aria-label="Scroll technologies right">›</button>
      </div>

      <header className="course-reader-header">
        <div className="course-reader-brand">
          <Link to="/" className="course-reader-logo" aria-label="CampusFlow home"><BrandLogo alt="" /></Link>
          <div>
            <p className="course-reader-kicker">CampusFlow Academy</p>
            <h1>{course.title} Course</h1>
          </div>
        </div>
        <div className="course-reader-header-actions">
          <Link className="course-reader-back" to="/courses">Back to courses</Link>
          <ThemeSwitch />
          <button type="button" className="course-mobile-action" onClick={() => setLeftOpen(true)} aria-label="Open lesson menu">☰ <span>Lessons</span></button>
          <button type="button" className="course-mobile-action" onClick={() => setRightOpen(true)} aria-label="Open example preview">▣ <span>Preview</span></button>
        </div>
      </header>

      <div className={`course-reader-backdrop ${(leftOpen || rightOpen) ? "is-visible" : ""}`} onClick={() => { setLeftOpen(false); setRightOpen(false); }} aria-hidden="true" />

      <div className="course-reader-layout">
        <aside className={`course-lessons-panel ${leftOpen ? "is-open" : ""}`} aria-label="Course lessons">
          <div className="course-panel-heading">
            <div><p className="course-panel-eyebrow">Course outline</p><h2>{course.title} Lessons</h2></div>
            <button type="button" className="course-drawer-close" onClick={() => setLeftOpen(false)} aria-label="Close lesson menu">×</button>
          </div>
          <div className="course-progress-row"><span>{completed.size}/{courseLessons.length} complete</span><span>{Math.round((completed.size / courseLessons.length) * 100)}%</span></div>
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
          <div className="course-sidebar-note"><span>♥</span><p>Learn at your own pace. Your progress stays on this device.</p></div>
        </aside>

        <main className="course-reader-main">
          <div className="course-reader-mobile-toolbar">
            <button type="button" onClick={() => setLeftOpen(true)}>☰ <span>Lessons</span></button>
            <span>{course.title} / {selectedLesson.label}</span>
            <button type="button" onClick={() => setRightOpen(true)}>▣ <span>Preview</span></button>
          </div>
          <article className="course-lesson-article">
            <div className="course-breadcrumb"><Link to="/courses">Courses</Link><span>/</span><span>{course.title}</span><span>/</span><strong>{selectedLesson.label}</strong></div>
            <div className="course-lesson-meta"><span>Lesson {selectedIndex + 1} of {courseLessons.length}</span><span>⌁ Beginner</span></div>
            <h2>{selectedLesson.heading}</h2>
            <p className="course-lesson-lead">{selectedLesson.intro}</p>

            <section className="course-lesson-section">
              <h3>{selectedLesson.bodyHeading}</h3>
              <p>{selectedLesson.body}</p>
              <div className="course-code-wrap">
                <div className="course-code-toolbar"><span><i /> <i /> <i /></span><span>{course.codeLabel}</span><button type="button" onClick={copyCode}>{copied ? "Copied" : "Copy"}</button></div>
                <pre><code>{selectedLesson.code}</code></pre>
              </div>
            </section>

            <div className="course-lesson-tip"><span>!</span><p><strong>Good practice:</strong> {course.tip}</p></div>

            <div className="course-lesson-actions">
              <button type="button" className={`course-complete-button ${completed.has(selectedLesson.id) ? "is-complete" : ""}`} onClick={toggleCompleted}>{completed.has(selectedLesson.id) ? "✓ Completed" : "Mark as complete"}</button>
              <div className="course-prev-next">
                {previousLesson ? <button type="button" onClick={() => selectLesson(previousLesson)}><small>← Previous</small><span>{previousLesson.label}</span></button> : <span />}
                {nextLesson ? <button type="button" onClick={() => selectLesson(nextLesson)}><small>Next →</small><span>{nextLesson.label}</span></button> : <span />}
              </div>
            </div>
          </article>
          <footer className="course-reader-footer"><span>CampusFlow LMS</span><span>Practice a little every day.</span></footer>
        </main>

        <aside className={`course-preview-panel ${rightOpen ? "is-open" : ""}`} aria-label="Lesson example preview">
          <div className="course-panel-heading"><div><p className="course-panel-eyebrow">Live example</p><h2>Preview</h2></div><button type="button" className="course-drawer-close" onClick={() => setRightOpen(false)} aria-label="Close preview">×</button></div>
          <div className="course-preview-code"><div className="course-preview-code-bar"><span>{course.title}</span><span>● ● ●</span></div><pre><code>{selectedLesson.code}</code></pre></div>
          <div className="course-preview-label">Rendered result:</div>
          <div className="course-rendered-preview"><h3>{selectedLesson.preview.title}</h3><p>{selectedLesson.preview.body}</p><span className="course-preview-link">CampusFlow LMS</span></div>
          <div className="course-preview-help"><strong>Try it yourself</strong><p>Read the example, then change the code in your own editor to see what happens.</p></div>
        </aside>
      </div>
    </div>
  );
}

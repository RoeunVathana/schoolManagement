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

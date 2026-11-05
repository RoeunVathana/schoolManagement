import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import BrandLogo from "../../components/BrandLogo";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import PublicNavIcon from "../../components/PublicNavIcon";
import ThemeSwitch from "../../components/ThemeSwitch";
import { useLanguage } from "../../context/LanguageContext";
import LabLogo from "./LabLogo";
import "./programming-lab.css";

const LAB_STORAGE_PREFIX = "campusflow_programming_lab_";
const CURRENT_LANGUAGE_KEY = `${LAB_STORAGE_PREFIX}current`;

export const LABS = [
  { id: "javascript", label: "JavaScript", icon: "JS", kind: "browser", extension: "js", starter: `// JavaScript Lab - write and run JavaScript code\nconsole.log("Welcome to JavaScript Lab!");\n\nconst name = "Developer";\nconst age = 25;\nconsole.log("Name:", name);\nconsole.log("Age:", age);` },
  { id: "python", label: "Python", icon: "🐍", kind: "server", extension: "py", starter: `# Python Lab - write and run Python code\nname = "Developer"\nage = 25\nprint("Welcome to Python Lab!")\nprint("Name:", name)\nprint("Age:", age)` },
  { id: "php", label: "PHP", icon: "PHP", kind: "server", extension: "php", starter: `<?php\n$name = "Developer";\n$age = 25;\necho "Welcome to PHP Lab!\\n";\necho "Name: $name\\n";\necho "Age: $age";` },
  { id: "c", label: "C", icon: "C", kind: "server", extension: "c", starter: `#include <stdio.h>\n\nint main(void) {\n    printf("Welcome to C Lab!\\n");\n    return 0;\n}` },
  { id: "cpp", label: "C++", icon: "C++", kind: "server", extension: "cpp", starter: `#include <iostream>\n\nint main() {\n    std::cout << "Welcome to C++ Lab!" << std::endl;\n    return 0;\n}` },
  { id: "html", label: "HTML/CSS", icon: "HTML", kind: "html", extension: "html", starter: `<!doctype html>\n<html>\n  <body>\n    <h1 id="title">Hello, CampusFlow!</h1>\n    <p>Change this HTML and click Run.</p>\n  </body>\n</html>` },
  { id: "css", label: "CSS", icon: "CSS", kind: "css", extension: "css", starter: `.card {\n  padding: 24px;\n  border-radius: 16px;\n  background: linear-gradient(135deg, #2563eb, #14b8a6);\n  color: white;\n  font: 700 24px/1.3 system-ui;\n}` },
  { id: "csharp", label: "C#", icon: "C#", kind: "server", extension: "cs", starter: `using System;\n\npublic class MainClass\n{\n    public static void Main()\n    {\n        Console.WriteLine("Welcome to C# Lab!");\n    }\n}` },
  { id: "java", label: "Java", icon: "Java", kind: "server", extension: "java", starter: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Welcome to Java Lab!");\n    }\n}` },
  { id: "kotlin", label: "Kotlin", icon: "K", kind: "server", extension: "kt", starter: `fun main() {\n    println("Welcome to Kotlin Lab!")\n}` },
  { id: "dart", label: "Dart", icon: "D", kind: "server", extension: "dart", starter: `void main() {\n  print('Welcome to Dart Lab!');\n}` },
  { id: "sql", label: "SQL", icon: "SQL", kind: "server", extension: "sql", starter: `CREATE TABLE students (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL\n);\n\nINSERT INTO students (name) VALUES ('CampusFlow');\nSELECT * FROM students;` },
  { id: "shell", label: "Shell", icon: "$_", kind: "server", extension: "sh", starter: `#!/bin/sh\necho "Welcome to Shell Lab!"\nname="Developer"\necho "Hello, $name"` },
];

const browserLanguages = new Set(["javascript", "html", "css"]);

const syntaxKeywords = new Set([
  "as", "async", "await", "break", "case", "catch", "class", "const", "continue", "def", "else", "export", "extends", "final", "for", "from", "function", "if", "implements", "import", "in", "interface", "let", "new", "null", "private", "protected", "public", "return", "static", "struct", "switch", "this", "throw", "try", "using", "var", "void", "while", "with", "yield", "true", "false", "None", "True", "False", "print", "echo", "fun", "val", "var", "SELECT", "FROM", "WHERE", "CREATE", "TABLE", "INSERT", "INTO", "VALUES",
]);

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function highlightCode(source, language) {
  const hashComments = new Set(["python", "shell", "sql", "c", "cpp"]);
  const pattern = [
    language === "html" ? "</?[A-Za-z][^>]*>" : null,
    "//[^\\n]*|/\\*[\\s\\S]*?\\*/",
    hashComments.has(language) ? "#[^\\n]*" : null,
    "#[0-9a-fA-F]{3,8}\\b",
    "\\\"(?:\\\\.|[^\\\"\\\\])*\\\"|'(?:\\\\.|[^'\\\\])*'|`(?:\\\\.|[^`\\\\])*`",
    "\\b\\d+(?:\\.\\d+)?\\b",
    language === "css" ? "[A-Za-z_-]+(?=\\s*:)" : null,
    "\\b[A-Za-z_$][\\w$]*(?=\\s*\\()",
    "\\b[A-Za-z_$][\\w$]*\\b",
  ].filter(Boolean).join("|");
  const tokenPattern = new RegExp(pattern, "gm");
  const input = String(source || "");
  let output = "";
  let lastIndex = 0;
  let match;
  while ((match = tokenPattern.exec(input))) {
    output += escapeHtml(input.slice(lastIndex, match.index));
    const token = match[0];
    let tokenClass = "syntax-plain";
    if (language === "html" && /^<\/?[A-Za-z]/.test(token)) tokenClass = "syntax-tag";
    else if (/^(\/\/|\/\*|#)/.test(token) && !(language === "css" && /^#[0-9a-f]/i.test(token))) tokenClass = "syntax-comment";
    else if (/^(\"|'|`)/.test(token)) tokenClass = "syntax-string";
    else if (/^#?[0-9a-f]+$/i.test(token) || /^\d/.test(token)) tokenClass = "syntax-number";
    else if (syntaxKeywords.has(token)) tokenClass = "syntax-keyword";
    else if (/^[A-Za-z_$][\w$]*$/.test(token) && /\b[A-Za-z_$][\w$]*\s*\(/.test(input.slice(Math.max(0, match.index - 1)))) tokenClass = "syntax-function";
    else if (language === "css") tokenClass = "syntax-property";
    output += `<span class="${tokenClass}">${escapeHtml(token)}</span>`;
    lastIndex = match.index + token.length;
  }
  output += escapeHtml(input.slice(lastIndex));
  return output || " ";
}

function previewDocument(language, code) {
  const safeCode = String(code || "").replace(/<\/script/gi, "<\\/script");
  const instrumentation = `<script>(() => { const report = (type, message = '') => parent.postMessage({ source: 'campusflow-lab', type, message }, '*'); const stringify = value => { try { return typeof value === 'string' ? value : JSON.stringify(value, null, 2); } catch { return String(value); } }; const log = console.log.bind(console); console.log = (...values) => { report('log', values.map(stringify).join(' ')); log(...values); }; window.addEventListener('error', event => report('error', event.message)); window.addEventListener('unhandledrejection', event => report('error', stringify(event.reason))); report('ready'); })();<\\/script>`;
  if (language === "html") return safeCode.includes("<html") ? safeCode.replace(/<\/body>/i, `${instrumentation}</body>`) : `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${instrumentation}${safeCode}</body></html>`;
  if (language === "css") return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:24px;font-family:system-ui;color:#17335b;background:#fff}.card{border:1px solid #dbe7f2;border-radius:16px;padding:24px;min-height:90px}button{border:0;border-radius:10px;padding:10px 16px;background:#2563eb;color:#fff;font-weight:700}${safeCode}</style></head><body><div class="card"><h2>Live CSS preview</h2><p>Edit your CSS and click Run.</p><button>Example button</button></div></body></html>`;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;margin:0;padding:24px;color:#17335b}button{padding:10px 16px;border:0;border-radius:10px;background:#2563eb;color:white}</style></head><body><h2 id="message">JavaScript preview</h2><p id="status">Ready to run.</p><button id="demo">Demo action</button>${instrumentation}<script>${safeCode}</script></body></html>`;
}

function getStoredCode(id, starter) {
  try { return localStorage.getItem(`${LAB_STORAGE_PREFIX}${id}`) || starter; } catch { return starter; }
}

function readRunnerOutput(result) {
  if (!result) return "";
  return [result.compile?.stdout, result.compile?.stderr, result.compile?.message, result.run?.stdout, result.run?.stderr, result.run?.message, result.run?.code !== null && result.run?.code !== undefined ? `Exit code: ${result.run.code}` : ""].filter(Boolean).join("\n");
}

export default function ProgrammingLab() {
  const { language: uiLanguage } = useLanguage();
  const isKhmer = uiLanguage === "km";
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get("language") || localStorage.getItem(CURRENT_LANGUAGE_KEY) || "javascript");
  const [draftCode, setDraftCode] = useState("");
  const [runCode, setRunCode] = useState("");
  const [runKey, setRunKey] = useState(0);
  const [runtimeMessages, setRuntimeMessages] = useState([]);
  const [serverResult, setServerResult] = useState(null);
  const [runnerStatus, setRunnerStatus] = useState({ checking: true, configured: false });
  const [isRunning, setIsRunning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLines, setShowLines] = useState(true);
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [outputFontSize, setOutputFontSize] = useState(13);
  const [outputHeight, setOutputHeight] = useState(240);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef(null);
  const highlightRef = useRef(null);
  const editorRef = useRef(null);
  const resizingRef = useRef(false);

  const selected = useMemo(() => LABS.find((item) => item.id === selectedId) || LABS[0], [selectedId]);

  useEffect(() => {
    const stored = getStoredCode(selected.id, selected.starter);
    setDraftCode(stored);
    setRunCode(stored);
    setRuntimeMessages([]);
    setServerResult(null);
    localStorage.setItem(CURRENT_LANGUAGE_KEY, selected.id);
    setRunnerStatus({ checking: selected.kind === "server", configured: false });
    if (selected.kind !== "server") return undefined;
    let active = true;
    api.get("/code/status").then((response) => {
      if (!active) return;
      const status = response.data?.data ?? response.data;
      setRunnerStatus({ checking: false, configured: Boolean(status?.configured) });
    }).catch(() => { if (active) setRunnerStatus({ checking: false, configured: false }); });
    return () => { active = false; };
  }, [selected]);

  useEffect(() => {
    const receiveMessage = (event) => {
      if (event.data?.source !== "campusflow-lab" || event.data.type === "ready") return;
      setRuntimeMessages((current) => [...current.slice(-49), { type: event.data.type, message: event.data.message || "" }]);
    };
    window.addEventListener("message", receiveMessage);
    return () => window.removeEventListener("message", receiveMessage);
  }, []);

  useEffect(() => {
    const move = (event) => {
      if (!resizingRef.current) return;
      const next = Math.max(140, Math.min(520, window.innerHeight - event.clientY));
      setOutputHeight(next);
    };
    const stop = () => { resizingRef.current = false; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
  }, []);

  const syncScroll = (event) => {
    if (!highlightRef.current) return;
    highlightRef.current.scrollTop = event.currentTarget.scrollTop;
    highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
  };

  const selectLab = (id) => {
    if (id === selected.id) { setSidebarOpen(false); return; }
    setSelectedId(id);
    setSidebarOpen(false);
  };

  const run = useCallback(async () => {
    const code = draftCode;
    localStorage.setItem(`${LAB_STORAGE_PREFIX}${selected.id}`, code);
    setRuntimeMessages([]);
    setServerResult(null);
    if (selected.kind === "browser" || selected.kind === "html" || selected.kind === "css") {
      setRunCode(code);
      setRunKey((current) => current + 1);
      if (selected.kind === "browser") setRuntimeMessages([{ type: "info", message: "Running in the browser sandbox..." }]);
      return;
    }
    if (runnerStatus.checking || !runnerStatus.configured) {
      setRuntimeMessages([{ type: "error", message: "Secure runner is not connected. Configure CODE_RUNNER_URL in production, then try again." }]);
      return;
    }
    setIsRunning(true);
    try {
      const response = await api.post("/code/run", { language: selected.id, code });
      const result = response.data?.data ?? response.data;
      setServerResult(result);
    } catch (error) {
      setRuntimeMessages([{ type: "error", message: error?.response?.data?.message || error?.message || "The secure runner is unavailable." }]);
    } finally {
      setIsRunning(false);
    }
  }, [draftCode, runnerStatus.checking, runnerStatus.configured, selected]);

  const reset = () => {
    setDraftCode(selected.starter);
    setRunCode(selected.starter);
    localStorage.setItem(`${LAB_STORAGE_PREFIX}${selected.id}`, selected.starter);
    setRuntimeMessages([]);
    setServerResult(null);
    setRunKey((current) => current + 1);
  };

  const copyCode = async () => {
    await navigator.clipboard?.writeText(draftCode);
    setRuntimeMessages([{ type: "info", message: isKhmer ? "បានចម្លងកូដរួចរាល់។" : "Code copied to your clipboard." }]);
  };

  const downloadCode = () => {
    const blob = new Blob([draftCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `campusflow-${selected.id}.${selected.extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const clearSavedData = () => {
    if (!window.confirm(isKhmer ? "លុបទិន្នន័យកូដដែលរក្សាទុកទាំងអស់?" : "Clear all saved lab code?")) return;
    LABS.forEach((lab) => localStorage.removeItem(`${LAB_STORAGE_PREFIX}${lab.id}`));
    reset();
  };

  const handleEditorKeyDown = (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const target = event.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      setDraftCode(`${draftCode.slice(0, start)}  ${draftCode.slice(end)}`);
      requestAnimationFrame(() => { target.selectionStart = start + 2; target.selectionEnd = start + 2; });
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void run();
    }
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await rootRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const output = readRunnerOutput(serverResult);
  const statusLabel = selected.kind === "browser" || selected.kind === "html" || selected.kind === "css"
    ? (isKhmer ? "ដំណើរការក្នុង Browser" : "Browser sandbox")
    : runnerStatus.checking
      ? (isKhmer ? "កំពុងពិនិត្យ Runner" : "Checking runner")
      : runnerStatus.configured
        ? (isKhmer ? "Secure runner រួចរាល់" : "Secure runner ready")
        : (isKhmer ? "ត្រូវការ Secure runner" : "Secure runner needed");

  return (
    <div ref={rootRef} className={`programming-lab ${isFullscreen ? "is-fullscreen" : ""}`}>
      <header className="lab-header">
        <button className="lab-icon-button lab-menu-button" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open programming labs">☰</button>
        <Link className="lab-brand" to="/">
          <span className="lab-brand-mark"><BrandLogo alt="" /></span>
          <span><small className="lab-brand-kicker">CampusFlow Academy</small><strong><span>Code</span>CampusFlow</strong><em>{isKhmer ? "មន្ទីរពិសោធន៍កូដ" : "Programming Lab"}</em></span>
        </Link>
        <nav className="lab-header-nav" aria-label="CampusFlow navigation">
          <Link className="is-active" to="/course/html"><PublicNavIcon name="academy" /><span>{isKhmer ? "សាលា CampusFlow" : "CampusFlow Academy"}</span></Link>
          <a href="/courses#courses"><PublicNavIcon name="library" /><span>{isKhmer ? "វគ្គសិក្សា" : "Browse courses"}</span></a>
          <Link to="/community"><PublicNavIcon name="community" /><span>{isKhmer ? "សហគមន៍" : "Community"}</span></Link>
          <Link to="/about"><PublicNavIcon name="about" /><span>{isKhmer ? "អំពីយើង" : "About"}</span></Link>
          <a href="/#faq"><PublicNavIcon name="faq" /><span>FAQ</span></a>
          <Link to="/contact"><PublicNavIcon name="contact" /><span>{isKhmer ? "ទំនាក់ទំនង" : "Contact"}</span></Link>
        </nav>
        <div className="lab-header-actions">
          <LanguageSwitcher variant="course" />
          <Link className="lab-back-link" to="/lab/library">{isKhmer ? "បណ្ណាល័យភាសា" : "Language library"}</Link>
          <Link className="lab-back-link" to="/academy">{isKhmer ? "ត្រឡប់ទៅវគ្គសិក្សា" : "Back to courses"}</Link>
          <ThemeSwitch />
          <span className="lab-current-language">{selected.label}</span>
        </div>
      </header>

      <div className="lab-techbar" aria-label="Programming subjects">
        <button type="button" onClick={() => setSidebarOpen(true)} className="lab-tech-arrow">‹</button>
        {LABS.map((lab) => <button type="button" className={lab.id === selected.id ? "is-active" : ""} key={lab.id} onClick={() => selectLab(lab.id)}><LabLogo lab={lab} />{lab.label}</button>)}
        <button type="button" onClick={() => setSidebarOpen(true)} className="lab-tech-arrow">›</button>
      </div>

      <div className="lab-layout">
        <aside className={`lab-sidebar ${sidebarOpen ? "is-open" : ""}`}>
          <div className="lab-sidebar-head"><div><span className="lab-sidebar-kicker">{isKhmer ? "មន្ទីរពិសោធន៍" : "PROGRAMMING LABS"}</span><h2>CodeCampus</h2></div><button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">×</button></div>
          <nav className="lab-list" aria-label="Programming labs">
            {LABS.map((lab) => <button type="button" className={lab.id === selected.id ? "is-selected" : ""} key={lab.id} onClick={() => selectLab(lab.id)}><span className={`lab-list-icon lab-icon-${lab.id}`}><LabLogo lab={lab} /></span><span><strong>{lab.label} Lab</strong><small>{lab.kind === "server" ? (isKhmer ? "សរសេរ និង Compile កូដ" : "Write and compile code") : (isKhmer ? "ដំណើរការក្នុង Browser" : "Run code in browser")}</small></span><b>›</b></button>)}
          </nav>
          <button type="button" className="lab-clear-data" onClick={clearSavedData}>🗑 <span>{isKhmer ? "លុបទិន្នន័យដែលរក្សាទុក" : "Clear all saved data"}</span></button>
        </aside>
        {sidebarOpen && <button className="lab-sidebar-backdrop" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" />}

        <main className="lab-workspace">
          <div className="lab-toolbar">
            <div className="lab-tool-title"><span className={`lab-language-badge lab-icon-${selected.id}`}><LabLogo lab={selected} /></span><strong>{selected.label} Lab</strong><small>.{selected.extension}</small></div>
            <div className="lab-toolbar-group"><span>Editor:</span><button type="button" onClick={() => setEditorFontSize((size) => Math.max(12, size - 1))} aria-label="Decrease editor font size">⌕</button><span>{editorFontSize}px</span><button type="button" onClick={() => setEditorFontSize((size) => Math.min(22, size + 1))} aria-label="Increase editor font size">⌕</button></div>
            <div className="lab-toolbar-group lab-output-font"><span>Output:</span><button type="button" onClick={() => setOutputFontSize((size) => Math.max(11, size - 1))} aria-label="Decrease output font size">⌕</button><span>{outputFontSize}px</span><button type="button" onClick={() => setOutputFontSize((size) => Math.min(20, size + 1))} aria-label="Increase output font size">⌕</button></div>
            <button type="button" className={`lab-toolbar-button ${showLines ? "is-active" : ""}`} onClick={() => setShowLines((show) => !show)}>↕ <span>Line</span></button>
            <button type="button" className="lab-toolbar-button lab-hide-mobile" onClick={() => setSidebarOpen(true)}>› <span>Sidebar</span></button>
            <button type="button" className="lab-toolbar-button lab-hide-mobile" onClick={() => void toggleFullscreen()} aria-label="Toggle fullscreen">⛶</button>
            <button type="button" className="lab-primary-button" onClick={() => void run()} disabled={isRunning}>▶ <span>{isRunning ? "Running..." : selected.kind === "server" ? "Compile & run" : "Run"}</span></button>
            <button type="button" className="lab-toolbar-button lab-hide-small" onClick={() => void copyCode()}>▣ <span>Copy</span></button>
            <button type="button" className="lab-toolbar-button lab-hide-small" onClick={downloadCode}>⇩ <span>Download</span></button>
            <button type="button" className="lab-toolbar-button lab-hide-small" onClick={reset}>↶ <span>Reset</span></button>
            <button type="button" className="lab-toolbar-button lab-hide-small" onClick={() => setDraftCode("")}>▰ <span>Clear</span></button>
            <button type="button" className="lab-toolbar-button lab-hide-small" onClick={() => { setRuntimeMessages([]); setServerResult(null); }}>⌫ <span>Clear output</span></button>
          </div>

          <section className="lab-editor-panel" aria-label="Code editor">
            <div className="lab-editor-label"><span>⌘ &nbsp; Editor</span><small>{isKhmer ? "ចុច Tab សម្រាប់ indent" : "Type code • Tab inserts spaces"} <em>✦ Smooth typing</em></small></div>
            <div className="lab-editor-shell" style={{ "--lab-editor-size": `${editorFontSize}px` }}>
              {showLines && <pre className="lab-line-numbers" aria-hidden="true">{draftCode.split("\n").map((_, index) => `${index + 1}\n`)}</pre>}
              <pre ref={highlightRef} className={`lab-highlight ${showLines ? "has-lines" : ""}`} aria-hidden="true"><code dangerouslySetInnerHTML={{ __html: highlightCode(draftCode, selected.id === "html" ? "html" : selected.id) }} /></pre>
              <textarea ref={editorRef} className={`lab-editor ${showLines ? "has-lines" : ""}`} style={{ fontSize: `${editorFontSize}px` }} value={draftCode} onChange={(event) => setDraftCode(event.target.value)} onScroll={syncScroll} onKeyDown={handleEditorKeyDown} spellCheck="false" aria-label={`${selected.label} code editor`} />
            </div>
          </section>

          <div className="lab-resize-bar" role="separator" aria-label="Resize output panel" onPointerDown={() => { resizingRef.current = true; }}><span>⠿</span></div>
          <section className="lab-output-panel" style={{ minHeight: outputHeight, fontSize: `${outputFontSize}px` }} aria-label="Output">
            <div className="lab-output-header"><strong>〉_ Console Output</strong><div><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}>↑ Top</button><button type="button" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" })}>↓ Bottom</button></div></div>
            <div className="lab-output-body">
              {selected.kind === "html" || selected.kind === "css" ? <iframe key={runKey} className="lab-preview-frame" title={`${selected.label} result`} sandbox="allow-scripts" srcDoc={previewDocument(selected.id, runCode)} /> : selected.kind === "browser" ? <><iframe key={runKey} className="lab-run-frame" title="JavaScript sandbox" sandbox="allow-scripts" srcDoc={previewDocument("javascript", runCode)} /><pre className="lab-console-text">{runtimeMessages.length ? runtimeMessages.map((entry) => `${entry.type === "error" ? "✖" : "›"} ${entry.message}`).join("\n") : "Click Run to execute your JavaScript code..."}</pre></> : serverResult ? <pre className="lab-console-text">{output || "Program finished without output."}</pre> : <div className={`lab-runner-message ${runnerStatus.configured ? "is-ready" : ""}`}><strong>{runnerStatus.configured ? "Ready to compile" : "Secure runner needed"}</strong><p>{runnerStatus.configured ? "Write code, then click Compile & run." : "This editor is ready, but the secure server compiler is not connected yet."}</p></div>}
              {runtimeMessages.some((entry) => entry.type === "error") && <pre className="lab-console-text lab-error-text">{runtimeMessages.filter((entry) => entry.type === "error").map((entry) => entry.message).join("\n")}</pre>}
            </div>
          </section>
          <p className="lab-status-note">{statusLabel} · Ctrl / ⌘ + Enter to run · Code is saved on this device</p>
        </main>
      </div>
    </div>
  );
}

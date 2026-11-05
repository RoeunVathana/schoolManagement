const LOGO_URLS = {
  javascript: "/programming-logos/javascript.svg",
  node: "/programming-logos/node.svg",
  python: "/programming-logos/python.svg",
  php: "/programming-logos/php.svg",
  laravel: "/programming-logos/laravel.svg",
  c: "/programming-logos/c.svg",
  cpp: "/programming-logos/cpp.svg",
  html: "/programming-logos/html.svg",
  css: "/programming-logos/css.svg",
  bootstrap: "/programming-logos/bootstrap.svg",
  csharp: "/programming-logos/csharp.svg",
  java: "/programming-logos/java.svg",
  kotlin: "/programming-logos/kotlin.svg",
  dart: "/programming-logos/dart.svg",
  rust: "/programming-logos/rust.svg",
  go: "/programming-logos/go.svg",
  swift: "/programming-logos/swift.svg",
  flutter: "/programming-logos/dart.svg",
  sql: "/programming-logos/sql.svg",
  shell: "/programming-logos/shell.svg",
  react: "/programming-logos/javascript.svg",
  tailwindcss: "/programming-logos/css.svg",
  springboot: "/programming-logos/java.svg",
  mysql: "/programming-logos/sql.svg",
  git: "/programming-logos/shell.svg",
  cybersecurity: "/programming-logos/shell.svg",
  computer: "/programming-logos/shell.svg",
};

export const getLogoUrl = (id) => LOGO_URLS[id] || LOGO_URLS.javascript;

export default function LabLogo({ lab, className = "" }) {
  const label = lab?.label || lab?.name || lab?.id || "Programming language";
  return <img className={`lab-logo-image ${className}`} src={getLogoUrl(lab?.id)} alt={`${label} logo`} loading="lazy" />;
}

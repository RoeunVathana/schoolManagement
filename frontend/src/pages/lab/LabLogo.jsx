const LOGO_URLS = {
  javascript: "https://cdn.simpleicons.org/javascript/F7DF1E",
  python: "https://cdn.simpleicons.org/python/3776AB",
  php: "https://cdn.simpleicons.org/php/777BB4",
  c: "https://cdn.simpleicons.org/c/A8B9CC",
  cpp: "https://cdn.simpleicons.org/cplusplus/00599C",
  html: "https://cdn.simpleicons.org/html5/E34F26",
  css: "https://cdn.simpleicons.org/css3/1572B6",
  csharp: "https://cdn.simpleicons.org/sharp/512BD4",
  java: "https://cdn.simpleicons.org/openjdk/ED8B00",
  kotlin: "https://cdn.simpleicons.org/kotlin/7F52FF",
  dart: "https://cdn.simpleicons.org/dart/0175C2",
  flutter: "https://cdn.simpleicons.org/flutter/02569B",
  sql: "https://cdn.simpleicons.org/mysql/4479A1",
  shell: "https://cdn.simpleicons.org/gnubash/4EAA25",
  react: "https://cdn.simpleicons.org/react/61DAFB",
  tailwindcss: "https://cdn.simpleicons.org/tailwindcss/06B6D4",
  bootstrap: "https://cdn.simpleicons.org/bootstrap/7952B3",
  node: "https://cdn.simpleicons.org/nodedotjs/5FA04E",
  laravel: "https://cdn.simpleicons.org/laravel/FF2D20",
  springboot: "https://cdn.simpleicons.org/springboot/6DB33F",
  mysql: "https://cdn.simpleicons.org/mysql/4479A1",
  git: "https://cdn.simpleicons.org/git/F05032",
  cybersecurity: "https://cdn.simpleicons.org/owasp/000000",
  computer: "https://cdn.simpleicons.org/gnometerminal/241F31",
};

export const getLogoUrl = (id) => LOGO_URLS[id] || LOGO_URLS.javascript;

export default function LabLogo({ lab, className = "" }) {
  const label = lab?.label || lab?.name || lab?.id || "Programming language";
  return <img className={`lab-logo-image ${className}`} src={getLogoUrl(lab?.id)} alt={`${label} logo`} loading="lazy" />;
}

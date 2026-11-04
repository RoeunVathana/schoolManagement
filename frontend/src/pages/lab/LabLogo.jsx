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
  sql: "https://cdn.simpleicons.org/mysql/4479A1",
  shell: "https://cdn.simpleicons.org/gnubash/4EAA25",
};

export default function LabLogo({ lab, className = "" }) {
  return <img className={`lab-logo-image ${className}`} src={LOGO_URLS[lab.id]} alt={`${lab.label} logo`} loading="lazy" />;
}

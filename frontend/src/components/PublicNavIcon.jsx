const iconPaths = {
  academy: <><path d="M3 9.5 12 4l9 5.5-9 5.5L3 9.5Z" /><path d="M6 12.2V17c2.7 2 9.3 2 12 0v-4.8M21 10v5" /></>,
  community: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3.5 19c.5-3 2.4-4.5 5.5-4.5s5 1.5 5.5 4.5M14 15c2.8-.3 5 .9 5.8 3.5" /></>,
  about: <><circle cx="12" cy="12" r="9" /><path d="M12 10.5v5M12 7.5h.01" /></>,
  faq: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.6 2.6 0 1 1 4.7 1.5c-.8 1-2.2 1.3-2.2 3M12 16.8h.01" /></>,
  contact: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4.5 7 7.5 5 7.5-5" /></>,
  code: <><path d="m8 8-4 4 4 4" /><path d="m16 8 4 4-4 4" /><path d="m14 5-4 14" /></>,
  library: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" /><path d="M4 5.5V21" /><path d="M8 7h8M8 11h8" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.5 4.5" /></>,
  dashboard: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  chevron: <path d="m7 9 5 5 5-5" />,
  check: <path d="m5 12 4 4L19 6" />,
};

export default function PublicNavIcon({ name, className = '' }) {
  return <span className={`public-nav-icon ${className}`.trim()} aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {iconPaths[name] || iconPaths.about}
    </svg>
  </span>;
}

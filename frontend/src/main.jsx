import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './public-navbar-dark.css';
import './public-navbar-compact.css';
import './storefront-ambient-world.css';
import './navbar-fixed.css';
import './submission-table-fix.css';
import './chat-layout-fix.css';
import './storefront-language.css';
import './navbar-responsive.css';
import './course-reader.css';
import './campusflow-theme-surfaces.css';
import './language-switcher-unified.css';
import './dashboard-search-responsive.css';
import './public-mobile-menu-grid.css';
import './macbook-navbar.css';
import './navbar-icon-text-polish.css';
// Keep the native-scroll contract last so route-specific styles cannot
// re-enable smooth scrolling, reveal motion, or expensive page transforms.
import './natural-scroll.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

const revealApp = () => {
  // The inline boot helper is intentionally optional because production CSP
  // blocks inline scripts. Reveal the React app from the trusted module entry
  // point so a blocked helper can never leave every route behind a spinner.
  document.documentElement.classList.add('campusflow-app-ready');
  document.getElementById('campusflow-boot')?.remove();
  window.__campusflowBootReady?.();
};

const revealAfterStylesLoad = () => {
  const schedule = window.requestAnimationFrame;
  if (typeof schedule === 'function') {
    schedule(() => schedule(revealApp));
    return;
  }
  window.setTimeout(revealApp, 0);
};

// Do not wait for remote images, videos, or analytics to finish loading.
// They must never keep the application hidden behind the first-paint loader.
revealAfterStylesLoad();

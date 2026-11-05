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
import './natural-scroll.css';
import './language-switcher-unified.css';
import './dashboard-search-responsive.css';
import './public-mobile-menu-grid.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

const revealApp = () => {
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

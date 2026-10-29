import { useState } from 'react';

// The hosted logo keeps the brand consistent across devices; the local image
// makes the header resilient when the remote CDN is unavailable.
const logoSources = [
  'https://i.pinimg.com/1200x/70/01/e0/7001e00fd5b7f2745c5e91ff547f4763.jpg',
  '/campusflow-logo.jpg',
];

export default function BrandLogo({ className = '', alt = 'CampusFlow logo' }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = logoSources[sourceIndex];

  return <img src={source} alt={alt} width="96" height="96" loading="eager" decoding="async" fetchPriority="high" referrerPolicy="no-referrer" className={`block h-full w-full object-contain ${className}`} onError={() => setSourceIndex((current) => Math.min(current + 1, logoSources.length - 1))} />;
}

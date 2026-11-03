import { useEffect, useRef } from 'react';

export default function useScrollReveal(dependencies = []) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const items = [...root.querySelectorAll('[data-scroll-reveal]')];
    if (!items.length) return undefined;

    // Keep scrolling native. Content is visible immediately; no observer,
    // reveal transform, or scroll-triggered animation is attached to the page.
    items.forEach((item) => item.classList.add('is-visible'));
    return undefined;
  }, dependencies);

  return rootRef;
}

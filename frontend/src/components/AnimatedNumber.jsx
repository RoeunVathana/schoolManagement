import { useEffect, useMemo, useState } from 'react';

function describe(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return { target: value, prefix: '', suffix: '', decimals: Number.isInteger(value) ? 0 : 2 };
  const text = String(value ?? '—');
  const match = text.match(/^(\D*)(-?\d+(?:\.\d+)?)(.*)$/);
  if (!match || /[/:]/.test(match[3])) return { target: null, text };
  const target = Number(match[2]);
  return { target, prefix: match[1], suffix: match[3], decimals: match[2].includes('.') ? match[2].split('.')[1].length : 0 };
}

export default function AnimatedNumber({ value, duration = 900, className = '' }) {
  const parts = useMemo(() => describe(value), [value]);
  const [current, setCurrent] = useState(parts.target ?? 0);

  useEffect(() => {
    if (parts.target === null) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setCurrent(parts.target);
      return undefined;
    }
    let frame = 0;
    const started = performance.now();
    const animate = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - ((1 - progress) ** 3);
      setCurrent(parts.target * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    setCurrent(0);
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [duration, parts.target]);

  if (parts.target === null) return <span className={className}>{parts.text}</span>;
  const formatted = parts.decimals ? current.toFixed(parts.decimals) : Math.round(current).toString();
  return <span className={`animated-number ${className}`}>{parts.prefix}{formatted}{parts.suffix}</span>;
}

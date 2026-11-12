import { useEffect, useState } from 'react';

const DEFAULT_IMAGE = '/campusflow-logo.jpg';

export default function SafeImage({ src, alt = '', className = '', fallbackSrc = DEFAULT_IMAGE, ...props }) {
  const [failed, setFailed] = useState(false);
  const loading = props.loading || 'lazy';
  const decoding = props.decoding || 'async';

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <img
      {...props}
      src={failed ? fallbackSrc : src}
      alt={alt}
      loading={loading}
      decoding={decoding}
      className={className}
      onError={() => {
        if (!failed) setFailed(true);
      }}
    />
  );
}

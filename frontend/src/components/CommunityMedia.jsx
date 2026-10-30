const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function communityMediaUrl(path) {
  return /^(https?:|blob:|data:)/i.test(path || '') ? path : `${API_ORIGIN}${path || ''}`;
}

export function isCommunityVideo(mediaType, url = '') {
  return mediaType === 'VIDEO' || /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i.test(url);
}

export default function CommunityMedia({ url, mediaType, alt = '', className = '', onError }) {
  if (!url) return null;
  const src = communityMediaUrl(url);
  if (isCommunityVideo(mediaType, url)) {
    return <video src={src} className={className} controls playsInline preload="metadata" onError={onError} aria-label={alt} />;
  }
  return <img src={src} alt={alt} className={className} loading="lazy" onError={onError} />;
}

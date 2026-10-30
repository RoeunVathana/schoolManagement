import { useEffect, useRef } from 'react';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function communityMediaUrl(path) {
  return /^(https?:|blob:|data:)/i.test(path || '') ? path : `${API_ORIGIN}${path || ''}`;
}

export function isCommunityVideo(mediaType, url = '') {
  return mediaType === 'VIDEO' || /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i.test(url);
}

export default function CommunityMedia({ url, mediaType, alt = '', className = '', onError, autoPlayOnView = false }) {
  const videoRef = useRef(null);
  const src = communityMediaUrl(url);
  const isVideo = isCommunityVideo(mediaType, url);

  useEffect(() => {
    const video = videoRef.current;
    if (!autoPlayOnView || !isVideo || !video || typeof IntersectionObserver === 'undefined') return undefined;

    video.muted = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
        const playPromise = video.play();
        playPromise?.catch(() => undefined);
      } else {
        video.pause();
      }
    }, { threshold: [0, 0.55, 1] });

    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [autoPlayOnView, isVideo, src]);

  if (!url) return null;
  if (isVideo) {
    return <video ref={videoRef} src={src} className={className} controls playsInline muted={autoPlayOnView} loop={autoPlayOnView} preload="metadata" onError={onError} aria-label={alt} />;
  }
  return <img src={src} alt={alt} className={className} loading="lazy" onError={onError} />;
}

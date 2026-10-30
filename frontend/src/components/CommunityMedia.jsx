import { useEffect, useRef } from 'react';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function communityMediaUrl(path) {
  return /^(https?:|blob:|data:)/i.test(path || '') ? path : `${API_ORIGIN}${path || ''}`;
}

export function isCommunityVideo(mediaType, url = '') {
  const normalizedType = String(mediaType || '').toUpperCase();
  let pathname = url || '';
  try {
    pathname = new URL(url, typeof window !== 'undefined' ? window.location.href : 'http://localhost').pathname;
  } catch {
    // Keep the original value for blob/data URLs and malformed legacy paths.
  }
  let decodedPathname = pathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    // Keep the encoded pathname when a legacy URL contains an invalid escape.
  }
  return normalizedType === 'VIDEO' || /\.(mp4|webm|mov|m4v)$/i.test(decodedPathname);
}

export function communityPostMedia(post) {
  if (post?.media?.length) return post.media;
  if (post?.imageUrl) return [{ id: `${post.id || 'post'}-legacy`, url: post.imageUrl, mediaType: post.mediaType || 'IMAGE', sortOrder: 0 }];
  return [];
}

export default function CommunityMedia({ url, mediaType, alt = '', className = '', onError, onEnded, autoPlayOnView = false, loop = true }) {
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
    return <video ref={videoRef} src={src} className={className} controls playsInline muted={autoPlayOnView} loop={autoPlayOnView && loop} preload="metadata" onError={onError} onEnded={onEnded} aria-label={alt} />;
  }
  return <img src={src} alt={alt} className={className} loading="lazy" onError={onError} />;
}

export function CommunityMediaGallery({ post, itemClassName = '', autoPlayOnView = false, alt = 'Post media' }) {
  const media = communityPostMedia(post);
  if (!media.length) return null;
  return <div className={`community-media-gallery ${media.length === 1 ? 'is-single' : ''}`}>
    {media.map((item, index) => <CommunityMedia key={item.id || `${item.url}-${index}`} url={item.url} mediaType={item.mediaType} alt={`${alt} ${index + 1}`} className={itemClassName} autoPlayOnView />)}
  </div>;
}

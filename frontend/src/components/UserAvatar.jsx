import { useState } from 'react';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function UserAvatar({ person, size = 'md', className = '' }) {
  const [failed, setFailed] = useState(false);
  const path = person?.profileImageUrl || person?.profile?.avatar;
  const source = path?.startsWith('http') ? path : `${API_ORIGIN}${path || ''}`;
  const initials = person?.fullName?.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';

  return <span className={`user-avatar user-avatar-${size} ${className}`}>
    {path && !failed ? <img src={source} alt="" onError={() => setFailed(true)} /> : <span>{initials}</span>}
  </span>;
}

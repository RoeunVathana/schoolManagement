import { useEffect, useState } from 'react';

export default function FileImagePreview({ file, label = '', className = '' }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (!file) {
      setSrc('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!file || !src) return null;

  return (
    <div className={`mt-2 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2 ${className}`}>
      <img src={src} alt={file.name} className="h-14 w-14 rounded-lg object-cover" />
      <div className="min-w-0">
        {label && <p className="text-xs font-bold text-emerald-800">{label}</p>}
        <p className="truncate text-xs font-semibold text-emerald-700">{file.name}</p>
      </div>
    </div>
  );
}

export default function UploadProgressPanel({
  progress = 0,
  label = 'Loading...',
  detail = '',
  stage = '',
  className = '',
}) {
  const percent = Math.min(100, Math.max(0, Math.round(Number(progress) || 0)));

  return (
    <div
      className={`rounded-2xl border border-[#229ed9]/60 bg-[#174d6b]/95 p-4 text-white shadow-lg shadow-[#0b2438]/20 backdrop-blur ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center justify-between gap-3 text-sm font-extrabold">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#229ed9] via-[#33a9c1] to-[#8de4ca] transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      {(detail || stage) && (
        <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-white/55">
          <span>{detail}</span>
          <strong className="text-white/80">{stage}</strong>
        </div>
      )}
    </div>
  );
}

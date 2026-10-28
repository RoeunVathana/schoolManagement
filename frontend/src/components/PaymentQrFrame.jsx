export default function PaymentQrFrame({ qrImage, alt, scanLabel = 'Scan with ABA or Bakong' }) {
  if (!qrImage) return null;
  return <div className="payment-qr-frame mx-auto w-fit">
    <div className="flex items-center justify-between gap-4 px-1 pb-3">
      <div className="flex items-center gap-1.5">
        <span className="payment-aba-mark">ABA</span>
        <span className="text-xs font-extrabold tracking-[.16em] text-[#174c92] dark:text-[#b9d7ff]">PAY</span>
      </div>
      <span className="rounded-md bg-[#174c92] px-2 py-1 text-[10px] font-extrabold tracking-[.12em] text-white">KHQR</span>
    </div>
    <div className="payment-qr-image-wrap"><img src={qrImage} alt={alt} className="block h-64 w-64 max-w-full sm:h-72 sm:w-72" /></div>
    <div className="flex items-center justify-center gap-2 pt-3 text-xs font-semibold text-slate-500 dark:text-slate-300"><span className="h-2 w-2 animate-pulse rounded-full bg-[#21a366]" />{scanLabel}</div>
  </div>;
}

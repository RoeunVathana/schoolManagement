function formatPaidAt(value, language) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'km' ? 'km-KH' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function PaymentReceipt({ payment, item, t, language, registration = false }) {
  if (!payment || payment.status !== 'PAID') return null;
  const label = (key, fallback) => {
    const value = t?.(key);
    return value && value !== key ? value : fallback;
  };

  const printReceipt = () => {
    const previousTitle = document.title;
    document.title = `${label('paymentReceipt', 'Payment receipt')} - ${payment.invoiceNumber || 'CampusFlow'}`;
    window.print();
    window.setTimeout(() => { document.title = previousTitle; }, 1000);
  };

  return <section className="payment-receipt-print mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30" aria-label={label('paymentReceipt', 'Payment receipt')}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-300">{label('paymentReceipt', 'Payment receipt')}</p>
        <p className="mt-1 text-sm font-bold text-emerald-900 dark:text-emerald-100">{label('receiptSuccess', 'Payment received successfully')}</p>
      </div>
      <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-extrabold text-white">PAID</span>
    </div>
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-xs text-slate-500 dark:text-slate-400">{label('receiptItem', 'Item')}</dt><dd className="mt-1 truncate font-semibold text-slate-800 dark:text-slate-100" title={item}>{item || (registration ? label('registrationPayment', 'CampusFlow account registration') : label('course', 'Course'))}</dd></div>
      <div><dt className="text-xs text-slate-500 dark:text-slate-400">{label('invoice', 'Invoice')}</dt><dd className="mt-1 truncate font-semibold text-slate-800 dark:text-slate-100" title={payment.invoiceNumber}>{payment.invoiceNumber || '—'}</dd></div>
      <div><dt className="text-xs text-slate-500 dark:text-slate-400">{label('amountDue', 'Amount')}</dt><dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{payment.amount} {payment.currency}</dd></div>
      <div><dt className="text-xs text-slate-500 dark:text-slate-400">{label('paidOn', 'Paid on')}</dt><dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{formatPaidAt(payment.paidAt, language)}</dd></div>
    </dl>
    <button type="button" onClick={printReceipt} className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-slate-900/60 dark:text-emerald-200 dark:hover:bg-emerald-950/60">{label('printReceipt', 'Print receipt / Save PDF')}</button>
  </section>;
}

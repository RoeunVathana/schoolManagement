export function isCoursePaymentOpen(endDate: Date | string | null | undefined, paymentEnabled = true, now = new Date()) {
  if (paymentEnabled === false) return false;
  if (!endDate) return true;

  const parsed = endDate instanceof Date ? endDate : new Date(endDate);
  if (Number.isNaN(parsed.getTime())) return false;

  // Course dates are calendar dates in Cambodia. Keep payment open through
  // the end date, then close it at the end of that day (UTC+7).
  const datePart = parsed.toISOString().slice(0, 10);
  const closesAt = new Date(`${datePart}T23:59:59.999+07:00`);
  return closesAt >= now;
}

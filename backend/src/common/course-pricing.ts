export type CoursePricingInput = {
  price: unknown;
  discountPercent?: unknown;
  discountStart?: Date | string | null;
  discountEnd?: Date | string | null;
};

export function getCoursePricing(course: CoursePricingInput, now = new Date()) {
  const originalPrice = Number(course.price);
  const configuredPercent = Number(course.discountPercent ?? 0);
  const discountPercent = Number.isFinite(configuredPercent)
    ? Math.min(Math.max(configuredPercent, 0), 99.99)
    : 0;
  const start = course.discountStart ? new Date(course.discountStart) : null;
  const end = course.discountEnd ? new Date(course.discountEnd) : null;
  const startsInTime = !start || !Number.isNaN(start.getTime()) && start <= now;
  const endsInTime = !end || !Number.isNaN(end.getTime()) && end > now;
  const discountActive = Number.isFinite(originalPrice) && originalPrice > 0 && discountPercent > 0 && startsInTime && endsInTime;
  const salePrice = discountActive
    ? Number((originalPrice * (1 - discountPercent / 100)).toFixed(2))
    : originalPrice;

  return {
    originalPrice,
    salePrice: Math.max(salePrice, 0),
    discountPercent: discountActive ? discountPercent : 0,
    discountActive,
    discountStart: start,
    discountEnd: end,
  };
}

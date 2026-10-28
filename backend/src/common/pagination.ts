export function pagination(page = 1, limit = 10) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export function paginationResult<T>(data: T[], total: number, page: number, limit: number) {
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export function normalizePagination(page = 1, limit = 10): {
  page: number;
  limit: number;
  skip: number;
} {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 10;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

export function createPaginationMeta(
  total: number,
  page: number,
  limit: number,
): {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
} {
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

  return {
    hasNextPage: totalPages > 0 && page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
    page,
    limit,
    total,
    totalPages,
  };
}

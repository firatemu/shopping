/**
 * NestJS @Query değerleri çoğu zaman string gelir; geçersiz değerler skip=NaN üretip
 * Prisma'da "Argument `skip` is missing" hatasına yol açar. Bunu önler.
 */
export function normalizePagination(
  options: { page?: unknown; limit?: unknown },
  cfg: { defaultLimit?: number; maxLimit?: number } = {},
): { page: number; limit: number; skip: number } {
  const defaultLimit = cfg.defaultLimit ?? 20;
  const maxLimit = cfg.maxLimit ?? 100;

  const p = typeof options.page === 'string' ? parseInt(options.page, 10) : Number(options.page);
  const page = Number.isFinite(p) && p >= 1 ? Math.floor(p) : 1;

  const l = typeof options.limit === 'string' ? parseInt(options.limit, 10) : Number(options.limit);
  const rawLimit = Number.isFinite(l) && l >= 1 ? Math.floor(l) : defaultLimit;
  const limit = Math.min(Math.max(1, rawLimit), maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

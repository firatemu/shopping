/** Nest ConfigService returns '' when env is set but empty; JWT then throws and login returns 500. */
export function resolvedJwtAccessExpiry(raw: string | undefined): string {
  const v = raw?.trim();
  return v && v.length > 0 ? v : '15m';
}

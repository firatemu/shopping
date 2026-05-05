/** Normalize to E.164 Turkey (+90…) for API */
export function normalizeTurkeyPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.startsWith('90') && digits.length >= 12) return `+${digits}`;
  if (digits.startsWith('0')) return `+90${digits.slice(1)}`;
  return `+90${digits}`;
}

export function isValidTurkeyMobile(e164: string): boolean {
  return /^\+90[5][0-9]{9}$/.test(e164);
}

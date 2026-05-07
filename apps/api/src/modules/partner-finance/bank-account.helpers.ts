import { BankAccountKind } from '@prisma/client';

/** POS mutabakat hesapları DB'de CHECKING + bu etiketle tutulur (enum POS_SETTLEMENT gerektirmez). */
export const BANK_POS_SETTLEMENT_COLOR_TAG = 'pos_settlement';

export function isPosSettlementAccount(bank: {
  kind: BankAccountKind;
  colorTag: string | null;
}): boolean {
  if (bank.kind === BankAccountKind.POS_SETTLEMENT) return true;
  return bank.kind === BankAccountKind.CHECKING && bank.colorTag === BANK_POS_SETTLEMENT_COLOR_TAG;
}

export function isVadesizForTransfer(bank: {
  kind: BankAccountKind;
  colorTag: string | null;
}): boolean {
  return bank.kind === BankAccountKind.CHECKING && !isPosSettlementAccount(bank);
}

export type BankApiKind = 'CHECKING' | 'POS_SETTLEMENT' | 'CREDIT_CARD';

export function apiKindFromBankAccount(bank: {
  kind: BankAccountKind;
  colorTag: string | null;
}): BankApiKind {
  if (isPosSettlementAccount(bank)) return 'POS_SETTLEMENT';
  if (bank.kind === BankAccountKind.CREDIT_CARD) return 'CREDIT_CARD';
  return 'CHECKING';
}

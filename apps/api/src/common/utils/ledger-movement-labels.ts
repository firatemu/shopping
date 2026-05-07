import { LedgerMovementType } from '@prisma/client';

const LABELS: Record<LedgerMovementType, string> = {
  [LedgerMovementType.SALE]: 'Satış faturası',
  [LedgerMovementType.RETURN]: 'Satış iadesi',
  [LedgerMovementType.PAYMENT_CASH]: 'Tahsilat — nakit',
  [LedgerMovementType.PAYMENT_CARD]: 'Tahsilat — kredi kartı',
  [LedgerMovementType.PAYMENT_TRANSFER]: 'Tahsilat — havale / EFT',
  [LedgerMovementType.PAYMENT_CHECK]: 'Tahsilat — çek / senet',
  [LedgerMovementType.PAYMENT_OUT_CASH]: 'Ödeme — nakit',
  [LedgerMovementType.PAYMENT_OUT_TRANSFER]: 'Ödeme — havale / EFT',
  [LedgerMovementType.PAYMENT_OUT_CHECK]: 'Ödeme — çek / senet',
  [LedgerMovementType.PAYMENT_OUT_CARD]: 'Ödeme — firma kartı',
  [LedgerMovementType.PURCHASE]: 'Alış (tedarikçi)',
  [LedgerMovementType.OPENING_BALANCE]: 'Açılış bakiyesi',
  [LedgerMovementType.ADJUSTMENT]: 'Düzeltme / mahsup',
  [LedgerMovementType.DEBIT_VOUCHER]: 'Borç dekontu',
  [LedgerMovementType.CREDIT_VOUCHER]: 'Alacak dekontu',
};

export function ledgerMovementTypeLabelTr(type: LedgerMovementType): string {
  return LABELS[type] ?? String(type);
}

export type CashRegisterSession = {
  id: string;
  tenantId: string;
  cashierId: string;
  openingBalance: string | number;
  totalCash: string | number;
  totalCard: string | number;
  totalTransfer: string | number;
  totalSales: number;
  totalReturns: number;
  status: string;
  openedAt: string;
  notes?: string | null;
};

export type OpenCashRegisterBody = {
  openingBalance: number;
  notes?: string;
};

export type CloseCashRegisterBody = {
  physicalCount: number;
  notes?: string;
};

export type CashMovementBody = {
  type: 'IN' | 'OUT';
  amount: number;
  description: string;
};

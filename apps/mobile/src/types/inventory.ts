export type StockSummaryRow = {
  id: string;
  barcode: string;
  productName: string;
  brand?: string | null;
  color: string;
  size: string;
  stockQuantity: number;
  reservedQty: number;
  availableQty: number;
  minStockLevel: number;
  isLowStock: boolean;
};

export type StockSummaryResponse = {
  data: StockSummaryRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type StockMovementRow = {
  id: string;
  type: string;
  quantity: number;
  previousQty: number;
  newQty: number;
  reason?: string | null;
  createdBy: string;
  createdAt: string;
};

export type StockMovementsResponse = {
  data: StockMovementRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type StockAdjustmentReason =
  | 'MANUAL_COUNT'
  | 'DAMAGE'
  | 'THEFT'
  | 'RETURN_TO_SUPPLIER'
  | 'NEW_SHIPMENT'
  | 'CORRECTION';

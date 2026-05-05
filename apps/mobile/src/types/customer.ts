export type CustomerListItem = Customer & {
  totalSpent?: number;
  currentBalance?: string | number;
  taxId?: string | null;
};

export type Customer = {
  id: string;
  name: string;
  surname?: string | null;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  address?: string | null;
  birthDate?: string | null;
  currentBalance?: string | number;
  openingBalance?: string | number;
};

export type CustomerListResponse = {
  data: CustomerListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type CustomerOrderRow = {
  id: string;
  orderNumber: string;
  createdAt: string;
  grandTotal: string | number;
  payments?: Array<{ type: string; amount: string | number }>;
};

export type CustomerOrdersResponse = {
  data: CustomerOrderRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type RecordPaymentResponse = {
  movement: { id: string };
  newBalance: string | number;
};

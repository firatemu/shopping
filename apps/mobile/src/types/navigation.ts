import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
};

export type AppTabParamList = {
  POS: undefined;
  Products: undefined;
  Customers: undefined;
  Inventory: { initialBarcode?: string } | undefined;
  CashRegister: undefined;
  Settings: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<AppTabParamList> | undefined;
  ProductDetail: { productId: string };
  BarcodeScanner: { mode?: 'cart' | 'lookup' | 'inventory' } | undefined;
  CustomerSelect: undefined;
  Payment: undefined;
  Receipt: { orderId: string };
  CustomerDetail: { customerId: string };
  NewCustomer: undefined;
  Collection: { customerId: string; customerName: string };
  StockMovement: { variantId: string; title?: string };
  StockAdjustment: { variantId?: string } | undefined;
  OpenCashRegister: undefined;
  CloseCashRegister: { sessionId: string; expectedCash: number };
  CashMovement: { sessionId: string };
  Dashboard: undefined;
  SalesReport: undefined;
  StockReport: undefined;
  CashReport: undefined;
  CampaignList: undefined;
  CampaignDetail: { campaignId: string };
  GiftVoucherList: undefined;
  GiftVoucherDetail: { voucherId: string };
  NewGiftVoucher: undefined;
  ExpenseList: undefined;
  NewExpense: undefined;
  ExpenseCategories: undefined;
};

export type PaymentType = 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'OPEN_ACCOUNT' | 'GIFT_VOUCHER';

export type CheckoutPayment = {
  type: PaymentType;
  amount: number;
  reference?: string;
};

export type OrderResponse = {
  id: string;
  orderNumber: string;
  grandTotal?: string | number;
};

export type ReceiptResponse = {
  orderId: string;
  orderNumber: string;
  textReceipt: string;
  escposCommands: string;
  generatedAt: string;
};

export type CampaignCalculationResponse = {
  totalDiscount?: string | number;
  discountTotal?: string | number;
  items?: Array<{
    barcode?: string;
    discountAmount?: string | number;
    campaignName?: string;
    name?: string;
  }>;
  appliedCampaigns?: Array<{
    barcode?: string;
    discountAmount?: string | number;
    campaignName?: string;
    name?: string;
  }>;
  campaigns?: Array<{
    campaignId?: string;
    campaignName?: string;
    type?: string;
    discountAmount: string | number;
  }>;
};

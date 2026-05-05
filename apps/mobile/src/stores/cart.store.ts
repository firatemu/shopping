import { create } from 'zustand';
import { getApiErrorMessage, api } from '../lib/api';
import { centsToNumber, toCents } from '../lib/money';
import type { BarcodeLookupResponse } from '../types/product';
import type { CampaignCalculationResponse, CheckoutPayment, OrderResponse } from '../types/sales';

export type CartItem = {
  productId: string;
  variantId: string;
  barcode: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  priceCents: number;
  quantity: number;
  discountCents: number;
  campaignName?: string | null;
  kdvRate: number;
  stockQuantity: number;
};

type AddItemInput = {
  productId: string;
  variantId: string;
  barcode: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  price: string | number;
  kdvRate?: string | number | null;
  stockQuantity: number;
};

type CartTotals = {
  subtotalCents: number;
  discountTotalCents: number;
  taxTotalCents: number;
  totalCents: number;
};

type CartState = CartTotals & {
  items: CartItem[];
  selectedCustomerId: string | null;
  selectedCustomerName: string | null;
  campaignLoading: boolean;
  campaignMessage: string | null;
  lastOrderId: string | null;
  lastOrderNumber: string | null;
  addItem: (item: AddItemInput) => void;
  addItemFromBarcode: (barcode: string) => Promise<{ success: boolean; error?: string }>;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  applyDiscount: (variantId: string, discountCents: number) => void;
  applyCampaigns: () => Promise<void>;
  setSelectedCustomer: (customer: { id: string; name: string } | null) => void;
  clearCart: () => void;
  checkout: (payments: CheckoutPayment[]) => Promise<{ success: boolean; orderId?: string; error?: string }>;
};

function calculateTotals(items: CartItem[]): CartTotals {
  return items.reduce<CartTotals>(
    (totals, item) => {
      const lineSubtotal = item.priceCents * item.quantity;
      const lineDiscount = Math.min(item.discountCents, lineSubtotal);
      const taxable = Math.max(0, lineSubtotal - lineDiscount);
      const lineTax = Math.round((taxable * item.kdvRate) / 100);

      return {
        subtotalCents: totals.subtotalCents + lineSubtotal,
        discountTotalCents: totals.discountTotalCents + lineDiscount,
        taxTotalCents: totals.taxTotalCents + lineTax,
        totalCents: totals.totalCents + taxable + lineTax,
      };
    },
    { discountTotalCents: 0, subtotalCents: 0, taxTotalCents: 0, totalCents: 0 },
  );
}

function recalculate(items: CartItem[]): Pick<CartState, 'items'> & CartTotals {
  return { items, ...calculateTotals(items) };
}

function normalizeLookup(row: BarcodeLookupResponse): AddItemInput {
  return {
    barcode: row.barcode,
    brand: row.product.brand,
    category: row.product.category,
    kdvRate: row.product.kdvRate ?? 0,
    name: [
      row.product.name,
      row.color && row.size ? `${row.color}/${row.size}` : null,
    ].filter(Boolean).join(' - '),
    price: row.salePrice ?? row.product.salePrice,
    productId: row.product.id,
    stockQuantity: row.stockQuantity - (row.reservedQty ?? 0),
    variantId: row.id,
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  campaignLoading: false,
  campaignMessage: null,
  discountTotalCents: 0,
  items: [],
  lastOrderId: null,
  lastOrderNumber: null,
  selectedCustomerId: null,
  selectedCustomerName: null,
  subtotalCents: 0,
  taxTotalCents: 0,
  totalCents: 0,

  addItem: (input) => {
    const existing = get().items.find((item) => item.variantId === input.variantId);
    const priceCents = toCents(input.price);
    const kdvRate = Number(input.kdvRate ?? 0);

    const nextItems = existing
      ? get().items.map((item) =>
          item.variantId === input.variantId
            ? { ...item, quantity: Math.min(item.quantity + 1, item.stockQuantity) }
            : item,
        )
      : [
          ...get().items,
          {
            barcode: input.barcode,
            brand: input.brand,
            category: input.category,
            discountCents: 0,
            kdvRate: Number.isFinite(kdvRate) ? kdvRate : 0,
            name: input.name,
            priceCents,
            productId: input.productId,
            quantity: 1,
            stockQuantity: Math.max(0, input.stockQuantity),
            variantId: input.variantId,
          },
        ];

    set(recalculate(nextItems));
    void get().applyCampaigns();
  },

  addItemFromBarcode: async (barcode) => {
    try {
      const response = await api.post<BarcodeLookupResponse>('/products/barcodes/lookup', { barcode });
      get().addItem(normalizeLookup(response.data));
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ürün bulunamadı';
      return { error: message, success: false };
    }
  },

  removeItem: (variantId) => {
    const nextItems = get().items.filter((item) => item.variantId !== variantId);
    set(recalculate(nextItems));
    void get().applyCampaigns();
  },

  updateQuantity: (variantId, quantity) => {
    const nextItems = get().items.map((item) =>
      item.variantId === variantId
        ? { ...item, quantity: Math.min(Math.max(1, quantity), item.stockQuantity) }
        : item,
    );
    set(recalculate(nextItems));
    void get().applyCampaigns();
  },

  applyDiscount: (variantId, discountCents) => {
    const nextItems = get().items.map((item) =>
      item.variantId === variantId
        ? { ...item, campaignName: null, discountCents: Math.max(0, discountCents) }
        : item,
    );
    set(recalculate(nextItems));
  },

  applyCampaigns: async () => {
    const items = get().items;
    if (items.length === 0) {
      set({ campaignLoading: false, campaignMessage: null });
      return;
    }

    set({ campaignLoading: true, campaignMessage: null });
    try {
      const response = await api.post<CampaignCalculationResponse>('/campaigns/calculate', {
        items: items.map((item) => ({
          barcode: item.barcode,
          brand: item.brand ?? undefined,
          category: item.category ?? undefined,
          quantity: item.quantity,
          unitPrice: centsToNumber(item.priceCents),
        })),
      });
      const campaignItems = response.data.items ?? response.data.appliedCampaigns ?? [];
      const totalDiscountCents = toCents(response.data.totalDiscount ?? response.data.discountTotal);
      const campaignName = response.data.campaigns
        ?.map((campaign: { campaignName?: string }) => campaign.campaignName)
        .filter(Boolean)
        .join(', ');
      const lineSubtotalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
      let allocatedCents = 0;

      const nextItems = items.map((item, index) => {
        const campaign = campaignItems.find((row: { barcode?: string }) => row.barcode === item.barcode);
        if (campaign) {
          return {
            ...item,
            campaignName: campaign.campaignName ?? campaign.name ?? 'Kampanya',
            discountCents: toCents(campaign.discountAmount),
          };
        }

        if (totalDiscountCents <= 0 || lineSubtotalCents <= 0) {
          return { ...item, campaignName: null, discountCents: 0 };
        }

        const lineSubtotal = item.priceCents * item.quantity;
        const discountCents =
          index === items.length - 1
            ? totalDiscountCents - allocatedCents
            : Math.round((totalDiscountCents * lineSubtotal) / lineSubtotalCents);
        allocatedCents += discountCents;

        return {
          ...item,
          campaignName: campaignName || 'Kampanya',
          discountCents: Math.min(discountCents, lineSubtotal),
        };
      });
      set({ ...recalculate(nextItems), campaignLoading: false, campaignMessage: 'Kampanya uygulandı' });
    } catch {
      set({ campaignLoading: false, campaignMessage: 'Kampanya hesaplanamadı' });
    }
  },

  setSelectedCustomer: (customer) => {
    set({
      selectedCustomerId: customer?.id ?? null,
      selectedCustomerName: customer?.name ?? null,
    });
  },

  clearCart: () => {
    set({
      ...recalculate([]),
      campaignLoading: false,
      campaignMessage: null,
      selectedCustomerId: null,
      selectedCustomerName: null,
    });
  },

  checkout: async (payments) => {
    const state = get();
    if (state.items.length === 0) return { error: 'Sepet boş', success: false };

    try {
      const response = await api.post<OrderResponse>('/sales/checkout', {
        customerId: state.selectedCustomerId ?? undefined,
        items: state.items.map((item) => ({
          barcode: item.barcode,
          quantity: item.quantity,
        })),
        payments,
      });
      set({
        ...recalculate([]),
        campaignMessage: null,
        lastOrderId: response.data.id,
        lastOrderNumber: response.data.orderNumber,
        selectedCustomerId: null,
        selectedCustomerName: null,
      });
      return { orderId: response.data.id, success: true };
    } catch (error) {
      return { error: getApiErrorMessage(error), success: false };
    }
  },
}));

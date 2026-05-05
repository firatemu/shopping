'use client';

import { create } from 'zustand';
import { api } from '@/lib/api';

interface CartItem {
    variantId: string;
    barcode: string;
    productName: string;
    color: string;
    size: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    kdvRate: number;
    discountAmount: number;
}

export type CheckoutPaymentLine = {
    type: 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'OPEN_ACCOUNT' | 'GIFT_VOUCHER';
    amount: number;
    reference?: string;
};

interface CartState {
    items: CartItem[];
    customerId: string | null;
    customerName: string | null;

    // Computed (updated on every mutation)
    subtotal: number;
    discountTotal: number;
    kdvTotal: number;
    grandTotal: number;

    // Actions
    addItemByBarcode: (barcode: string) => Promise<{ success: boolean; error?: string }>;
    removeItem: (variantId: string) => void;
    updateQuantity: (variantId: string, quantity: number) => void;
    setCustomer: (id: string | null, name: string | null) => void;
    clearCart: () => void;
    completeCheckout: (
        payments: CheckoutPaymentLine[],
        customerId?: string | null,
    ) => Promise<{ success: boolean; error?: string; orderNumber?: string }>;
}

function recalculate(items: CartItem[]) {
    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const discountTotal = items.reduce((sum, i) => sum + i.discountAmount, 0);
    const netAfterDiscount = subtotal - discountTotal;
    const kdvTotal = items.reduce((sum, i) => {
        const lineNet = (i.unitPrice * i.quantity - i.discountAmount);
        return sum + (lineNet * i.kdvRate / 100);
    }, 0);
    const grandTotal = netAfterDiscount + kdvTotal;
    return { subtotal: Math.round(subtotal * 100) / 100, discountTotal: Math.round(discountTotal * 100) / 100, kdvTotal: Math.round(kdvTotal * 100) / 100, grandTotal: Math.round(grandTotal * 100) / 100 };
}

export const useCartStore = create<CartState>()((set, get) => ({
    items: [],
    customerId: null,
    customerName: null,
    subtotal: 0,
    discountTotal: 0,
    kdvTotal: 0,
    grandTotal: 0,

    addItemByBarcode: async (barcode: string) => {
        const { items } = get();
        // Check if already in cart
        const existing = items.find((i) => i.barcode === barcode);
        if (existing) {
            const updated = items.map((i) =>
                i.barcode === barcode ? { ...i, quantity: i.quantity + 1 } : i,
            );
            set({ items: updated, ...recalculate(updated) });
            return { success: true };
        }
        // Lookup from API
        try {
            const res = await api.post('/products/barcodes/lookup', { barcode });
            const data = res.data as {
                variant: { id: string; color: string; size: string };
                product: { name: string };
                effectiveSalePrice: string | number;
                effectiveCostPrice: string | number;
                kdvRate: string | number;
            };
            const newItem: CartItem = {
                variantId: data.variant.id,
                barcode,
                productName: data.product.name,
                color: data.variant.color,
                size: data.variant.size,
                quantity: 1,
                unitPrice: parseFloat(String(data.effectiveSalePrice ?? '0')),
                costPrice: parseFloat(String(data.effectiveCostPrice ?? '0')),
                kdvRate: parseFloat(String(data.kdvRate ?? '20')),
                discountAmount: 0,
            };
            const updated = [...items, newItem];
            set({ items: updated, ...recalculate(updated) });
            return { success: true };
        } catch {
            return { success: false, error: 'Ürün bulunamadı' };
        }
    },

    removeItem: (variantId) => {
        const updated = get().items.filter((i) => i.variantId !== variantId);
        set({ items: updated, ...recalculate(updated) });
    },

    updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
            get().removeItem(variantId);
            return;
        }
        const updated = get().items.map((i) =>
            i.variantId === variantId ? { ...i, quantity } : i,
        );
        set({ items: updated, ...recalculate(updated) });
    },

    setCustomer: (id, name) => set({ customerId: id, customerName: name }),

    clearCart: () => set({
        items: [], customerId: null, customerName: null,
        subtotal: 0, discountTotal: 0, kdvTotal: 0, grandTotal: 0,
    }),

    completeCheckout: async (payments, customerId) => {
        const st = get();
        if (st.items.length === 0) {
            return { success: false, error: 'Sepet boş' };
        }
        if (!payments.length) {
            return { success: false, error: 'Ödeme satırı yok' };
        }

        const hasOpen = payments.some((p) => p.type === 'OPEN_ACCOUNT');
        const cid = hasOpen ? (customerId ?? st.customerId) : undefined;
        if (hasOpen && !cid) {
            return { success: false, error: 'Açık hesap için müşteri seçin' };
        }

        const totalPayment = payments.reduce((s, p) => s + p.amount, 0);
        const centsPay = Math.round(totalPayment * 100);
        const centsExpected = Math.round(st.grandTotal * 100);
        if (Math.abs(centsPay - centsExpected) > 1) {
            return { success: false, error: 'Ödeme toplamı sepet tutarı ile uyuşmuyor' };
        }

        const items = st.items.map((i) => ({ barcode: i.barcode, quantity: i.quantity }));
        try {
            const body: {
                items: typeof items;
                payments: CheckoutPaymentLine[];
                customerId?: string;
            } = { items, payments };
            if (cid) body.customerId = cid;
            const res = await api.post('/sales/checkout', body);
            const orderNumber = res.data?.orderNumber as string | undefined;
            get().clearCart();
            return { success: true, orderNumber };
        } catch (e: unknown) {
            const msg =
                e && typeof e === 'object' && 'response' in e
                    ? (e as { response?: { data?: { message?: string | string[] } } }).response?.data
                          ?.message
                    : undefined;
            const text = Array.isArray(msg) ? msg.join(', ') : msg;
            return { success: false, error: typeof text === 'string' ? text : 'Ödeme tamamlanamadı' };
        }
    },
}));

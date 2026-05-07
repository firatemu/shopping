'use client';

import { create } from 'zustand';
import { api } from '@/lib/api';

export type LineDiscountMode = 'none' | 'percent' | 'fixed';

export interface CartItem {
    variantId: string;
    barcode: string;
    productName: string;
    color: string;
    size: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    kdvRate: number;
    lineDiscountMode: LineDiscountMode;
    lineDiscountValue: number;
    /** Sepet özeti (recalculate doldurur) */
    displayGross: number;
    displayLineDiscount: number;
    displayLineTotal: number;
}

export type CheckoutPaymentLine = {
    type: 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'OPEN_ACCOUNT' | 'GIFT_VOUCHER';
    amount: number;
    reference?: string;
};

/** POS ürün arama (/products/variants) satırı — sepete eklemek için */
export interface PosSearchVariantRow {
    id: string;
    barcode: string;
    color: string;
    size: string;
    stockQuantity: number;
    reservedQty: number;
    isActive: boolean;
    effectiveSalePrice: string;
    effectiveCostPrice: string;
    kdvRate: string;
    product: {
        id: string;
        name: string;
        brand?: string | null;
        category?: string | null;
        subcategory?: string | null;
        supplierCode?: string | null;
    };
}

interface CartState {
    items: CartItem[];
    customerId: string | null;
    customerName: string | null;
    cartDiscountAmount: number;

    subtotal: number;
    discountTotal: number;
    kdvTotal: number;
    grandTotal: number;

    addItemByBarcode: (barcode: string) => Promise<{ success: boolean; error?: string }>;
    addItemFromSearchRow: (row: PosSearchVariantRow) => { success: boolean; error?: string };
    removeItem: (variantId: string) => void;
    updateQuantity: (variantId: string, quantity: number) => void;
    setLineDiscount: (variantId: string, mode: LineDiscountMode, value: number) => void;
    setCartDiscountAmount: (amount: number) => void;
    setCustomer: (id: string | null, name: string | null) => void;
    clearCart: () => void;
    completeCheckout: (
        payments: CheckoutPaymentLine[],
        customerId?: string | null,
    ) => Promise<{ success: boolean; error?: string; orderNumber?: string }>;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

function enrichAndTotals(items: CartItem[], cartDiscountAmount: number) {
    const n = items.length;
    const cartCents = Math.round(round2(Math.max(0, cartDiscountAmount)) * 100);
    const baseShare = n > 0 ? Math.floor(cartCents / n) : 0;
    const rem = n > 0 ? cartCents - baseShare * n : 0;

    const updated: CartItem[] = items.map((i, idx) => {
        const gross = round2(i.unitPrice * i.quantity);
        const grossCents = Math.round(gross * 100);
        let lineDiscCents = 0;
        if (i.lineDiscountMode === 'percent' && i.lineDiscountValue > 0) {
            lineDiscCents = Math.min(
                grossCents,
                Math.floor((grossCents * i.lineDiscountValue) / 100),
            );
        } else if (i.lineDiscountMode === 'fixed' && i.lineDiscountValue > 0) {
            lineDiscCents = Math.min(grossCents, Math.round(i.lineDiscountValue * 100));
        }
        const cartShareCents = baseShare + (idx < rem ? 1 : 0);
        const totalDiscCents = Math.min(grossCents, lineDiscCents + cartShareCents);
        const netCents = grossCents - totalDiscCents;
        const kdvCents = Math.round((netCents * i.kdvRate) / 100);
        const lineGrand = round2(netCents / 100 + kdvCents / 100);

        return {
            ...i,
            displayGross: gross,
            displayLineDiscount: round2(totalDiscCents / 100),
            displayLineTotal: lineGrand,
        };
    });

    const subtotal = round2(updated.reduce((s, x) => s + x.displayGross, 0));
    const discountTotal = round2(updated.reduce((s, x) => s + x.displayLineDiscount, 0));
    const grandTotal = round2(updated.reduce((s, x) => s + x.displayLineTotal, 0));
    const kdvTotal = round2(
        updated.reduce((s, x) => {
            const net = round2(x.displayGross - x.displayLineDiscount);
            return s + round2(x.displayLineTotal - net);
        }, 0),
    );

    return {
        items: updated,
        subtotal,
        discountTotal,
        kdvTotal,
        grandTotal,
    };
}

const emptyTotals = {
    items: [] as CartItem[],
    subtotal: 0,
    discountTotal: 0,
    kdvTotal: 0,
    grandTotal: 0,
};

export const useCartStore = create<CartState>()((set, get) => ({
    items: [],
    customerId: null,
    customerName: null,
    cartDiscountAmount: 0,
    subtotal: 0,
    discountTotal: 0,
    kdvTotal: 0,
    grandTotal: 0,

    addItemByBarcode: async (barcode: string) => {
        const { items, cartDiscountAmount } = get();
        const existing = items.find((i) => i.barcode === barcode);
        if (existing) {
            const updated = items.map((i) =>
                i.barcode === barcode ? { ...i, quantity: i.quantity + 1 } : i,
            );
            set({ ...enrichAndTotals(updated, cartDiscountAmount) });
            return { success: true };
        }
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
                lineDiscountMode: 'none',
                lineDiscountValue: 0,
                displayGross: 0,
                displayLineDiscount: 0,
                displayLineTotal: 0,
            };
            const updated = [...items, newItem];
            set({ ...enrichAndTotals(updated, cartDiscountAmount) });
            return { success: true };
        } catch {
            return { success: false, error: 'Ürün bulunamadı' };
        }
    },

    addItemFromSearchRow: (row) => {
        const available = row.stockQuantity - row.reservedQty;
        if (!row.isActive) {
            return { success: false, error: 'Bu varyasyon satışa kapalı' };
        }
        if (available < 1) {
            return { success: false, error: 'Yetersiz stok' };
        }
        const { items, cartDiscountAmount } = get();
        const existing = items.find((i) => i.barcode === row.barcode);
        if (existing) {
            if (existing.quantity >= available) {
                return { success: false, error: 'Sepetteki adet mevcut stoku aşamaz' };
            }
            const updated = items.map((i) =>
                i.barcode === row.barcode ? { ...i, quantity: i.quantity + 1 } : i,
            );
            set({ ...enrichAndTotals(updated, cartDiscountAmount) });
            return { success: true };
        }
        const newItem: CartItem = {
            variantId: row.id,
            barcode: row.barcode,
            productName: row.product.name,
            color: row.color,
            size: row.size,
            quantity: 1,
            unitPrice: parseFloat(String(row.effectiveSalePrice ?? '0')),
            costPrice: parseFloat(String(row.effectiveCostPrice ?? '0')),
            kdvRate: parseFloat(String(row.kdvRate ?? '20')),
            lineDiscountMode: 'none',
            lineDiscountValue: 0,
            displayGross: 0,
            displayLineDiscount: 0,
            displayLineTotal: 0,
        };
        const updated = [...items, newItem];
        set({ ...enrichAndTotals(updated, cartDiscountAmount) });
        return { success: true };
    },

    removeItem: (variantId) => {
        const { items, cartDiscountAmount } = get();
        const updated = items.filter((i) => i.variantId !== variantId);
        set({ ...enrichAndTotals(updated, cartDiscountAmount) });
    },

    updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
            get().removeItem(variantId);
            return;
        }
        const { items, cartDiscountAmount } = get();
        const updated = items.map((i) =>
            i.variantId === variantId ? { ...i, quantity } : i,
        );
        set({ ...enrichAndTotals(updated, cartDiscountAmount) });
    },

    setLineDiscount: (variantId, mode, value) => {
        const { items, cartDiscountAmount } = get();
        const v = mode === 'percent' ? Math.min(100, Math.max(0, value)) : Math.max(0, value);
        const updated = items.map((i) =>
            i.variantId === variantId
                ? {
                      ...i,
                      lineDiscountMode: (mode === 'none' ? 'none' : mode) as LineDiscountMode,
                      lineDiscountValue: mode === 'none' ? 0 : v,
                  }
                : i,
        );
        set({ ...enrichAndTotals(updated, cartDiscountAmount) });
    },

    setCartDiscountAmount: (amount) => {
        const { items } = get();
        const a = Math.max(0, round2(amount));
        set({ cartDiscountAmount: a, ...enrichAndTotals(items, a) });
    },

    setCustomer: (id, name) => set({ customerId: id, customerName: name }),

    clearCart: () =>
        set({
            customerId: null,
            customerName: null,
            cartDiscountAmount: 0,
            ...emptyTotals,
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

        const items = st.items.map((i) => {
            const row: {
                barcode: string;
                quantity: number;
                lineDiscountPercent?: number;
                lineDiscountAmount?: number;
            } = { barcode: i.barcode, quantity: i.quantity };
            if (i.lineDiscountMode === 'percent' && i.lineDiscountValue > 0) {
                row.lineDiscountPercent = i.lineDiscountValue;
            } else if (i.lineDiscountMode === 'fixed' && i.lineDiscountValue > 0) {
                row.lineDiscountAmount = round2(i.lineDiscountValue);
            }
            return row;
        });

        try {
            const body: {
                items: typeof items;
                payments: CheckoutPaymentLine[];
                customerId?: string;
                cartDiscountAmount?: number;
            } = { items, payments };
            if (cid) body.customerId = cid;
            if (st.cartDiscountAmount > 0) {
                body.cartDiscountAmount = round2(st.cartDiscountAmount);
            }
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

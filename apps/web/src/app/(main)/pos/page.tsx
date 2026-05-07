'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ShoppingCart, Trash2, Minus, Plus, CreditCard, Loader2, Search, ScanBarcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useCartStore, type CheckoutPaymentLine, type PosSearchVariantRow } from '@/stores/useCartStore';
import { api, formatCurrency } from '@/lib/api';
import { cn } from '@/lib/utils';

interface VoucherLookupOk {
    code: string;
    currentBalance: string;
    status: string;
}

type PosPaymentMethod = 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'OPEN_ACCOUNT' | 'GIFT_VOUCHER';

type PosInputMode = 'barcode' | 'search';

export default function PosPage() {
    const barcodeRef = useRef<HTMLInputElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const [inputMode, setInputMode] = useState<PosInputMode>('barcode');
    const [barcodeInput, setBarcodeInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [searchResults, setSearchResults] = useState<PosSearchVariantRow[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [scanFeedback, setScanFeedback] = useState<'success' | 'error' | null>(null);
    const [showPayment, setShowPayment] = useState(false);
    const [payLoading, setPayLoading] = useState(false);
    const [payError, setPayError] = useState<string | null>(null);
    const [selectedPayment, setSelectedPayment] = useState<PosPaymentMethod | null>(null);
    const [remainderPayment, setRemainderPayment] = useState<
        'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'OPEN_ACCOUNT' | null
    >(null);
    const [voucherCode, setVoucherCode] = useState('');
    const [voucherLookupLoading, setVoucherLookupLoading] = useState(false);
    const [voucherInfo, setVoucherInfo] = useState<VoucherLookupOk | null>(null);
    const [customersOpenAccount, setCustomersOpenAccount] = useState<
        { id: string; name: string; surname?: string | null }[]
    >([]);
    const [selectedCustomerOpenAccount, setSelectedCustomerOpenAccount] = useState('');

    const items = useCartStore((s) => s.items);
    const subtotal = useCartStore((s) => s.subtotal);
    const discountTotal = useCartStore((s) => s.discountTotal);
    const kdvTotal = useCartStore((s) => s.kdvTotal);
    const grandTotal = useCartStore((s) => s.grandTotal);
    const cartDiscountAmount = useCartStore((s) => s.cartDiscountAmount);
    const addItemByBarcode = useCartStore((s) => s.addItemByBarcode);
    const addItemFromSearchRow = useCartStore((s) => s.addItemFromSearchRow);
    const removeItem = useCartStore((s) => s.removeItem);
    const updateQuantity = useCartStore((s) => s.updateQuantity);
    const setLineDiscount = useCartStore((s) => s.setLineDiscount);
    const setCartDiscountAmount = useCartStore((s) => s.setCartDiscountAmount);
    const clearCart = useCartStore((s) => s.clearCart);
    const completeCheckout = useCartStore((s) => s.completeCheckout);

    const loadCustomersForOpenAccount = useCallback(async () => {
        try {
            const res = await api.get('/customers', { params: { limit: 100, page: 1 } });
            const rows = res.data?.data ?? [];
            setCustomersOpenAccount(
                rows.map((c: { id: string; name: string; surname?: string | null }) => ({
                    id: c.id,
                    name: c.name,
                    surname: c.surname,
                })),
            );
        } catch {
            setCustomersOpenAccount([]);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 320);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        if (inputMode !== 'search') return;
        if (debouncedSearch.length < 2) {
            setSearchResults([]);
            setSearchError(null);
            setSearchLoading(false);
            return;
        }
        let cancelled = false;
        setSearchLoading(true);
        setSearchError(null);
        (async () => {
            try {
                const res = await api.get<{ data: PosSearchVariantRow[] }>('/products/variants', {
                    params: { search: debouncedSearch, page: 1, limit: 50 },
                });
                if (!cancelled) {
                    const raw = res.data?.data;
                    setSearchResults(Array.isArray(raw) ? raw : []);
                }
            } catch {
                if (!cancelled) {
                    setSearchResults([]);
                    setSearchError('Arama yapılamadı');
                }
            } finally {
                if (!cancelled) setSearchLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [debouncedSearch, inputMode]);

    useEffect(() => {
        if (inputMode === 'barcode') {
            barcodeRef.current?.focus();
        } else {
            searchRef.current?.focus();
        }
    }, [inputMode]);

    useEffect(() => {
        if (
            showPayment &&
            (selectedPayment === 'OPEN_ACCOUNT' || remainderPayment === 'OPEN_ACCOUNT')
        ) {
            loadCustomersForOpenAccount();
        }
    }, [showPayment, selectedPayment, remainderPayment, loadCustomersForOpenAccount]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                clearCart();
                setSearchQuery('');
                setDebouncedSearch('');
                setSearchResults([]);
                if (inputMode === 'barcode') {
                    barcodeRef.current?.focus();
                } else {
                    searchRef.current?.focus();
                }
            }
            if (e.key === 'F4') {
                e.preventDefault();
                if (items.length > 0) {
                    setShowPayment(true);
                    setPayError(null);
                    setSelectedPayment(null);
                    setRemainderPayment(null);
                    setVoucherCode('');
                    setVoucherInfo(null);
                }
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setShowPayment(false);
                setPayError(null);
                setPayLoading(false);
                setSelectedPayment(null);
                setRemainderPayment(null);
                setVoucherCode('');
                setVoucherInfo(null);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [items.length, clearCart, inputMode]);

    const handlePickSearchRow = (row: PosSearchVariantRow) => {
        const result = addItemFromSearchRow(row);
        if (result.success) {
            setScanFeedback('success');
        } else {
            setScanFeedback('error');
            setSearchError(result.error ?? 'Eklenemedi');
        }
        setTimeout(() => setScanFeedback(null), 600);
        if (result.success) {
            setSearchError(null);
        }
    };

    const handleBarcodeScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!barcodeInput.trim()) return;
        const result = await addItemByBarcode(barcodeInput.trim());
        setScanFeedback(result.success ? 'success' : 'error');
        setTimeout(() => setScanFeedback(null), 600);
        setBarcodeInput('');
        barcodeRef.current?.focus();
    };

    const roundedTotal = useMemo(() => Number(grandTotal.toFixed(2)), [grandTotal]);
    const voucherAppliedPreview = useMemo(() => {
        if (selectedPayment !== 'GIFT_VOUCHER' || !voucherInfo) return 0;
        const bal = parseFloat(voucherInfo.currentBalance);
        if (Number.isNaN(bal)) return 0;
        return Number(Math.min(bal, roundedTotal).toFixed(2));
    }, [selectedPayment, voucherInfo, roundedTotal]);
    const remainderPreview = useMemo(
        () => Number(Math.max(0, roundedTotal - voucherAppliedPreview).toFixed(2)),
        [roundedTotal, voucherAppliedPreview],
    );

    const resetPaymentDialog = () => {
        setRemainderPayment(null);
        setVoucherCode('');
        setVoucherInfo(null);
        setSelectedCustomerOpenAccount('');
    };

    const lookupVoucher = async () => {
        const raw = voucherCode.trim();
        if (!raw) {
            setPayError('Çek numarasını girin');
            return;
        }
        setVoucherLookupLoading(true);
        setPayError(null);
        try {
            const res = await api.get('/gift-vouchers/lookup', { params: { code: raw } });
            const d = res.data as VoucherLookupOk;
            setVoucherInfo({
                code: d.code,
                currentBalance: d.currentBalance,
                status: d.status,
            });
        } catch (err: unknown) {
            setVoucherInfo(null);
            const msg =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            setPayError(typeof msg === 'string' ? msg : 'Çek bulunamadı veya kullanılamıyor');
        } finally {
            setVoucherLookupLoading(false);
        }
    };

    const finalizePayment = async () => {
        if (payLoading) return;
        if (!selectedPayment) return;

        setPayLoading(true);
        setPayError(null);

        let payments: CheckoutPaymentLine[];
        let customerForOpenAccount: string | undefined;

        if (selectedPayment === 'GIFT_VOUCHER') {
            if (!voucherInfo) {
                setPayLoading(false);
                setPayError('Önce hediye çekini sorgulayın');
                return;
            }
            const voucherPart = voucherAppliedPreview;
            const remainder = remainderPreview;
            payments = [
                { type: 'GIFT_VOUCHER', amount: voucherPart, reference: voucherInfo.code },
            ];
            if (remainder > 0.005) {
                if (!remainderPayment) {
                    setPayLoading(false);
                    setPayError('Kalan tutar için ödeme yöntemi seçin');
                    return;
                }
                if (remainderPayment === 'OPEN_ACCOUNT' && !selectedCustomerOpenAccount) {
                    setPayLoading(false);
                    setPayError('Açık hesap için müşteri seçin');
                    return;
                }
                payments.push({ type: remainderPayment, amount: remainder });
                customerForOpenAccount =
                    remainderPayment === 'OPEN_ACCOUNT' ? selectedCustomerOpenAccount : undefined;
            }
        } else {
            if (selectedPayment === 'OPEN_ACCOUNT' && !selectedCustomerOpenAccount) {
                setPayLoading(false);
                setPayError('Açık hesap için müşteri seçin');
                return;
            }
            customerForOpenAccount =
                selectedPayment === 'OPEN_ACCOUNT' ? selectedCustomerOpenAccount : undefined;
            payments = [{ type: selectedPayment, amount: roundedTotal }];
        }

        const outcome = await completeCheckout(payments, customerForOpenAccount);
        setPayLoading(false);
        if (outcome.success) {
            setShowPayment(false);
            setSelectedPayment(null);
            resetPaymentDialog();
            if (inputMode === 'barcode') barcodeRef.current?.focus();
            else searchRef.current?.focus();
            return;
        }
        setPayError(outcome.error ?? 'İşlem reddedildi');
    };

    const paymentOptions: Array<{
        label: string;
        icon: string;
        method: PosPaymentMethod;
    }> = [
        { label: 'Nakit', icon: '💵', method: 'CASH' },
        { label: 'Kredi Kartı', icon: '💳', method: 'CREDIT_CARD' },
        { label: 'Havale/EFT', icon: '🏦', method: 'BANK_TRANSFER' },
        { label: 'Açık Hesap', icon: '📋', method: 'OPEN_ACCOUNT' },
        { label: 'Hediye çeki', icon: '🎁', method: 'GIFT_VOUCHER' },
    ];

    const remainderOptions: Array<{
        label: string;
        icon: string;
        method: 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'OPEN_ACCOUNT';
    }> = [
        { label: 'Kalan — Nakit', icon: '💵', method: 'CASH' },
        { label: 'Kalan — Kart', icon: '💳', method: 'CREDIT_CARD' },
        { label: 'Kalan — Havale', icon: '🏦', method: 'BANK_TRANSFER' },
        { label: 'Kalan — Açık hesap', icon: '📋', method: 'OPEN_ACCOUNT' },
    ];

    return (
        <div className="flex h-[calc(100vh-5rem)] overflow-hidden">
            <div className="flex-1 flex flex-col p-4 min-h-0">
                <div className="flex gap-1 p-0.5 rounded-lg bg-muted/50 border border-border mb-3 w-fit">
                    <button
                        type="button"
                        onClick={() => {
                            setInputMode('barcode');
                            setSearchError(null);
                        }}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                            inputMode === 'barcode'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <ScanBarcode className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Barkod
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setInputMode('search');
                            setScanFeedback(null);
                        }}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                            inputMode === 'search'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <Search className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Ürün ara
                    </button>
                </div>

                {inputMode === 'barcode' ? (
                    <form onSubmit={handleBarcodeScan} className="mb-4 shrink-0">
                        <div className="relative">
                            <Input
                                ref={barcodeRef}
                                value={barcodeInput}
                                onChange={(e) => setBarcodeInput(e.target.value)}
                                placeholder="Barkod okutun veya yazın..."
                                className={`h-12 text-lg font-mono transition-colors ${
                                    scanFeedback === 'success'
                                        ? 'border-success bg-success/5'
                                        : scanFeedback === 'error'
                                          ? 'border-destructive bg-destructive/5'
                                          : ''
                                }`}
                                autoComplete="off"
                            />
                        </div>
                    </form>
                ) : (
                    <div className="mb-3 space-y-2 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                ref={searchRef}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Ürün adı, barkod, tedarik kodu, marka, kategori…"
                                className={cn(
                                    'h-12 text-base pl-10 transition-colors',
                                    scanFeedback === 'success' && 'border-success bg-success/5',
                                    scanFeedback === 'error' && 'border-destructive bg-destructive/5',
                                )}
                                autoComplete="off"
                            />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            En az 2 karakter yazın. Satıra tıklayınca sepete 1 adet eklenir.
                        </p>
                        {searchError && (
                            <p className="text-xs text-destructive" role="alert">
                                {searchError}
                            </p>
                        )}
                    </div>
                )}

                <div className="flex gap-2 mb-4 shrink-0">
                    {[
                        {
                            key: 'F2',
                            label: 'Yeni Satış',
                            action: () => {
                                clearCart();
                                setSearchQuery('');
                                setDebouncedSearch('');
                                setSearchResults([]);
                                if (inputMode === 'barcode') {
                                    barcodeRef.current?.focus();
                                } else {
                                    searchRef.current?.focus();
                                }
                            },
                        },
                        {
                            key: 'F4',
                            label: 'Ödeme',
                            action: () =>
                                items.length > 0 &&
                                (setShowPayment(true),
                                setPayError(null),
                                setSelectedPayment(null),
                                setRemainderPayment(null),
                                setVoucherCode(''),
                                setVoucherInfo(null)),
                        },
                        {
                            key: 'Esc',
                            label: 'İptal',
                            action: () =>
                                (setShowPayment(false), setPayError(null), setPayLoading(false)),
                        },
                    ].map((s) => (
                        <button
                            key={s.key}
                            type="button"
                            onClick={s.action}
                            className="flex items-center gap-1.5 px-2 py-1 rounded border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                            <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">
                                {s.key}
                            </kbd>
                            {s.label}
                        </button>
                    ))}
                </div>

                {inputMode === 'search' && debouncedSearch.length >= 2 && (
                    <div className="flex-1 min-h-0 rounded-[10px] border border-border bg-card overflow-hidden flex flex-col">
                        <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">
                                Sonuçlar{' '}
                                {!searchLoading && (
                                    <span className="text-muted-foreground font-normal">
                                        ({searchResults.length})
                                    </span>
                                )}
                            </span>
                            {searchLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {searchResults.length === 0 && !searchLoading ? (
                                <p className="text-sm text-muted-foreground p-4 text-center">
                                    Eşleşen varyasyon bulunamadı.
                                </p>
                            ) : (
                                <ul className="divide-y divide-border">
                                    {searchResults.map((row) => {
                                        const avail = row.stockQuantity - row.reservedQty;
                                        const disabled = !row.isActive || avail < 1;
                                        return (
                                            <li key={row.id}>
                                                <button
                                                    type="button"
                                                    disabled={disabled}
                                                    onClick={() => handlePickSearchRow(row)}
                                                    className={cn(
                                                        'w-full text-left px-3 py-2.5 hover:bg-accent/60 transition-colors disabled:opacity-50 disabled:pointer-events-none',
                                                    )}
                                                >
                                                    <div className="flex justify-between gap-2">
                                                        <p className="text-[13px] font-medium text-foreground line-clamp-2">
                                                            {row.product.name}
                                                        </p>
                                                        <p className="text-[13px] font-mono tabular-nums text-primary shrink-0">
                                                            {formatCurrency(parseFloat(row.effectiveSalePrice))}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                                                        <span>
                                                            <span className="font-medium text-foreground/80">Barkod:</span>{' '}
                                                            {row.barcode}
                                                        </span>
                                                        <span>
                                                            {row.color} / {row.size}
                                                        </span>
                                                        {row.product.brand && <span>{row.product.brand}</span>}
                                                        {row.product.category && <span>{row.product.category}</span>}
                                                        {row.product.supplierCode && (
                                                            <span>Ted: {row.product.supplierCode}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2 mt-1 text-[11px]">
                                                        <span
                                                            className={cn(
                                                                avail < 1
                                                                    ? 'text-destructive'
                                                                    : 'text-muted-foreground',
                                                            )}
                                                        >
                                                            Stok: {avail}
                                                        </span>
                                                        {!row.isActive && (
                                                            <span className="text-amber-600 dark:text-amber-500">
                                                                Pasif
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {inputMode === 'barcode' && items.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <ShoppingCart
                                className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20"
                                strokeWidth={1.5}
                            />
                            <p className="text-sm text-muted-foreground">Sepet boş</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Barkod okutarak veya ürün arayarak ekleyin
                            </p>
                        </div>
                    </div>
                )}

                {inputMode === 'search' && debouncedSearch.length < 2 && items.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center max-w-sm">
                            <Search
                                className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20"
                                strokeWidth={1.5}
                            />
                            <p className="text-sm text-muted-foreground">Ürün araması</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Ürün adı, barkod, marka veya tedarik kodu ile arayın; sonuçlardan birini seçerek
                                sepete ekleyin.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-[340px] border-l border-border bg-card flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                        <span className="text-sm font-medium text-foreground">Sepet</span>
                        <Badge variant="secondary" className="text-[10px]">
                            {items.length}
                        </Badge>
                    </div>
                    {items.length > 0 && (
                        <button
                            type="button"
                            onClick={clearCart}
                            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                            Temizle
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {items.map((item) => (
                        <div
                            key={item.variantId}
                            className="px-4 py-2 border-b border-border hover:bg-accent/30 transition-colors space-y-1.5"
                        >
                            <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] text-foreground truncate">{item.productName}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {item.color} / {item.size}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            updateQuantity(item.variantId, item.quantity - 1)
                                        }
                                        className="p-0.5 rounded hover:bg-muted"
                                    >
                                        <Minus className="w-3 h-3 text-muted-foreground" />
                                    </button>
                                    <span className="w-6 text-center text-xs font-mono">
                                        {item.quantity}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            updateQuantity(item.variantId, item.quantity + 1)
                                        }
                                        className="p-0.5 rounded hover:bg-muted"
                                    >
                                        <Plus className="w-3 h-3 text-muted-foreground" />
                                    </button>
                                </div>
                                <div className="text-right shrink-0 w-[72px]">
                                    {item.displayLineDiscount > 0.004 ? (
                                        <>
                                            <p className="text-[11px] line-through text-muted-foreground font-mono tabular-nums">
                                                {formatCurrency(item.displayGross)}
                                            </p>
                                            <p className="text-[13px] font-mono tabular-nums text-foreground">
                                                {formatCurrency(item.displayLineTotal)}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-[13px] font-mono tabular-nums text-foreground">
                                            {formatCurrency(item.displayLineTotal)}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeItem(item.variantId)}
                                    className="p-0.5 rounded hover:bg-destructive/10 shrink-0"
                                >
                                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                                </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 pl-0.5">
                                <span className="text-[10px] text-muted-foreground uppercase">
                                    İnd
                                </span>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.5}
                                    placeholder="%"
                                    className="h-7 w-14 text-[11px] px-1.5"
                                    value={
                                        item.lineDiscountMode === 'percent'
                                            ? item.lineDiscountValue || ''
                                            : ''
                                    }
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        if (raw === '') {
                                            setLineDiscount(item.variantId, 'none', 0);
                                            return;
                                        }
                                        const v = parseFloat(raw);
                                        if (!Number.isNaN(v)) {
                                            setLineDiscount(item.variantId, 'percent', v);
                                        }
                                    }}
                                />
                                <Input
                                    type="number"
                                    min={0}
                                    step={1}
                                    placeholder="₺"
                                    className="h-7 w-[4.5rem] text-[11px] px-1.5"
                                    value={
                                        item.lineDiscountMode === 'fixed'
                                            ? item.lineDiscountValue || ''
                                            : ''
                                    }
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        if (raw === '') {
                                            setLineDiscount(item.variantId, 'none', 0);
                                            return;
                                        }
                                        const v = parseFloat(raw);
                                        if (!Number.isNaN(v)) {
                                            setLineDiscount(item.variantId, 'fixed', v);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t border-border px-4 py-3 space-y-2">
                    <div className="space-y-1">
                        <Label htmlFor="cart-discount" className="text-[11px] text-muted-foreground">
                            Sepet indirimi (tüm satırlara eşit pay, ₺)
                        </Label>
                        <Input
                            id="cart-discount"
                            type="number"
                            min={0}
                            step={1}
                            className="h-8 text-sm"
                            value={cartDiscountAmount > 0 ? cartDiscountAmount : ''}
                            onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '') {
                                    setCartDiscountAmount(0);
                                    return;
                                }
                                const v = parseFloat(raw);
                                if (!Number.isNaN(v)) setCartDiscountAmount(v);
                            }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Ara toplam (brüt)</span>
                        <span className="font-mono tabular-nums">{formatCurrency(subtotal)}</span>
                    </div>
                    {discountTotal > 0.004 && (
                        <div className="flex justify-between text-xs text-amber-700 dark:text-amber-400">
                            <span>İndirim</span>
                            <span className="font-mono tabular-nums">−{formatCurrency(discountTotal)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>KDV</span>
                        <span className="font-mono tabular-nums">{formatCurrency(kdvTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-foreground pt-1.5 border-t border-border">
                        <span>Toplam</span>
                        <span className="font-mono tabular-nums text-lg">{formatCurrency(grandTotal)}</span>
                    </div>
                </div>

                <div className="px-4 pb-4">
                    <Button
                        type="button"
                        onClick={() => {
                            setShowPayment(true);
                            setPayError(null);
                            setSelectedPayment(null);
                            setRemainderPayment(null);
                            setVoucherCode('');
                            setVoucherInfo(null);
                        }}
                        disabled={items.length === 0}
                        className="w-full h-10 gap-2"
                    >
                        <CreditCard className="w-4 h-4" />
                        Ödeme (F4)
                    </Button>
                </div>
            </div>

            <Dialog
                open={showPayment}
                onOpenChange={(o) => {
                    if (payLoading) return;
                    setShowPayment(o);
                    if (!o) {
                        setPayError(null);
                        setSelectedPayment(null);
                        resetPaymentDialog();
                    }
                }}
            >
                <DialogContent className="sm:max-w-md" showCloseButton={!payLoading}>
                    <DialogHeader>
                        <DialogTitle>Ödeme</DialogTitle>
                        <DialogDescription>Bir yöntem seçin ve işlemi tamamlayın.</DialogDescription>
                    </DialogHeader>

                    <div className="py-2 space-y-4">
                        <p className="text-center text-3xl font-semibold font-mono tabular-nums text-foreground">
                            {formatCurrency(grandTotal)}
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {paymentOptions.map((pm) => (
                                <button
                                    key={pm.method}
                                    type="button"
                                    onClick={() => {
                                        setSelectedPayment(pm.method);
                                        setPayError(null);
                                        if (pm.method !== 'GIFT_VOUCHER') {
                                            setVoucherCode('');
                                            setVoucherInfo(null);
                                        }
                                        setRemainderPayment(null);
                                    }}
                                    className={cn(
                                        'flex flex-col items-center gap-1.5 p-3 rounded-[10px] border transition-colors',
                                        selectedPayment === pm.method
                                            ? 'border-primary bg-primary/10'
                                            : 'border-border hover:border-primary/60 hover:bg-accent/50',
                                    )}
                                >
                                    <span className="text-xl">{pm.icon}</span>
                                    <span className="text-xs text-center text-foreground leading-tight">
                                        {pm.label}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {selectedPayment === 'GIFT_VOUCHER' && (
                            <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/30">
                                <Label htmlFor="voucher-code">Hediye çeki numarası</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="voucher-code"
                                        className="font-mono text-sm"
                                        placeholder="Örn. HV..."
                                        value={voucherCode}
                                        onChange={(e) => {
                                            setVoucherCode(e.target.value);
                                            setVoucherInfo(null);
                                        }}
                                        autoComplete="off"
                                    />
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="shrink-0 gap-1"
                                        disabled={voucherLookupLoading}
                                        onClick={() => lookupVoucher()}
                                    >
                                        {voucherLookupLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Search className="w-4 h-4" />
                                        )}
                                        Sorgula
                                    </Button>
                                </div>
                                {voucherInfo && (
                                    <div className="text-sm space-y-1 pt-1">
                                        <p>
                                            <span className="text-muted-foreground">Kullanılabilir: </span>
                                            <span className="font-mono font-medium tabular-nums">
                                                {formatCurrency(parseFloat(voucherInfo.currentBalance))}
                                            </span>
                                        </p>
                                        <p>
                                            <span className="text-muted-foreground">Bu satışta düşülecek: </span>
                                            <span className="font-mono font-semibold tabular-nums text-primary">
                                                {formatCurrency(voucherAppliedPreview)}
                                            </span>
                                        </p>
                                        {remainderPreview > 0.005 && (
                                            <p className="text-amber-700 dark:text-amber-500">
                                                Kalan {formatCurrency(remainderPreview)} için aşağıdan yöntem
                                                seçin.
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            Durum: {voucherInfo.status}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedPayment === 'GIFT_VOUCHER' && remainderPreview > 0.005 && (
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Kalan tutar ödemesi
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {remainderOptions.map((pm) => (
                                        <button
                                            key={pm.method}
                                            type="button"
                                            onClick={() => {
                                                setRemainderPayment(pm.method);
                                                setPayError(null);
                                            }}
                                            className={cn(
                                                'flex flex-col items-center gap-1 p-2 rounded-[10px] border transition-colors text-xs',
                                                remainderPayment === pm.method
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border hover:border-primary/60',
                                            )}
                                        >
                                            <span className="text-lg">{pm.icon}</span>
                                            <span>{pm.label.replace('Kalan — ', '')}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(selectedPayment === 'OPEN_ACCOUNT' ||
                            (selectedPayment === 'GIFT_VOUCHER' &&
                                remainderPreview > 0.005 &&
                                remainderPayment === 'OPEN_ACCOUNT')) && (
                            <div className="space-y-1.5">
                                <Label htmlFor="open-account-customer">Müşteri</Label>
                                <select
                                    id="open-account-customer"
                                    className="w-full h-[34px] rounded-md border border-input bg-transparent px-2 text-[13px]"
                                    value={selectedCustomerOpenAccount}
                                    onChange={(e) => setSelectedCustomerOpenAccount(e.target.value)}
                                >
                                    <option value="">Müşteri seçin…</option>
                                    {customersOpenAccount.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {[c.name, c.surname].filter(Boolean).join(' ') ||
                                                c.id.slice(0, 8)}
                                        </option>
                                    ))}
                                </select>
                                {customersOpenAccount.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        Müşteri listesi boşsa önce Müşteriler sayfasından kayıt açın.
                                    </p>
                                )}
                            </div>
                        )}

                        {payError && (
                            <p className="text-sm text-destructive text-center" role="alert">
                                {payError}
                            </p>
                        )}
                    </div>

                    <DialogFooter className="-mx-4 border-t bg-transparent px-4 pt-2 sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowPayment(false)}
                            disabled={payLoading}
                        >
                            İptal
                        </Button>
                        <Button
                            type="button"
                            onClick={() => finalizePayment()}
                            disabled={
                                !selectedPayment ||
                                payLoading ||
                                (selectedPayment === 'GIFT_VOUCHER' &&
                                    (!voucherInfo ||
                                        (remainderPreview > 0.005 && !remainderPayment)))
                            }
                        >
                            {payLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Gönderiliyor…
                                </>
                            ) : (
                                'Ödemeyi Tamamla'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Gift, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { api, formatCurrency } from '@/lib/api';

type GiftVoucherRow = {
    id: string;
    code: string;
    source: 'CORPORATE' | 'RETURN_REFUND';
    companyName: string | null;
    notes: string | null;
    initialBalance: unknown;
    currentBalance: unknown;
    status: string;
    expiresAt: string | null;
    sourceOrder: { id: string; orderNumber: string } | null;
};

type OrderListItem = {
    id: string;
    orderNumber: string;
    status: string;
    grandTotal: unknown;
    createdAt: string;
};

type OrderLine = {
    id: string;
    quantity: number;
    returnedQty: number;
    lineTotal: unknown;
    variant: { barcode: string; color: string; size: string; product: { name: string } };
};

function sourceLabel(s: string) {
    if (s === 'RETURN_REFUND') return 'İade';
    return 'Kurumsal';
}

function statusLabel(s: string) {
    const m: Record<string, string> = {
        ACTIVE: 'Aktif',
        PARTIALLY_USED: 'Kısmen kullanıldı',
        FULLY_USED: 'Tamamlandı',
        EXPIRED: 'Süresi doldu',
        BLACKLISTED: 'Kullanıma kapalı',
    };
    return m[s] ?? s;
}

export default function GiftVouchersPage() {
    const [rows, setRows] = useState<GiftVoucherRow[]>([]);
    const [listLoading, setListLoading] = useState(true);
    const [corpOpen, setCorpOpen] = useState(false);
    const [corpAmount, setCorpAmount] = useState('');
    const [corpCompany, setCorpCompany] = useState('');
    const [corpNotes, setCorpNotes] = useState('');
    const [corpExpires, setCorpExpires] = useState('');
    const [corpSaving, setCorpSaving] = useState(false);
    const [corpError, setCorpError] = useState<string | null>(null);

    const [orders, setOrders] = useState<OrderListItem[]>([]);
    const [orderPickLoading, setOrderPickLoading] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState('');
    const [orderDetailLoading, setOrderDetailLoading] = useState(false);
    const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
    const [returnQty, setReturnQty] = useState<Record<string, number>>({});
    const [issueVoucherOnReturn, setIssueVoucherOnReturn] = useState(true);
    const [returnSubmitting, setReturnSubmitting] = useState(false);
    const [returnMessage, setReturnMessage] = useState<string | null>(null);
    const [returnError, setReturnError] = useState<string | null>(null);

    const loadList = useCallback(async () => {
        setListLoading(true);
        try {
            const res = await api.get('/gift-vouchers', { params: { page: 1, limit: 100 } });
            setRows((res.data?.data ?? []) as GiftVoucherRow[]);
        } catch {
            setRows([]);
        } finally {
            setListLoading(false);
        }
    }, []);

    useEffect(() => {
        loadList();
    }, [loadList]);

    const loadOrdersForPicker = useCallback(async () => {
        setOrderPickLoading(true);
        try {
            const res = await api.get('/sales/orders', { params: { page: 1, limit: 50 } });
            setOrders((res.data?.data ?? []) as OrderListItem[]);
        } catch {
            setOrders([]);
        } finally {
            setOrderPickLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOrdersForPicker();
    }, [loadOrdersForPicker]);

    useEffect(() => {
        if (!selectedOrderId) {
            setOrderLines([]);
            setReturnQty({});
            return;
        }
        let cancelled = false;
        (async () => {
            setOrderDetailLoading(true);
            setReturnError(null);
            setReturnMessage(null);
            try {
                const res = await api.get(`/sales/orders/${selectedOrderId}`);
                if (cancelled) return;
                const items = (res.data?.items ?? []) as OrderLine[];
                setOrderLines(items);
                const initial: Record<string, number> = {};
                for (const it of items) {
                    initial[it.id] = 0;
                }
                setReturnQty(initial);
            } catch {
                if (!cancelled) {
                    setOrderLines([]);
                    setReturnQty({});
                }
            } finally {
                if (!cancelled) setOrderDetailLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedOrderId]);

    const submitCorporate = async () => {
        const amt = parseFloat(corpAmount.replace(',', '.'));
        if (Number.isNaN(amt) || amt <= 0) {
            setCorpError('Geçerli bir tutar girin');
            return;
        }
        setCorpSaving(true);
        setCorpError(null);
        try {
            await api.post('/gift-vouchers', {
                amount: amt,
                companyName: corpCompany.trim() || undefined,
                notes: corpNotes.trim() || undefined,
                expiresAt: corpExpires || undefined,
            });
            setCorpOpen(false);
            setCorpAmount('');
            setCorpCompany('');
            setCorpNotes('');
            setCorpExpires('');
            await loadList();
        } catch (e: unknown) {
            const msg =
                e && typeof e === 'object' && 'response' in e
                    ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            setCorpError(typeof msg === 'string' ? msg : 'Kayıt oluşturulamadı');
        } finally {
            setCorpSaving(false);
        }
    };

    const submitReturn = async () => {
        if (!selectedOrderId) {
            setReturnError('Sipariş seçin');
            return;
        }
        const items = Object.entries(returnQty)
            .filter(([, q]) => q > 0)
            .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));
        if (!items.length) {
            setReturnError('İade miktarı girin');
            return;
        }
        setReturnSubmitting(true);
        setReturnError(null);
        setReturnMessage(null);
        try {
            const res = await api.post('/sales/returns', {
                orderId: selectedOrderId,
                items,
                issueGiftVoucher: issueVoucherOnReturn,
            });
            const gv = res.data?.giftVoucher as { code?: string } | undefined;
            const msg = gv?.code
                ? `İade tamamlandı. Hediye çeki: ${gv.code}`
                : 'İade tamamlandı.';
            setReturnMessage(msg);
            setSelectedOrderId('');
            setOrderLines([]);
            setReturnQty({});
            await loadList();
            await loadOrdersForPicker();
        } catch (e: unknown) {
            const msg =
                e && typeof e === 'object' && 'response' in e
                    ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            setReturnError(typeof msg === 'string' ? msg : 'İade işlenemedi');
        } finally {
            setReturnSubmitting(false);
        }
    };

    return (
        <div className="p-6 space-y-8 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                        <Gift className="w-6 h-6 text-primary" strokeWidth={1.5} />
                        Hediye çekleri
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Kurumsal çek oluşturma, liste ve satış iadesinden çek üretimi.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => loadList()}>
                        <RefreshCw className="w-4 h-4 mr-1.5" />
                        Yenile
                    </Button>
                    <Button type="button" size="sm" onClick={() => setCorpOpen(true)}>
                        Kurumsal çek oluştur
                    </Button>
                </div>
            </div>

            <section className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h2 className="text-sm font-medium">İade ile hediye çeki</h2>
                <p className="text-xs text-muted-foreground">
                    Tamamlanmış satışlardan kalem seçerek iade alın; isteğe bağlı olarak iade tutarı
                    kadar otomatik hediye çeki üretilir.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label>Sipariş</Label>
                        <select
                            className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                            value={selectedOrderId}
                            onChange={(e) => setSelectedOrderId(e.target.value)}
                            disabled={orderPickLoading}
                        >
                            <option value="">Sipariş seçin…</option>
                            {orders.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.orderNumber} — {statusLabel(o.status)} —{' '}
                                    {formatCurrency(parseFloat(String(o.grandTotal ?? 0)))}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                className="rounded border-input"
                                checked={issueVoucherOnReturn}
                                onChange={(e) => setIssueVoucherOnReturn(e.target.checked)}
                            />
                            İade tutarı kadar hediye çeki oluştur
                        </label>
                    </div>
                </div>

                {orderDetailLoading && (
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Sipariş yükleniyor…
                    </p>
                )}

                {!!orderLines.length && (
                    <div className="rounded-lg border border-border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ürün</TableHead>
                                    <TableHead>Barkod</TableHead>
                                    <TableHead className="text-right">Satılan</TableHead>
                                    <TableHead className="text-right">İade edilen</TableHead>
                                    <TableHead className="text-right w-28">Bu iade</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orderLines.map((line) => {
                                    const max = line.quantity - line.returnedQty;
                                    const val = returnQty[line.id] ?? 0;
                                    return (
                                        <TableRow key={line.id}>
                                            <TableCell className="text-sm">
                                                {line.variant.product.name}
                                                <span className="text-muted-foreground">
                                                    {' '}
                                                    ({line.variant.color} / {line.variant.size})
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {line.variant.barcode}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {line.quantity}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {line.returnedQty}
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={max}
                                                    className="h-8 text-right font-mono text-sm"
                                                    value={val || ''}
                                                    placeholder="0"
                                                    onChange={(e) => {
                                                        const n = parseInt(e.target.value, 10);
                                                        const q = Number.isNaN(n)
                                                            ? 0
                                                            : Math.max(0, Math.min(max, n));
                                                        setReturnQty((prev) => ({
                                                            ...prev,
                                                            [line.id]: q,
                                                        }));
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {returnError && (
                    <p className="text-sm text-destructive" role="alert">
                        {returnError}
                    </p>
                )}
                {returnMessage && (
                    <p className="text-sm text-green-700 dark:text-green-400">{returnMessage}</p>
                )}

                <Button
                    type="button"
                    onClick={() => submitReturn()}
                    disabled={returnSubmitting || !selectedOrderId}
                >
                    {returnSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            İşleniyor…
                        </>
                    ) : (
                        'İadeyi uygula'
                    )}
                </Button>
            </section>

            <section className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h2 className="text-sm font-medium">Kayıtlı çekler</h2>
                    {listLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Numara</TableHead>
                                <TableHead>Kaynak</TableHead>
                                <TableHead>Firma</TableHead>
                                <TableHead className="text-right">Başlangıç</TableHead>
                                <TableHead className="text-right">Kalan</TableHead>
                                <TableHead>Durum</TableHead>
                                <TableHead>Sipariş</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!listLoading && rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                        Henüz hediye çeki yok.
                                    </TableCell>
                                </TableRow>
                            )}
                            {rows.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-mono text-xs font-medium">{r.code}</TableCell>
                                    <TableCell className="text-sm">{sourceLabel(r.source)}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {r.companyName ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-sm">
                                        {formatCurrency(parseFloat(String(r.initialBalance)))}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-sm font-medium">
                                        {formatCurrency(parseFloat(String(r.currentBalance)))}
                                    </TableCell>
                                    <TableCell className="text-sm">{statusLabel(r.status)}</TableCell>
                                    <TableCell className="text-xs font-mono text-muted-foreground">
                                        {r.sourceOrder ? r.sourceOrder.orderNumber : '—'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </section>

            <Dialog open={corpOpen} onOpenChange={setCorpOpen}>
                <DialogContent className="sm:max-w-md" showCloseButton={!corpSaving}>
                    <DialogHeader>
                        <DialogTitle>Kurumsal hediye çeki</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="corp-amt">Tutar (TL)</Label>
                            <Input
                                id="corp-amt"
                                inputMode="decimal"
                                value={corpAmount}
                                onChange={(e) => setCorpAmount(e.target.value)}
                                placeholder="1000"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="corp-co">Firma adı (isteğe bağlı)</Label>
                            <Input
                                id="corp-co"
                                value={corpCompany}
                                onChange={(e) => setCorpCompany(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="corp-notes">Not</Label>
                            <Input
                                id="corp-notes"
                                value={corpNotes}
                                onChange={(e) => setCorpNotes(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="corp-exp">Son kullanma (YYYY-MM-DD, isteğe bağlı)</Label>
                            <Input
                                id="corp-exp"
                                type="date"
                                value={corpExpires}
                                onChange={(e) => setCorpExpires(e.target.value)}
                            />
                        </div>
                        {corpError && (
                            <p className="text-sm text-destructive" role="alert">
                                {corpError}
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setCorpOpen(false)}>
                            İptal
                        </Button>
                        <Button type="button" onClick={() => submitCorporate()} disabled={corpSaving}>
                            {corpSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Oluştur'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

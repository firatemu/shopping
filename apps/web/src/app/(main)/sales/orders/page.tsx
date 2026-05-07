'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency, formatDate } from '@/lib/api';
import { useTabStore } from '@/stores/useTabStore';

interface Order {
    id: string;
    orderNumber: string;
    createdAt: string;
    status: string;
    total: number;
    itemCount: number;
    customerName?: string;
    paymentMethod?: string;
}

const statusLabels: Record<string, string> = {
    COMPLETED: 'Tamamlandı', RETURNED: 'İade', CANCELLED: 'İptal', PENDING: 'Bekliyor',
};

export default function SalesOrdersPage() {
    const router = useRouter();
    const addTab = useTabStore((s) => s.addTab);
    const [orders, setOrders] = useState<{ data: Order[]; meta?: { total: number; page: number; totalPages: number } } | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/sales/orders', { params: { page, limit: 20, search: search || undefined } });
            setOrders(res.data?.data ?? res.data);
        } catch {
            setOrders({ data: [] });
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => { fetch(); }, [fetch]);

    const handleView = (e: React.MouseEvent, id: string, orderNumber: string) => {
        e.stopPropagation();
        addTab({ title: `Sipariş ${orderNumber}`, path: `/sales/orders/${id}`, closable: true });
        router.push(`/sales/orders/${id}`);
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    <h1 className="text-lg font-semibold text-foreground">Siparişler</h1>
                </div>
            </div>

            <div className="relative max-w-sm">
                <Input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Sipariş no veya müşteri ara..."
                    className="h-[34px] pl-8"
                />
            </div>

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Sipariş No', 'Tarih', 'Müşteri', 'Ödeme', 'Toplam', 'Durum', ''].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="border-b border-border">
                                {Array.from({ length: 7 }).map((_, j) => (<td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>))}
                            </tr>
                        )) : orders?.data.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-16 text-center">
                                <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                <p className="text-sm text-muted-foreground">Sipariş bulunamadı.</p>
                            </td></tr>
                        ) : orders?.data.map((o) => (
                            <tr key={o.id} className="border-b border-border hover:bg-accent/50 transition-colors cursor-pointer"
                                onClick={(e) => handleView(e as unknown as React.MouseEvent, o.id, o.orderNumber)}>
                                <td className="px-4 py-2.5 text-[13px] font-mono font-medium text-foreground">{o.orderNumber}</td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{formatDate(o.createdAt)}</td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{o.customerName ?? '—'}</td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{o.paymentMethod ?? '—'}</td>
                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums font-medium">{formatCurrency(o.total)}</td>
                                <td className="px-4 py-2.5">
                                    <Badge variant={o.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-[10px]">
                                        {statusLabels[o.status] ?? o.status}
                                    </Badge>
                                </td>
                                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                        onClick={(e) => handleView(e as unknown as React.MouseEvent, o.id, o.orderNumber)} title="İncele">
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {orders?.meta && orders.meta.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
                        <p className="text-xs text-muted-foreground">{orders.meta.total} sipariş</p>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-7 text-xs">Önceki</Button>
                            <span className="text-xs text-muted-foreground px-2">{page} / {orders.meta.totalPages}</span>
                            <Button variant="ghost" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= orders.meta.totalPages} className="h-7 text-xs">Sonraki</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
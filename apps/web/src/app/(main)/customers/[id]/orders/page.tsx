'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency, formatDate } from '@/lib/api';

interface Order {
    id: string;
    orderNumber: string;
    createdAt: string;
    status: string;
    total: number;
    itemCount: number;
}

const statusLabels: Record<string, string> = {
    COMPLETED: 'Tamamlandı', RETURNED: 'İade', CANCELLED: 'İptal', PENDING: 'Bekliyor',
};

export default function CustomerOrdersPage() {
    const params = useParams();
    const customerId = params.id as string;

    const [orders, setOrders] = useState<{ data: Order[] } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/customers/${customerId}/orders`);
            setOrders(res.data?.data ?? res.data);
        } catch {
            setOrders({ data: [] });
        } finally {
            setLoading(false);
        }
    }, [customerId]);

    useEffect(() => { fetch(); }, [fetch]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <h1 className="text-lg font-semibold text-foreground">Cari Siparişleri</h1>
            </div>

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Sipariş No', 'Tarih', 'Durum', 'Toplam', 'Kalem'].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i} className="border-b border-border">
                                {Array.from({ length: 5 }).map((_, j) => (<td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>))}
                            </tr>
                        )) : orders?.data.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-16 text-center">
                                <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                <p className="text-sm text-muted-foreground">Sipariş bulunamadı.</p>
                            </td></tr>
                        ) : orders?.data.map((o) => (
                            <tr key={o.id} className="border-b border-border hover:bg-accent/50 transition-colors cursor-pointer"
                                onClick={() => window.location.href = `/sales/orders/${o.id}`}>
                                <td className="px-4 py-2.5 text-[13px] font-mono text-foreground font-medium">{o.orderNumber}</td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{formatDate(o.createdAt)}</td>
                                <td className="px-4 py-2.5">
                                    <Badge variant={o.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-[10px]">
                                        {statusLabels[o.status] ?? o.status}
                                    </Badge>
                                </td>
                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums font-medium">{formatCurrency(o.total)}</td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{o.itemCount} kalem</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
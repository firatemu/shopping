'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency, formatDate } from '@/lib/api';

interface OrderItem {
    productName: string;
    variantDesc?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
}

interface OrderDetail {
    id: string;
    orderNumber: string;
    status: string;
    createdAt: string;
    customerName?: string;
    cashierName: string;
    branchName: string;
    subtotal: number;
    discountTotal: number;
    vatTotal: number;
    total: number;
    paymentMethod: string;
    items: OrderItem[];
    type: 'SALE' | 'RETURN';
}

const statusLabels: Record<string, string> = {
    COMPLETED: 'Tamamlandı', RETURNED: 'İade', CANCELLED: 'İptal', PENDING: 'Bekliyor',
};

export default function SalesOrderDetailPage() {
    const params = useParams();
    const orderId = params.id as string;

    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetch = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/sales/orders/${orderId}`);
            setOrder(res.data?.data ?? res.data);
        } catch {
            setError('Sipariş bilgileri yüklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => { fetch(); }, [fetch]);

    const handlePrint = () => window.print();

    if (loading) {
        return (
            <div className="p-6 max-w-2xl space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="p-6 max-w-2xl space-y-4">
                <p className="text-sm text-destructive">{error || 'Sipariş bulunamadı.'}</p>
                <Link href="/sales/orders"><Button variant="secondary">Siparişlere dön</Button></Link>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl space-y-4">
            <div className="flex items-center justify-between print:hidden">
                <h1 className="text-lg font-semibold text-foreground">Sipariş #{order.orderNumber}</h1>
                <div className="flex gap-2">
                    <Link href="/sales/orders">
                        <Button variant="ghost" className="h-8">Siparişlere dön</Button>
                    </Link>
                    <Button onClick={handlePrint} variant="secondary" className="h-8 gap-1.5">
                        <Printer className="w-4 h-4" /> Yazdır
                    </Button>
                </div>
            </div>

            <div className="rounded-[10px] border border-border bg-card p-6 space-y-4 text-sm" id="order-print-area">
                <div className="flex items-center justify-between border-b border-dashed border-border pb-4">
                    <div>
                        <h2 className="font-semibold text-base">{order.branchName}</h2>
                        <p className="text-xs text-muted-foreground">Sipariş No: {order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)} — {order.cashierName}</p>
                        {order.customerName && <p className="text-xs text-muted-foreground mt-1">Müşteri: {order.customerName}</p>}
                    </div>
                    <Badge variant={order.status === 'COMPLETED' ? 'default' : order.status === 'RETURNED' ? 'destructive' : 'secondary'} className="text-[11px]">
                        {order.type === 'RETURN' ? 'İADE' : statusLabels[order.status] ?? order.status}
                    </Badge>
                </div>

                <div className="space-y-2">
                    {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between gap-2 py-2 border-b border-dashed border-border last:border-0">
                            <div className="flex-1">
                                <p className="font-medium">{item.productName}</p>
                                {item.variantDesc && <p className="text-[11px] text-muted-foreground">{item.variantDesc}</p>}
                                <p className="text-[11px] text-muted-foreground">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                            </div>
                            <div className="text-right font-mono tabular-nums">
                                {item.discount > 0 && <p className="text-[11px] text-muted-foreground">-{formatCurrency(item.discount)}</p>}
                                <p className="font-medium">{formatCurrency(item.total)}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t border-dashed border-border pt-3 space-y-1.5">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Ara toplam</span><span className="font-mono tabular-nums">{formatCurrency(order.subtotal)}</span></div>
                    {order.discountTotal > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">İndirim</span><span className="font-mono tabular-nums text-success">-{formatCurrency(order.discountTotal)}</span></div>}
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">KDV</span><span className="font-mono tabular-nums">{formatCurrency(order.vatTotal)}</span></div>
                    <div className="flex justify-between font-semibold text-base border-t border-dashed border-border pt-2">
                        <span>TOPLAM</span><span className="font-mono tabular-nums">{formatCurrency(order.total)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Ödeme</span><span>{order.paymentMethod}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
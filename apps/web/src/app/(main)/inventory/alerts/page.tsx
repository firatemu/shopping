'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency } from '@/lib/api';

interface Alert {
    productName: string;
    sku: string;
    variantDesc?: string;
    currentStock: number;
    minStock: number;
    warehouseName: string;
    alertType: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'OVER_STOCK';
}

export default function InventoryAlertsPage() {
    const [alerts, setAlerts] = useState<{ data: Alert[] } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/inventory/alerts');
            setAlerts(res.data?.data ?? res.data);
        } catch {
            setAlerts({ data: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const typeLabel: Record<string, string> = {
        OUT_OF_STOCK: 'Stokta yok', LOW_STOCK: 'Düşük stok', OVER_STOCK: 'Aşırı stok',
    };
    const typeVariant: Record<string, 'destructive' | 'secondary' | 'default'> = {
        OUT_OF_STOCK: 'destructive', LOW_STOCK: 'secondary', OVER_STOCK: 'default',
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" strokeWidth={1.5} />
                <h1 className="text-lg font-semibold text-foreground">Kritik Stok Uyarıları</h1>
            </div>

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Ürün', 'SKU', 'Depo', 'Mevcut', 'Minimum', 'Uyarı'].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i} className="border-b border-border">
                                {Array.from({ length: 6 }).map((_, j) => (<td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>))}
                            </tr>
                        )) : alerts?.data.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-16 text-center">
                                <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                <p className="text-sm text-muted-foreground">Uyarı bulunamadı. Tüm ürünler yeterli stokta.</p>
                            </td></tr>
                        ) : alerts?.data.map((a, i) => (
                            <tr key={i} className="border-b border-border hover:bg-accent/50 transition-colors">
                                <td className="px-4 py-2.5">
                                    <p className="text-[13px] text-foreground font-medium">{a.productName}</p>
                                    {a.variantDesc && <p className="text-[11px] text-muted-foreground">{a.variantDesc}</p>}
                                </td>
                                <td className="px-4 py-2.5 text-[13px] font-mono text-muted-foreground">{a.sku}</td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{a.warehouseName}</td>
                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums font-medium text-destructive">{a.currentStock}</td>
                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-muted-foreground">{a.minStock}</td>
                                <td className="px-4 py-2.5">
                                    <Badge variant={typeVariant[a.alertType]} className="text-[10px]">{typeLabel[a.alertType]}</Badge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
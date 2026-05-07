'use client';

import { useEffect, useState, useCallback } from 'react';
import { Package, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency } from '@/lib/api';

interface DeadStockItem {
    productName: string;
    sku: string;
    variantDesc?: string;
    stockQuantity: number;
    costPrice: number;
    totalCost: number;
    lastSaleDate?: string;
    daysSinceLastSale: number;
}

export default function DeadStockReportPage() {
    const [report, setReport] = useState<{ data: DeadStockItem[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [days, setDays] = useState('90');

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/reports/dead-stock', {
                params: { days: Number(days) || 90, search: search || undefined },
            });
            setReport(res.data?.data ?? res.data);
        } catch {
            setReport({ data: [] });
        } finally {
            setLoading(false);
        }
    }, [days, search]);

    useEffect(() => { fetch(); }, [fetch]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    <h1 className="text-lg font-semibold text-foreground">Ölü Stok Raporu</h1>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Ürün veya SKU ara..."
                        className="h-[34px] pl-8"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Son</span>
                    <Input
                        type="number"
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                        className="h-[34px] w-20 text-center"
                        min="1"
                    />
                    <span className="text-sm text-muted-foreground">gün satış yok</span>
                </div>
            </div>

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Ürün', 'SKU', 'Stok', 'Maliyet', 'Toplam Maliyet', 'Son Satış', 'Gün'].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="border-b border-border">
                                {Array.from({ length: 7 }).map((_, j) => (<td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>))}
                            </tr>
                        )) : report?.data.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-16 text-center">
                                <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                <p className="text-sm text-muted-foreground">Ölü stok bulunamadı.</p>
                            </td></tr>
                        ) : report?.data.map((item, i) => (
                            <tr key={i} className="border-b border-border hover:bg-accent/50 transition-colors">
                                <td className="px-4 py-2.5">
                                    <p className="text-[13px] text-foreground font-medium">{item.productName}</p>
                                    {item.variantDesc && <p className="text-[11px] text-muted-foreground">{item.variantDesc}</p>}
                                </td>
                                <td className="px-4 py-2.5 text-[13px] font-mono text-muted-foreground">{item.sku}</td>
                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-foreground">{item.stockQuantity}</td>
                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-muted-foreground">{formatCurrency(item.costPrice)}</td>
                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums font-medium text-destructive">{formatCurrency(item.totalCost)}</td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{item.lastSaleDate ? new Date(item.lastSaleDate).toLocaleDateString('tr-TR') : '—'}</td>
                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-muted-foreground">{item.daysSinceLastSale}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
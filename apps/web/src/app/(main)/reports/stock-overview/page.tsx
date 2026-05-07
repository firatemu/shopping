'use client';

import { useEffect, useState, useCallback } from 'react';
import { Package, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency, downloadAuthenticatedFile } from '@/lib/api';

interface StockOverviewItem {
    categoryName: string;
    totalQuantity: number;
    totalValue: number;
    productCount: number;
}

interface StockSummary {
    totalProducts: number;
    totalQuantity: number;
    totalValue: number;
    outOfStockCount: number;
    lowStockCount: number;
}

export default function StockOverviewReportPage() {
    const [summary, setSummary] = useState<StockSummary | null>(null);
    const [categories, setCategories] = useState<{ data: StockOverviewItem[] } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/reports/stock-overview');
            const data = res.data?.data ?? res.data;
            if (data && typeof data === 'object' && 'totalProducts' in data) {
                setSummary(data as StockSummary);
                setCategories({ data: (data as { categoryBreakdown?: StockOverviewItem[] }).categoryBreakdown ?? [] });
            } else if (Array.isArray(data)) {
                setCategories({ data: data as StockOverviewItem[] });
            }
        } catch {
            setCategories({ data: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const exportExcel = () => downloadAuthenticatedFile('/reports/stock-overview/excel', { filenameFallback: 'stok_ozeti.xlsx' });

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    <h1 className="text-lg font-semibold text-foreground">Stok Özeti</h1>
                </div>
                <Button variant="ghost" onClick={exportExcel} className="h-8 gap-1.5 text-xs">
                    <Download className="w-4 h-4" /> Excel
                </Button>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-20 w-full" />))}
                </div>
            ) : summary ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Toplam Ürün', value: String(summary.totalProducts) },
                        { label: 'Toplam Adet', value: String(summary.totalQuantity) },
                        { label: 'Toplam Değer', value: formatCurrency(summary.totalValue) },
                        { label: 'Stokta Yok', value: String(summary.outOfStockCount), highlight: true },
                    ].map((kpi) => (
                        <div key={kpi.label} className="rounded-[10px] border border-border bg-card p-4">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                            <p className={`text-xl font-semibold font-mono tabular-nums mt-1 ${kpi.highlight ? 'text-destructive' : 'text-foreground'}`}>
                                {kpi.value}
                            </p>
                        </div>
                    ))}
                </div>
            ) : null}

            {categories?.data && categories.data.length > 0 && (
                <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                {['Kategori', 'Ürün Sayısı', 'Toplam Adet', 'Toplam Değer'].map((h) => (
                                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {categories.data.map((cat, i) => (
                                <tr key={i} className="border-b border-border hover:bg-accent/50 transition-colors">
                                    <td className="px-4 py-2.5 text-[13px] text-foreground font-medium">{cat.categoryName}</td>
                                    <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-muted-foreground">{cat.productCount}</td>
                                    <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-foreground">{cat.totalQuantity}</td>
                                    <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-foreground">{formatCurrency(cat.totalValue)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
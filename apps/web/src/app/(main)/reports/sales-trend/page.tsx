'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency, downloadAuthenticatedFile } from '@/lib/api';

interface TrendPoint {
    date: string;
    totalOrders: number;
    revenue: number;
    returnAmount: number;
    netRevenue: number;
}

export default function SalesTrendReportPage() {
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [report, setReport] = useState<{ data: TrendPoint[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        api.get('/reports/sales-trend', { params: { startDate, endDate } })
            .then((res) => setReport(res.data?.data ?? res.data))
            .catch(() => setReport({ data: [] }))
            .finally(() => setLoading(false));
    }, [startDate, endDate]);

    const exportExcel = () => downloadAuthenticatedFile('/reports/sales-trend/excel', {
        params: { startDate, endDate },
        filenameFallback: `satis_trendi_${startDate}_${endDate}.xlsx`,
    });

    const maxRevenue = report?.data ? Math.max(...report.data.map((p) => p.netRevenue), 1) : 1;

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    <h1 className="text-lg font-semibold text-foreground">Satış Trendi</h1>
                </div>
                <Button variant="ghost" onClick={exportExcel} className="h-8 gap-1.5 text-xs">
                    Excel
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Başlangıç:</span>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-[34px] w-auto" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Bitiş:</span>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-[34px] w-auto" />
                </div>
            </div>

            {loading ? (
                <div className="space-y-2">{Array.from({ length: 7 }).map((_, i) => (<Skeleton key={i} className="h-12 w-full" />))}</div>
            ) : report?.data.length === 0 ? (
                <div className="rounded-[10px] border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                    Bu tarih aralığında veri bulunamadı.
                </div>
            ) : (
                <div className="space-y-2">
                    {report?.data.map((point) => (
                        <div key={point.date} className="rounded-[10px] border border-border bg-card p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">{new Date(point.date).toLocaleDateString('tr-TR')}</span>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-muted-foreground">Sipariş: <strong className="text-foreground">{point.totalOrders}</strong></span>
                                    <span className="text-success font-mono tabular-nums font-medium">{formatCurrency(point.netRevenue)}</span>
                                </div>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all"
                                    style={{ width: `${Math.max((point.netRevenue / maxRevenue) * 100, 2)}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
'use client';

import { useEffect, useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api, downloadAuthenticatedFile, formatCurrency } from '@/lib/api';

interface DailySales {
    totalOrders: number;
    totalReturns: number;
    revenue: number;
    returnAmount: number;
    netRevenue: number;
    totalItems: number;
    paymentBreakdown: Record<string, number>;
}

export default function ReportsPage() {
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [report, setReport] = useState<DailySales | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        api.get('/reports/daily-sales', { params: { date } })
            .then((res) => {
                const d = res.data as { data?: DailySales };
                setReport(d.data ?? res.data as unknown as DailySales);
            })
            .catch(() => setReport(null))
            .finally(() => setLoading(false));
    }, [date]);

    const exportExcel = () =>
        downloadAuthenticatedFile('/reports/daily-sales/excel', {
            params: { date },
            filenameFallback: `satis_${date}.xlsx`,
        });
    const exportPdf = () =>
        downloadAuthenticatedFile('/reports/daily-sales/pdf', {
            params: { date },
            filenameFallback: `satis_${date}.pdf`,
        });

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-foreground">Raporlar</h1>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={exportExcel} className="h-8 gap-1.5 text-xs">
                        <FileSpreadsheet className="w-4 h-4" /> Excel
                    </Button>
                    <Button variant="ghost" onClick={exportPdf} className="h-8 gap-1.5 text-xs">
                        <FileText className="w-4 h-4" /> PDF
                    </Button>
                </div>
            </div>

            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-[34px] max-w-[200px]" />

            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-[10px] border border-border bg-card p-4"><Skeleton className="h-12 w-full" /></div>
                    ))}
                </div>
            ) : report ? (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Toplam Sipariş', value: String(report.totalOrders) },
                            { label: 'Brüt Ciro', value: formatCurrency(report.revenue) },
                            { label: 'İade Tutarı', value: formatCurrency(report.returnAmount) },
                            { label: 'Net Ciro', value: formatCurrency(report.netRevenue) },
                        ].map((kpi) => (
                            <div key={kpi.label} className="rounded-[10px] border border-border bg-card p-4">
                                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                                <p className="text-xl font-semibold font-mono tabular-nums text-foreground mt-1">{kpi.value}</p>
                            </div>
                        ))}
                    </div>
                    {report.paymentBreakdown && Object.keys(report.paymentBreakdown).length > 0 && (
                        <div className="rounded-[10px] border border-border bg-card p-4">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">Ödeme Dökümü</p>
                            <div className="space-y-2">
                                {Object.entries(report.paymentBreakdown).map(([method, amount]) => (
                                    <div key={method} className="flex justify-between text-[13px]">
                                        <span className="text-muted-foreground">{method}</span>
                                        <span className="font-mono tabular-nums text-foreground">{formatCurrency(amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="rounded-[10px] border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                    Bu tarih için rapor verisi bulunamadı
                </div>
            )}
        </div>
    );
}

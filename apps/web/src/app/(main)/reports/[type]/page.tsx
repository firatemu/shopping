'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency } from '@/lib/api';

type ReportType = 'daily-sales' | 'top-products' | 'sales' | 'dead-stock' | 'cash-sessions' | 'sales-trend' | 'stock-overview';

interface ReportData {
    type: ReportType;
    date?: string;
    startDate?: string;
    endDate?: string;
    rows?: Record<string, unknown>[];
    kpis?: Record<string, string | number>;
}

export default function ReportDetailPage() {
    const params = useParams();
    const type = params.type as ReportType;
    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const endpoint = `/reports/${type}`;
        api.get(endpoint)
            .then((res) => setReport(res.data?.data ?? res.data))
            .catch(() => setReport(null))
            .finally(() => setLoading(false));
    }, [type]);

    const typeLabels: Record<string, string> = {
        'daily-sales': 'Günlük Satış', 'top-products': 'En Çok Satanlar',
        'sales': 'Satış Raporu', 'dead-stock': 'Ölü Stok', 'cash-sessions': 'Kasa Oturumları',
        'sales-trend': 'Satış Trendi', 'stock-overview': 'Stok Özeti',
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <h1 className="text-lg font-semibold text-foreground">{typeLabels[type] ?? type}</h1>
            </div>

            {loading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-12 w-full" />))}</div>
            ) : report ? (
                <div className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                    {report.kpis && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {Object.entries(report.kpis).map(([key, val]) => (
                                <div key={key} className="rounded-[8px] border border-border p-3">
                                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{key}</p>
                                    <p className="text-lg font-semibold font-mono tabular-nums mt-1">
                                        {typeof val === 'number' ? formatCurrency(val) : String(val)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                    {report.rows && report.rows.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        {Object.keys(report.rows[0]).map((h) => (
                                            <th key={h} className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.rows.map((row, i) => (
                                        <tr key={i} className="border-b border-border hover:bg-accent/50">
                                            {Object.values(row).map((val, j) => (
                                                <td key={j} className="px-3 py-2 font-mono tabular-nums text-[13px]">
                                                    {typeof val === 'number' ? formatCurrency(val) : String(val ?? '—')}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!report.kpis && !report.rows && (
                        <p className="text-sm text-muted-foreground">Bu rapor için detay verisi mevcut değil.</p>
                    )}
                </div>
            ) : (
                <div className="rounded-[10px] border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                    Rapor verisi bulunamadı.
                </div>
            )}
        </div>
    );
}
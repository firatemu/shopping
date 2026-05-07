'use client';

import { useEffect, useState, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency, formatDate } from '@/lib/api';

interface UpcomingInstrument {
    id: string;
    type: 'CHECK' | 'PROMISSORY_NOTE';
    serialNumber: string;
    dueDate: string;
    amount: number;
    status: string;
    issuerName: string;
    relatedCustomerName?: string;
}

const typeLabels: Record<string, string> = { CHECK: 'Çek', PROMISSORY_NOTE: 'Senet' };
const statusLabels: Record<string, string> = {
    PENDING: 'Bekliyor', CASHED: 'Tahsil Edildi', RETURNED: 'İade Edildi', CANCELLED: 'İptal',
};

export default function FinanceOperationsUpcomingPage() {
    const [instruments, setInstruments] = useState<{ data: UpcomingInstrument[] } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/partner-finance/operations/upcoming-instruments');
            setInstruments(res.data?.data ?? res.data);
        } catch {
            setInstruments({ data: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const now = new Date();
    const upcoming = instruments?.data.filter((i) => new Date(i.dueDate) >= now) ?? [];
    const overdue = instruments?.data.filter((i) => new Date(i.dueDate) < now) ?? [];

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <h1 className="text-lg font-semibold text-foreground">Yaklaşan Çek/Senet</h1>
            </div>

            {loading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-12 w-full" />))}</div>
            ) : (
                <>
                    {overdue.length > 0 && (
                        <div>
                            <p className="text-[11px] font-medium uppercase tracking-wider text-destructive mb-2">Vadesi Geçmiş ({overdue.length})</p>
                            <div className="rounded-[10px] border border-destructive/30 bg-card overflow-hidden mb-4">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            {['Tür', 'Seri No', 'Vade', 'Tutar', 'Keşideci', 'Müşteri'].map((h) => (
                                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {overdue.map((ins) => (
                                            <tr key={ins.id} className="border-b border-border bg-destructive/5">
                                                <td className="px-4 py-2.5 text-[13px] text-foreground">{typeLabels[ins.type]}</td>
                                                <td className="px-4 py-2.5 text-[13px] font-mono text-muted-foreground">{ins.serialNumber}</td>
                                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-destructive">{formatDate(ins.dueDate)}</td>
                                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums font-medium text-destructive">{formatCurrency(ins.amount)}</td>
                                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{ins.issuerName}</td>
                                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{ins.relatedCustomerName ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Yaklaşan ({upcoming.length})</p>
                        <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        {['Tür', 'Seri No', 'Vade', 'Tutar', 'Keşideci', 'Müşteri', 'Durum'].map((h) => (
                                            <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {upcoming.length === 0 ? (
                                        <tr><td colSpan={7} className="px-4 py-16 text-center">
                                            <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                            <p className="text-sm text-muted-foreground">Yaklaşan çek/senet bulunamadı.</p>
                                        </td></tr>
                                    ) : upcoming.map((ins) => (
                                        <tr key={ins.id} className="border-b border-border hover:bg-accent/50 transition-colors cursor-pointer"
                                            onClick={() => window.location.href = `/finance/operations/${ins.id}`}>
                                            <td className="px-4 py-2.5 text-[13px] text-foreground">{typeLabels[ins.type]}</td>
                                            <td className="px-4 py-2.5 text-[13px] font-mono text-muted-foreground">{ins.serialNumber}</td>
                                            <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-foreground">{formatDate(ins.dueDate)}</td>
                                            <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums font-medium text-foreground">{formatCurrency(ins.amount)}</td>
                                            <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{ins.issuerName}</td>
                                            <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{ins.relatedCustomerName ?? '—'}</td>
                                            <td className="px-4 py-2.5 text-[11px]">
                                                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{statusLabels[ins.status] ?? ins.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
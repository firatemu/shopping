'use client';

import { useEffect, useState, useCallback } from 'react';
import { Wallet, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency, downloadAuthenticatedFile } from '@/lib/api';

interface CashSessionReport {
    sessionId: string;
    date: string;
    openedByName: string;
    openingBalance: number;
    closingBalance: number | null;
    cashIn: number;
    cashOut: number;
    expectedCash: number;
    difference: number | null;
    status: string;
}

export default function CashSessionsReportPage() {
    const [report, setReport] = useState<{ data: CashSessionReport[] } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/reports/cash-sessions', { params: { limit: 50 } });
            setReport(res.data?.data ?? res.data);
        } catch {
            setReport({ data: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const exportExcel = () => downloadAuthenticatedFile('/reports/cash-sessions/excel', { filenameFallback: 'kasa_oturumlari.xlsx' });
    const exportPdf = () => downloadAuthenticatedFile('/reports/cash-sessions/pdf', { filenameFallback: 'kasa_oturumlari.pdf' });

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    <h1 className="text-lg font-semibold text-foreground">Kasa Oturumları Raporu</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={exportExcel} className="h-8 gap-1.5 text-xs">
                        <Download className="w-4 h-4" /> Excel
                    </Button>
                    <Button variant="ghost" onClick={exportPdf} className="h-8 gap-1.5 text-xs">
                        <Download className="w-4 h-4" /> PDF
                    </Button>
                </div>
            </div>

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Tarih', 'Açan', 'Açılış', 'Nakit Giriş', 'Nakit Çıkış', 'Kapanış', 'Fark', 'Durum'].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="border-b border-border">
                                {Array.from({ length: 8 }).map((_, j) => (<td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>))}
                            </tr>
                        )) : report?.data.length === 0 ? (
                            <tr><td colSpan={8} className="px-4 py-16 text-center">
                                <Wallet className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                <p className="text-sm text-muted-foreground">Kasa oturumu bulunamadı.</p>
                            </td></tr>
                        ) : report?.data.map((s) => (
                            <tr key={s.sessionId} className="border-b border-border hover:bg-accent/50 transition-colors">
                                <td className="px-4 py-2.5 text-[13px] text-foreground">
                                    {new Date(s.date).toLocaleDateString('tr-TR')}
                                </td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{s.openedByName}</td>
                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-foreground">{formatCurrency(s.openingBalance)}</td>
                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-success">{s.cashIn > 0 ? formatCurrency(s.cashIn) : '—'}</td>
                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-destructive">{s.cashOut > 0 ? formatCurrency(s.cashOut) : '—'}</td>
                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-foreground">
                                    {s.closingBalance != null ? formatCurrency(s.closingBalance) : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums">
                                    {s.difference != null ? (
                                        <span className={s.difference === 0 ? 'text-success' : 'text-destructive'}>
                                            {formatCurrency(s.difference)}
                                        </span>
                                    ) : '—'}
                                </td>
                                <td className="px-4 py-2.5">
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s.status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
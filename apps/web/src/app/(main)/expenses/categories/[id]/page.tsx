'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency, formatDate } from '@/lib/api';

interface Line {
    id: string;
    type: string;
    categoryName: string;
    amount: number;
    description: string | null;
    reference: string | null;
    date: string;
}

interface Report {
    category: { id: string; name: string; kind: string };
    period: { from: string; to: string };
    totals: { income: string; expense: string };
    lines: Line[];
}

function ymd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export default function ExpenseCategoryReportPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const categoryId = params.id as string;

    const defaultFrom = searchParams.get('from') ?? (() => {
        const t = new Date();
        return ymd(new Date(t.getFullYear(), t.getMonth(), 1));
    })();
    const defaultTo = searchParams.get('to') ?? ymd(new Date());

    const [dateFrom, setDateFrom] = useState(defaultFrom);
    const [dateTo, setDateTo] = useState(defaultTo);
    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!categoryId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get<Report>(`/expenses/categories/${categoryId}/report`, {
                params: { dateFrom, dateTo },
            });
            setReport(res.data);
        } catch {
            setReport(null);
            setError('Rapor yüklenemedi veya yetkiniz yok.');
        } finally {
            setLoading(false);
        }
    }, [categoryId, dateFrom, dateTo]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="p-6 space-y-4 max-w-4xl">
            <div className="flex items-center gap-3">
                <Link href="/expenses">
                    <Button type="button" variant="ghost" size="sm" className="h-8 gap-1">
                        <ArrowLeft className="w-4 h-4" /> Geri
                    </Button>
                </Link>
                <h1 className="text-lg font-semibold text-foreground">Kategori raporu</h1>
            </div>

            <div className="flex flex-wrap items-end gap-3 rounded-[10px] border border-border bg-card p-4">
                <div className="space-y-1">
                    <Label htmlFor="df">Başlangıç</Label>
                    <Input
                        id="df"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="h-[34px] w-[160px]"
                    />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="dt">Bitiş</Label>
                    <Input
                        id="dt"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="h-[34px] w-[160px]"
                    />
                </div>
                <Button type="button" className="h-8" onClick={load} disabled={loading}>
                    Uygula
                </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {loading && !report ? (
                <Skeleton className="h-24 w-full" />
            ) : report ? (
                <>
                    <div className="rounded-[10px] border border-border bg-card p-4 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Kategori</p>
                            <p className="text-base font-medium text-foreground">{report.category.name}</p>
                            <Badge variant="outline" className="mt-1 text-[10px]">
                                {report.category.kind === 'INCOME' ? 'Gelir kategorisi' : 'Gider kategorisi'}
                            </Badge>
                        </div>
                        <div className="flex gap-6 text-right">
                            <div>
                                <p className="text-[10px] uppercase text-muted-foreground">Gelir</p>
                                <p className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(Number(report.totals.income))}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase text-muted-foreground">Gider</p>
                                <p className="font-mono text-sm text-destructive">
                                    {formatCurrency(Number(report.totals.expense))}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    {['Tarih', 'Tür', 'Tutar', 'Açıklama', 'Ref.'].map((h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {report.lines.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                                            Bu aralıkta kayıt yok
                                        </td>
                                    </tr>
                                ) : (
                                    report.lines.map((r) => (
                                        <tr key={r.id} className="border-b border-border">
                                            <td className="px-4 py-2.5 text-[13px] text-muted-foreground">
                                                {formatDate(r.date)}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <Badge
                                                    variant={r.type === 'INCOME' ? 'default' : 'secondary'}
                                                    className="text-[10px]"
                                                >
                                                    {r.type === 'INCOME' ? 'Gelir' : 'Gider'}
                                                </Badge>
                                            </td>
                                            <td
                                                className={`px-4 py-2.5 font-mono text-[13px] tabular-nums ${
                                                    r.type === 'INCOME'
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-destructive'
                                                }`}
                                            >
                                                {r.type === 'INCOME' ? '+' : '−'}
                                                {formatCurrency(r.amount)}
                                            </td>
                                            <td className="px-4 py-2.5 text-[13px] max-w-[220px] truncate">
                                                {r.description ?? '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-[12px] text-muted-foreground font-mono">
                                                {r.reference ?? '—'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : null}
        </div>
    );
}

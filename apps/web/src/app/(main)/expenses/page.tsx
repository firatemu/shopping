'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Receipt, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency, formatDate } from '@/lib/api';
import { useTabStore } from '@/stores/useTabStore';

interface ExpenseRow {
    id: string;
    type: string;
    categoryId: string;
    categoryName: string;
    category?: { name: string; kind: string };
    amount: number;
    description: string | null;
    reference: string | null;
    date?: string;
    createdBy?: string;
    createdByName?: string | null;
    updatedBy?: string;
    updatedByName?: string | null;
    createdAt: string;
}

interface Summary {
    income: string;
    expense: string;
    net: string;
    categoriesBreakdown: Array<{
        categoryId: string;
        name: string;
        kind: string;
        income: string;
        expense: string;
    }>;
}

function ymd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export default function ExpensesPage() {
    const router = useRouter();
    const addTab = useTabStore((s) => s.addTab);
    const [expenses, setExpenses] = useState<{ data: ExpenseRow[]; meta: { total: number } } | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [summary, setSummary] = useState<Summary | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(true);

    const period = useMemo(() => {
        const to = new Date();
        const from = new Date(to.getFullYear(), to.getMonth(), 1);
        return { dateFrom: ymd(from), dateTo: ymd(to) };
    }, []);

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/expenses', { params: { limit: 50, search: search || undefined } });
            setExpenses(res.data?.data ?? res.data);
        } catch {
            setExpenses({ data: [], meta: { total: 0 } });
        } finally {
            setLoading(false);
        }
    }, [search]);

    const fetchSummary = useCallback(async () => {
        setSummaryLoading(true);
        try {
            const res = await api.get<Summary>('/expenses/summary', {
                params: { dateFrom: period.dateFrom, dateTo: period.dateTo },
            });
            setSummary(res.data);
        } catch {
            setSummary(null);
        } finally {
            setSummaryLoading(false);
        }
    }, [period.dateFrom, period.dateTo]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    const rowDate = (e: ExpenseRow) => (e.date ? e.date.slice(0, 10) : formatDate(e.createdAt));

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-foreground">Gelir & Gider</h1>
                <Button
                    onClick={() => {
                        addTab({ title: 'Yeni Gider', path: '/expenses/new', closable: true });
                        router.push('/expenses/new');
                    }}
                    className="h-8 gap-1.5"
                >
                    <Plus className="w-4 h-4" /> Yeni kayıt
                </Button>
            </div>

            <div className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <PieChart className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    Dönem özeti ({period.dateFrom} — {period.dateTo})
                </div>
                {summaryLoading ? (
                    <div className="grid grid-cols-3 gap-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full" />
                        ))}
                    </div>
                ) : summary ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-lg border border-border/80 bg-emerald-500/5 px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Toplam gelir</p>
                            <p className="text-sm font-mono font-medium text-emerald-700 dark:text-emerald-400">
                                {formatCurrency(Number(summary.income))}
                            </p>
                        </div>
                        <div className="rounded-lg border border-border/80 bg-destructive/5 px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Toplam gider</p>
                            <p className="text-sm font-mono font-medium text-destructive">
                                {formatCurrency(Number(summary.expense))}
                            </p>
                        </div>
                        <div className="rounded-lg border border-border/80 bg-muted/40 px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Net</p>
                            <p className="text-sm font-mono font-medium text-foreground">
                                {formatCurrency(Number(summary.net))}
                            </p>
                        </div>
                    </div>
                ) : null}

                {summary?.categoriesBreakdown?.length ? (
                    <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            Kategoriler (bu ay)
                        </p>
                        <div className="max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border">
                            {summary.categoriesBreakdown
                                .filter((c) => Number(c.income) > 0 || Number(c.expense) > 0)
                                .map((c) => {
                                const inc = Number(c.income);
                                const exp = Number(c.expense);
                                return (
                                    <Link
                                        key={c.categoryId}
                                        href={`/expenses/categories/${c.categoryId}?from=${period.dateFrom}&to=${period.dateTo}`}
                                        className="flex items-center justify-between gap-3 px-3 py-2 text-[13px] hover:bg-accent/60 transition-colors"
                                    >
                                        <span className="flex items-center gap-2 min-w-0">
                                            <Badge variant="outline" className="text-[9px] shrink-0">
                                                {c.kind === 'INCOME' ? 'Gelir' : 'Gider'}
                                            </Badge>
                                            <span className="truncate">{c.name}</span>
                                        </span>
                                        <span className="shrink-0 font-mono text-[12px] tabular-nums text-right space-x-2">
                                            {inc > 0 && (
                                                <span className="text-emerald-600 dark:text-emerald-400">
                                                    +{formatCurrency(inc)}
                                                </span>
                                            )}
                                            {exp > 0 && (
                                                <span className="text-destructive">−{formatCurrency(exp)}</span>
                                            )}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Kategori veya açıklama ara..."
                    className="h-[34px] pl-8"
                />
            </div>

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Tarih', 'Tür', 'Kategori', 'Açıklama', 'Tutar', 'Oluşturan'].map((h) => (
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
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="border-b border-border">
                                    {Array.from({ length: 5 }).map((_, j) => (
                                        <td key={j} className="px-4 py-2.5">
                                            <Skeleton className="h-4 w-20" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : expenses?.data.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-16 text-center">
                                    <Receipt className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                    <p className="text-sm text-muted-foreground">Kayıt bulunamadı</p>
                                </td>
                            </tr>
                        ) : (
                            expenses?.data.map((e) => (
                                <tr key={e.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{rowDate(e)}</td>
                                    <td className="px-4 py-2.5">
                                        <Badge variant={e.type === 'INCOME' ? 'default' : 'secondary'} className="text-[10px]">
                                            {e.type === 'INCOME' ? 'Gelir' : 'Gider'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <Link
                                            href={`/expenses/categories/${e.categoryId}?from=${period.dateFrom}&to=${period.dateTo}`}
                                            className="inline-flex"
                                        >
                                            <Badge variant="outline" className="text-[10px] hover:bg-accent">
                                                {e.categoryName ?? e.category?.name ?? '—'}
                                            </Badge>
                                        </Link>
                                    </td>
                                    <td className="px-4 py-2.5 text-[13px] text-foreground max-w-[200px] truncate">
                                        {e.description ?? '—'}
                                    </td>
                                    <td
                                        className={`px-4 py-2.5 text-[13px] font-mono tabular-nums ${
                                            e.type === 'INCOME'
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-destructive'
                                        }`}
                                    >
                                        {e.type === 'INCOME' ? '+' : '−'}
                                        {formatCurrency(e.amount)}
                                    </td>
                                    <td className="px-4 py-2.5 text-[12px] text-muted-foreground">
                                        {e.createdByName ?? '—'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowDownCircle, ArrowUpCircle, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency } from '@/lib/api';

interface ExpenseSummary {
    period: string;
    totalIncome: number;
    totalExpense: number;
    netResult: number;
    expenseByCategory: { categoryName: string; amount: number; percentage: number }[];
    incomeByCategory: { categoryName: string; amount: number; percentage: number }[];
}

export default function ExpensesSummaryPage() {
    const [summary, setSummary] = useState<ExpenseSummary | null>(null);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/expenses/summary');
            setSummary(res.data?.data ?? res.data);
        } catch {
            setSummary(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <h1 className="text-lg font-semibold text-foreground">Gelir/Gider Özeti</h1>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-20 w-full" />))}
                </div>
            ) : summary ? (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Toplam Gelir', value: formatCurrency(summary.totalIncome), icon: ArrowUpCircle, iconClass: 'text-success' },
                            { label: 'Toplam Gider', value: formatCurrency(summary.totalExpense), icon: ArrowDownCircle, iconClass: 'text-destructive' },
                            { label: 'Net Sonuç', value: formatCurrency(summary.netResult), icon: DollarSign, iconClass: summary.netResult >= 0 ? 'text-success' : 'text-destructive' },
                            { label: 'Dönem', value: summary.period, icon: DollarSign, iconClass: 'text-muted-foreground' },
                        ].map((kpi) => (
                            <div key={kpi.label} className="rounded-[10px] border border-border bg-card p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <kpi.icon className={`w-4 h-4 ${kpi.iconClass}`} strokeWidth={1.5} />
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                                </div>
                                <p className={`text-xl font-semibold font-mono tabular-nums ${kpi.iconClass}`}>{kpi.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-[10px] border border-border bg-card p-4">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">Gider Dağılımı</p>
                            <div className="space-y-2">
                                {summary.expenseByCategory.map((cat) => (
                                    <div key={cat.categoryName} className="flex items-center gap-2">
                                        <span className="text-[13px] text-foreground flex-1">{cat.categoryName}</span>
                                        <div className="w-24 bg-muted rounded-full h-1.5 hidden sm:block">
                                            <div className="bg-destructive h-1.5 rounded-full" style={{ width: `${cat.percentage}%` }} />
                                        </div>
                                        <span className="text-[13px] font-mono tabular-nums text-muted-foreground w-24 text-right">{formatCurrency(cat.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-[10px] border border-border bg-card p-4">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">Gelir Dağılımı</p>
                            <div className="space-y-2">
                                {summary.incomeByCategory.map((cat) => (
                                    <div key={cat.categoryName} className="flex items-center gap-2">
                                        <span className="text-[13px] text-foreground flex-1">{cat.categoryName}</span>
                                        <div className="w-24 bg-muted rounded-full h-1.5 hidden sm:block">
                                            <div className="bg-success h-1.5 rounded-full" style={{ width: `${cat.percentage}%` }} />
                                        </div>
                                        <span className="text-[13px] font-mono tabular-nums text-muted-foreground w-24 text-right">{formatCurrency(cat.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="rounded-[10px] border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                    Özet verisi bulunamadı.
                </div>
            )}
        </div>
    );
}
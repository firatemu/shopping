'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency, formatDate } from '@/lib/api';
import { useTabStore } from '@/stores/useTabStore';

interface Expense {
    id: string;
    type: string;
    category: string;
    amount: number;
    description: string;
    reference: string;
    createdAt: string;
}

export default function ExpensesPage() {
    const router = useRouter();
    const addTab = useTabStore((s) => s.addTab);
    const [expenses, setExpenses] = useState<{ data: Expense[]; meta: { total: number } } | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/expenses', { params: { limit: 30, search: search || undefined } });
            setExpenses(res.data);
        } catch {
            setExpenses({ data: [], meta: { total: 0 } });
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { fetch(); }, [fetch]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-foreground">Giderler</h1>
                <Button onClick={() => { addTab({ title: 'Yeni Gider', path: '/expenses/new', closable: true }); router.push('/expenses/new'); }} className="h-8 gap-1.5">
                    <Plus className="w-4 h-4" /> Yeni Gider
                </Button>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kategori veya açıklama ara..." className="h-[34px] pl-8" />
            </div>

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Tarih', 'Kategori', 'Açıklama', 'Tutar'].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="border-b border-border">
                                {Array.from({ length: 4 }).map((_, j) => (<td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>))}
                            </tr>
                        )) : expenses?.data.length === 0 ? (
                            <tr><td colSpan={4} className="px-4 py-16 text-center">
                                <Receipt className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                <p className="text-sm text-muted-foreground">Gider bulunamadı</p>
                            </td></tr>
                        ) : expenses?.data.map((e) => (
                            <tr key={e.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{formatDate(e.createdAt)}</td>
                                <td className="px-4 py-2.5"><Badge variant="secondary" className="text-[10px]">{e.category}</Badge></td>
                                <td className="px-4 py-2.5 text-[13px] text-foreground">{e.description}</td>
                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-destructive">{formatCurrency(e.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

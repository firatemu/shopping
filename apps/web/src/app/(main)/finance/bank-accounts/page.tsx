'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Landmark, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency } from '@/lib/api';
import { useTabStore } from '@/stores/useTabStore';

const KIND_LABELS: Record<string, string> = {
    CHECKING: 'Vadesiz banka (havale / EFT)',
    POS_SETTLEMENT: 'POS mutabakat (kart tahsilat)',
    CREDIT_CARD: 'Firma kredi kartı (kart ödeme)',
};

interface BankRow {
    id: string;
    name: string;
    bankName: string;
    kind: string;
    currency: string;
    currentBalance: string | number;
}

export default function BankAccountsPage() {
    const router = useRouter();
    const addTab = useTabStore((s) => s.addTab);
    const [rows, setRows] = useState<BankRow[] | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/bank-accounts', { params: { limit: 50 } });
            setRows(res.data.data ?? []);
        } catch {
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-lg font-semibold text-foreground">Banka hesapları</h1>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                        Hesap türü, tahsilat ve ödeme ekranlarında hangi kanalların seçilebileceğini belirler.
                    </p>
                </div>
                <Button
                    className="h-8 shrink-0 gap-1.5"
                    onClick={() => {
                        addTab({ title: 'Yeni banka hesabı', path: '/finance/bank-accounts/new', closable: true });
                        router.push('/finance/bank-accounts/new');
                    }}
                >
                    <Plus className="w-4 h-4" /> Yeni hesap
                </Button>
            </div>

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Ad', 'Banka', 'Tür', 'Para', 'Bakiye'].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
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
                                        <td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-24" /></td>
                                    ))}
                                </tr>
                            ))
                        ) : rows?.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-16 text-center">
                                    <Landmark className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                    <p className="text-sm text-muted-foreground">Henüz banka hesabı yok</p>
                                    <Link href="/finance/bank-accounts/new" className="text-sm text-primary mt-2 inline-block">İlk hesabı oluştur</Link>
                                </td>
                            </tr>
                        ) : (
                            rows?.map((r) => (
                                <tr key={r.id} className="border-b border-border hover:bg-accent/40">
                                    <td className="px-4 py-2.5 text-sm font-medium">{r.name}</td>
                                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{r.bankName}</td>
                                    <td className="px-4 py-2.5 text-[13px]">{KIND_LABELS[r.kind] ?? r.kind}</td>
                                    <td className="px-4 py-2.5 text-[13px]">{r.currency}</td>
                                    <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums">{formatCurrency(Number(r.currentBalance))}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

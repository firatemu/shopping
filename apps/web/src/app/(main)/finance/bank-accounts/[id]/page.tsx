'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency, formatDate } from '@/lib/api';

interface BankAccount {
    id: string;
    accountName: string;
    accountNumber: string;
    bankName: string;
    currency: string;
    currentBalance: number;
    isActive: boolean;
}

interface Movement {
    id: string;
    date: string;
    type: string;
    amount: number;
    description?: string;
    reference?: string;
}

export default function BankAccountDetailPage() {
    const params = useParams();
    const accountId = params.id as string;

    const [account, setAccount] = useState<BankAccount | null>(null);
    const [movements, setMovements] = useState<{ data: Movement[] } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const [accRes, movRes] = await Promise.all([
                api.get(`/bank-accounts/${accountId}`),
                api.get(`/bank-accounts/${accountId}/movements`),
            ]);
            setAccount(accRes.data?.data ?? accRes.data);
            setMovements(movRes.data?.data ?? movRes.data);
        } catch {
            setAccount(null);
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => { fetch(); }, [fetch]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    <h1 className="text-lg font-semibold text-foreground">Banka Hesabı</h1>
                </div>
                <Link href={`/finance/bank-accounts/${accountId}/edit`}>
                    <Button variant="secondary" size="sm" className="h-8 gap-1.5">
                        <Pencil className="w-4 h-4" /> Düzenle
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-20 w-full" />))}</div>
            ) : account ? (
                <>
                    <div className="rounded-[10px] border border-border bg-card p-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Hesap Adı</p>
                                <p className="text-[13px] font-medium text-foreground mt-0.5">{account.accountName}</p>
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Banka</p>
                                <p className="text-[13px] text-foreground mt-0.5">{account.bankName}</p>
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Hesap No</p>
                                <p className="text-[13px] font-mono text-foreground mt-0.5">{account.accountNumber}</p>
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Bakiye</p>
                                <p className={`text-lg font-semibold font-mono tabular-nums mt-0.5 ${account.currentBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                                    {formatCurrency(account.currentBalance)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Son Hareketler</p>
                        <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        {['Tarih', 'Açıklama', 'Tutar', 'Referans'].map((h) => (
                                            <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {movements?.data.length === 0 ? (
                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">Hareket bulunamadı.</td></tr>
                                    ) : movements?.data.map((m) => (
                                        <tr key={m.id} className="border-b border-border hover:bg-accent/50">
                                            <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{formatDate(m.date)}</td>
                                            <td className="px-4 py-2.5 text-[13px] text-foreground">{m.description ?? m.type}</td>
                                            <td className={`px-4 py-2.5 text-[13px] font-mono tabular-nums font-medium ${m.type === 'CREDIT' ? 'text-success' : 'text-destructive'}`}>
                                                {m.type === 'CREDIT' ? '+' : '-'}{formatCurrency(m.amount)}
                                            </td>
                                            <td className="px-4 py-2.5 text-[11px] font-mono text-muted-foreground">{m.reference ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="rounded-[10px] border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                    Hesap bulunamadı.
                </div>
            )}
        </div>
    );
}
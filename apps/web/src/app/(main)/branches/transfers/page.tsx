'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowLeftRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatDate } from '@/lib/api';

interface Transfer {
    id: string;
    fromBranchName: string;
    toBranchName: string;
    status: string;
    createdAt: string;
    itemCount: number;
    createdByName: string;
}

const statusLabels: Record<string, string> = {
    PENDING: 'Bekliyor', SENT: 'Gönderildi', RECEIVED: 'Teslim Alındı', CANCELLED: 'İptal',
};

export default function BranchTransfersPage() {
    const [transfers, setTransfers] = useState<{ data: Transfer[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/branches/transfers/list', { params: { search: search || undefined } });
            setTransfers(res.data?.data ?? res.data);
        } catch {
            setTransfers({ data: [] });
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { fetch(); }, [fetch]);

    const handleReceive = async (id: string) => {
        try {
            await api.post(`/branches/transfers/${id}/receive`);
            fetch();
        } catch { /* ignore */ }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ArrowLeftRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    <h1 className="text-lg font-semibold text-foreground">Stok Transferleri</h1>
                </div>
                <Button onClick={() => window.location.href = '/branches/transfers/new'} className="h-8 gap-1.5">
                    Yeni Transfer
                </Button>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Transfer ara..." className="h-[34px] pl-8" />
            </div>

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Tarih', 'Gönderen', 'Alan', 'Ürün', 'Durum', 'Oluşturan'].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i} className="border-b border-border">
                                {Array.from({ length: 6 }).map((_, j) => (<td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>))}
                            </tr>
                        )) : transfers?.data.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-16 text-center">
                                <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                <p className="text-sm text-muted-foreground">Transfer bulunamadı.</p>
                            </td></tr>
                        ) : transfers?.data.map((t) => (
                            <tr key={t.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{formatDate(t.createdAt)}</td>
                                <td className="px-4 py-2.5 text-[13px] text-foreground">{t.fromBranchName}</td>
                                <td className="px-4 py-2.5 text-[13px] text-foreground">{t.toBranchName}</td>
                                <td className="px-4 py-2.5 text-[13px] font-mono text-muted-foreground">{t.itemCount} ürün</td>
                                <td className="px-4 py-2.5">
                                    <Badge variant={t.status === 'RECEIVED' ? 'default' : t.status === 'PENDING' ? 'secondary' : 'outline'} className="text-[10px]">
                                        {statusLabels[t.status] ?? t.status}
                                    </Badge>
                                </td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{t.createdByName}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
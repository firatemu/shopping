'use client';

import { useEffect, useState, useCallback } from 'react';
import { Ticket, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatDate, formatCurrency } from '@/lib/api';

interface Voucher {
    id: string;
    code: string;
    campaignName: string;
    discountValue: number;
    usedAt: string | null;
    expiresAt: string;
    isUsed: boolean;
    usedByName?: string;
}

export default function CampaignVouchersPage() {
    const [vouchers, setVouchers] = useState<{ data: Voucher[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/campaigns/vouchers', { params: { search: search || undefined } });
            setVouchers(res.data?.data ?? res.data);
        } catch {
            setVouchers({ data: [] });
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { fetch(); }, [fetch]);

    const generateVoucher = async () => {
        try {
            await api.post('/campaigns/vouchers');
            fetch();
        } catch { /* ignore */ }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    <h1 className="text-lg font-semibold text-foreground">Çek Yönetimi</h1>
                </div>
                <Button onClick={generateVoucher} className="h-8 gap-1.5">
                    Yeni Çek Oluştur
                </Button>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Çek kodu ara..." className="h-[34px] pl-8" />
            </div>

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Kod', 'Kampanya', 'Değer', 'Son Kullanım', 'Durum', 'Kullanan'].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i} className="border-b border-border">
                                {Array.from({ length: 6 }).map((_, j) => (<td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>))}
                            </tr>
                        )) : vouchers?.data.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-16 text-center">
                                <Ticket className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                <p className="text-sm text-muted-foreground">Çek bulunamadı.</p>
                            </td></tr>
                        ) : vouchers?.data.map((v) => (
                            <tr key={v.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                                <td className="px-4 py-2.5 text-[13px] font-mono font-medium text-foreground">{v.code}</td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{v.campaignName}</td>
                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-foreground">{formatCurrency(v.discountValue)}</td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{formatDate(v.expiresAt)}</td>
                                <td className="px-4 py-2.5">
                                    <Badge variant={v.isUsed ? 'secondary' : 'default'} className="text-[10px]">
                                        {v.isUsed ? 'Kullanıldı' : 'Aktif'}
                                    </Badge>
                                </td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{v.usedByName ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
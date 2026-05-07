'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Tag, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatDate } from '@/lib/api';
import { useTabStore } from '@/stores/useTabStore';

interface Campaign {
    id: string;
    name: string;
    type: string;
    priority: number;
    isActive: boolean;
    startDate: string;
    endDate: string;
}

const typeLabels: Record<string, string> = {
    PERCENTAGE: 'Yüzdesel', FIXED_AMOUNT: 'Sabit Tutar',
    X_FOR_Y: 'X al Y öde', SECOND_ITEM: '2. Ürün İndirim',
    CATEGORY: 'Kategori',
};

export default function CampaignsPage() {
    const router = useRouter();
    const addTab = useTabStore((s) => s.addTab);
    const [campaigns, setCampaigns] = useState<{ data: Campaign[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/campaigns', { params: { search: search || undefined } });
            setCampaigns(res.data?.data ?? res.data);
        } catch {
            setCampaigns({ data: [] });
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { fetch(); }, [fetch]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-foreground">Kampanyalar</h1>
                <Button onClick={() => { addTab({ title: 'Yeni Kampanya', path: '/campaigns/new', closable: true }); router.push('/campaigns/new'); }} className="h-8 gap-1.5">
                    <Plus className="w-4 h-4" /> Yeni Kampanya
                </Button>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kampanya ara..." className="h-[34px] pl-8" />
            </div>

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Kampanya', 'Tür', 'Öncelik', 'Tarih Aralığı', 'Durum', 'İşlemler'].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i} className="border-b border-border">
                                {Array.from({ length: 5 }).map((_, j) => (<td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>))}
                            </tr>
                        )) : campaigns?.data.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-16 text-center">
                                <Tag className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                <p className="text-sm text-muted-foreground">Kampanya bulunamadı</p>
                            </td></tr>
                        ) : campaigns?.data.map((c) => (
                            <tr key={c.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                                <td className="px-4 py-2.5 text-[13px] text-foreground font-medium cursor-pointer"
                                    onClick={() => { addTab({ title: c.name, path: `/campaigns/${c.id}`, closable: true }); router.push(`/campaigns/${c.id}`); }}>
                                    {c.name}
                                </td>
                                <td className="px-4 py-2.5"><Badge variant="secondary" className="text-[10px]">{typeLabels[c.type] ?? c.type}</Badge></td>
                                <td className="px-4 py-2.5 text-[13px] font-mono text-muted-foreground">{c.priority}</td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{formatDate(c.startDate)} — {formatDate(c.endDate)}</td>
                                <td className="px-4 py-2.5">
                                    <Badge variant={c.isActive ? 'default' : 'secondary'} className="text-[10px]">{c.isActive ? 'Aktif' : 'Pasif'}</Badge>
                                </td>
                                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                        onClick={() => { addTab({ title: `${c.name} - Düzenle`, path: `/campaigns/${c.id}/edit`, closable: true }); router.push(`/campaigns/${c.id}/edit`); }}
                                        title="Düzenle">
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Boxes, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatDate } from '@/lib/api';

interface StockMovement {
    id: string;
    type: string;
    quantity: number;
    productName: string;
    variantInfo: string;
    reference: string;
    createdAt: string;
}

const typeLabels: Record<string, { label: string; color: 'default' | 'secondary' | 'destructive' }> = {
    PURCHASE: { label: 'Alış', color: 'default' },
    SALE: { label: 'Satış', color: 'secondary' },
    RETURN: { label: 'İade', color: 'destructive' },
    ADJUSTMENT: { label: 'Düzeltme', color: 'secondary' },
    TRANSFER: { label: 'Transfer', color: 'default' },
};

export default function InventoryPage() {
    const [movements, setMovements] = useState<{ data: StockMovement[]; meta: { total: number } } | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/inventory/movements', { params: { limit: 30, search: search || undefined } });
            setMovements(res.data);
        } catch {
            setMovements({ data: [], meta: { total: 0 } });
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { fetch(); }, [fetch]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-foreground">Envanter</h1>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün veya referans ara..." className="h-[34px] pl-8" />
            </div>

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Tarih', 'Tür', 'Ürün', 'Miktar', 'Referans'].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="border-b border-border">
                                {Array.from({ length: 5 }).map((_, j) => (<td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>))}
                            </tr>
                        )) : movements?.data.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-16 text-center">
                                <Boxes className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                <p className="text-sm text-muted-foreground">Stok hareketi bulunamadı</p>
                            </td></tr>
                        ) : movements?.data.map((m) => {
                            const typeInfo = typeLabels[m.type] ?? { label: m.type, color: 'secondary' as const };
                            return (
                                <tr key={m.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{formatDate(m.createdAt)}</td>
                                    <td className="px-4 py-2.5"><Badge variant={typeInfo.color} className="text-[10px]">{typeInfo.label}</Badge></td>
                                    <td className="px-4 py-2.5">
                                        <p className="text-[13px] text-foreground">{m.productName}</p>
                                        <p className="text-[11px] text-muted-foreground">{m.variantInfo}</p>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className={`text-[13px] font-mono tabular-nums ${m.quantity > 0 ? 'text-success' : 'text-destructive'}`}>
                                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground font-mono">{m.reference}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

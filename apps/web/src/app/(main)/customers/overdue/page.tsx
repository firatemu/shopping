'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Search, Users, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency } from '@/lib/api';
import { useTabStore } from '@/stores/useTabStore';

interface OverdueCustomer {
    id: string;
    code: string;
    name: string;
    surname: string;
    companyName?: string;
    phone?: string;
    currentBalance: number;
    overdueDays: number;
}

export default function OverdueCustomersPage() {
    const router = useRouter();
    const addTab = useTabStore((s) => s.addTab);
    const [customers, setCustomers] = useState<{ data: OverdueCustomer[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/customers/overdue', { params: { search: search || undefined } });
            setCustomers(res.data?.data ?? res.data);
        } catch {
            setCustomers({ data: [] });
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { fetch(); }, [fetch]);

    const handleView = (e: React.MouseEvent, id: string, name: string, surname: string) => {
        e.stopPropagation();
        addTab({ title: `${name} ${surname}`, path: `/customers/${id}`, closable: true });
        router.push(`/customers/${id}`);
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" strokeWidth={1.5} />
                    <h1 className="text-lg font-semibold text-foreground">Vadesi Geçmiş Cariler</h1>
                </div>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari ara..."
                    className="h-[34px] pl-8"
                />
            </div>

            <div className="rounded-[10px] border border-destructive/30 bg-destructive/5 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Cari', 'Telefon', 'Borç', 'Vade (gün)', 'İşlemler'].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i} className="border-b border-border">
                                {Array.from({ length: 5 }).map((_, j) => (<td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>))}
                            </tr>
                        )) : customers?.data.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-16 text-center">
                                <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                <p className="text-sm text-muted-foreground">Vadesi geçmiş cari bulunamadı.</p>
                            </td></tr>
                        ) : customers?.data.map((c) => (
                            <tr key={c.id} className="border-b border-border hover:bg-accent/50 transition-colors cursor-pointer"
                                onClick={(e) => handleView(e as unknown as React.MouseEvent, c.id, c.name, c.surname)}>
                                <td className="px-4 py-2.5">
                                    <p className="text-[11px] font-mono text-muted-foreground">{c.code}</p>
                                    <p className="text-[13px] text-foreground font-medium">{c.name} {c.surname}</p>
                                    {c.companyName && <p className="text-[11px] text-muted-foreground">{c.companyName}</p>}
                                </td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{c.phone ?? '—'}</td>
                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums font-medium text-destructive">
                                    {formatCurrency(c.currentBalance)}
                                </td>
                                <td className="px-4 py-2.5">
                                    <Badge variant="destructive" className="text-[10px]">{c.overdueDays} gün</Badge>
                                </td>
                                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                        onClick={(e) => handleView(e as unknown as React.MouseEvent, c.id, c.name, c.surname)} title="İncele">
                                        <Eye className="w-4 h-4" />
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
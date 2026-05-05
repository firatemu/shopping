'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Users, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency } from '@/lib/api';
import { useTabStore } from '@/stores/useTabStore';

type CustomerType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH';

interface Customer {
    id: string;
    code: string;
    type: CustomerType;
    name: string;
    surname: string;
    companyName?: string;
    phone?: string;
    email?: string;
    taxId?: string;
    currentBalance: number;
    creditLimit: number;
    isActive: boolean;
}

export default function CustomersPage() {
    const router = useRouter();
    const addTab = useTabStore((s) => s.addTab);
    const [customers, setCustomers] = useState<{ data: Customer[]; meta: { total: number; page: number; totalPages: number } } | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [type, setType] = useState<CustomerType | 'ALL'>('ALL');
    const [page, setPage] = useState(1);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/customers', { params: { page, limit: 20, search: search || undefined, type: type === 'ALL' ? undefined : type } });
            setCustomers(res.data);
        } catch {
            setCustomers({ data: [], meta: { total: 0, page: 1, totalPages: 0 } });
        } finally {
            setLoading(false);
        }
    }, [page, search, type]);

    useEffect(() => { fetch(); }, [fetch]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-foreground">Cari hesaplar</h1>
                <Button onClick={() => { addTab({ title: 'Yeni Müşteri', path: '/customers/new', closable: true }); router.push('/customers/new'); }} className="h-8 gap-1.5">
                    <Plus className="w-4 h-4" /> Yeni Müşteri
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari kodu, ünvan, ad, telefon, vergi no…" className="h-[34px] pl-8" />
                </div>
                <select
                    className="h-[34px] rounded-md border border-input bg-transparent px-2 text-[13px] w-full sm:w-48"
                    value={type}
                    onChange={(e) => { setType(e.target.value as any); setPage(1); }}
                >
                    <option value="ALL">Tümü</option>
                    <option value="CUSTOMER">Müşteri</option>
                    <option value="SUPPLIER">Tedarikçi</option>
                    <option value="BOTH">Müşteri + Tedarikçi</option>
                </select>
            </div>

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Cari', 'Tür', 'Telefon', 'VKN', 'Bakiye', 'Limit', 'Durum'].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="border-b border-border">
                                {Array.from({ length: 7 }).map((_, j) => (<td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>))}
                            </tr>
                        )) : customers?.data.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-16 text-center">
                                <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                <p className="text-sm text-muted-foreground">Müşteri bulunamadı</p>
                            </td></tr>
                        ) : customers?.data.map((c) => (
                            <tr key={c.id} onClick={() => { addTab({ title: `${c.name} ${c.surname}`, path: `/customers/${c.id}`, closable: true }); router.push(`/customers/${c.id}`); }}
                                className="border-b border-border cursor-pointer hover:bg-accent/50 transition-colors">
                                <td className="px-4 py-2.5">
                                    <p className="text-[11px] font-mono text-muted-foreground">{c.code}</p>
                                    <p className="text-[13px] text-foreground font-medium">{c.name} {c.surname}</p>
                                    {c.companyName && <p className="text-[11px] text-muted-foreground">{c.companyName}</p>}
                                </td>
                                <td className="px-4 py-2.5">
                                    <Badge variant="outline" className="text-[10px] font-normal">
                                        {c.type === 'CUSTOMER' ? 'Müşteri' : c.type === 'SUPPLIER' ? 'Tedarikçi' : 'Her ikisi'}
                                    </Badge>
                                </td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{c.phone ?? '—'}</td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground font-mono tabular-nums">{c.taxId ?? '—'}</td>
                                <td className="px-4 py-2.5">
                                    <span className={`text-[13px] font-mono tabular-nums ${Number(c.currentBalance) > 0 ? 'text-destructive' : 'text-success'}`}>
                                        {formatCurrency(c.currentBalance)}
                                    </span>
                                </td>
                                <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-muted-foreground">{formatCurrency(c.creditLimit)}</td>
                                <td className="px-4 py-2.5">
                                    <Badge variant={c.isActive ? 'default' : 'secondary'} className="text-[10px]">{c.isActive ? 'Aktif' : 'Pasif'}</Badge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {customers && customers.meta.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
                        <p className="text-xs text-muted-foreground">{customers.meta.total} müşteri</p>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-7 text-xs">Önceki</Button>
                            <span className="text-xs text-muted-foreground px-2">{page} / {customers.meta.totalPages}</span>
                            <Button variant="ghost" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= customers.meta.totalPages} className="h-7 text-xs">Sonraki</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

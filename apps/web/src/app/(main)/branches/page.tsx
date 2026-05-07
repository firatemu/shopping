'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

interface Branch {
    id: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
    isActive: boolean;
}

export default function BranchesPage() {
    const router = useRouter();
    const [branches, setBranches] = useState<{ data: Branch[] } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/branches');
            setBranches(res.data?.data ?? res.data);
        } catch {
            setBranches({ data: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    <h1 className="text-lg font-semibold text-foreground">Şubeler</h1>
                </div>
                <Button onClick={() => router.push('/branches/new')} className="h-8 gap-1.5">
                    <Plus className="w-4 h-4" /> Yeni Şube
                </Button>
            </div>

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Şube Kodu', 'Şube Adı', 'Adres', 'Telefon', 'Durum'].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i} className="border-b border-border">
                                {Array.from({ length: 5 }).map((_, j) => (<td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>))}
                            </tr>
                        )) : branches?.data.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-16 text-center">
                                <Building2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                <p className="text-sm text-muted-foreground">Şube bulunamadı.</p>
                            </td></tr>
                        ) : branches?.data.map((b) => (
                            <tr key={b.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                                <td className="px-4 py-2.5 text-[13px] font-mono text-muted-foreground">{b.code}</td>
                                <td className="px-4 py-2.5 text-[13px] text-foreground font-medium">{b.name}</td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{b.address ?? '—'}</td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{b.phone ?? '—'}</td>
                                <td className="px-4 py-2.5">
                                    <Badge variant={b.isActive ? 'default' : 'secondary'} className="text-[10px]">
                                        {b.isActive ? 'Aktif' : 'Pasif'}
                                    </Badge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
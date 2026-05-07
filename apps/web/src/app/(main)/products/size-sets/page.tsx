'use client';

import { useEffect, useState, useCallback } from 'react';
import { Ruler, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

interface SizeSet {
    id: string;
    name: string;
    sizes: string[];
    productCount?: number;
}

export default function ProductsSizeSetsPage() {
    const [sizeSets, setSizeSets] = useState<{ data: SizeSet[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [newSizes, setNewSizes] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/catalog/size-sets');
            setSizeSets(res.data?.data ?? res.data);
        } catch {
            setSizeSets({ data: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || !newSizes.trim()) return;
        const sizes = newSizes.split(',').map((s) => s.trim()).filter(Boolean);
        if (sizes.length === 0) return;
        setCreateError('');
        setCreating(true);
        try {
            await api.post('/catalog/size-sets', { name: newName.trim(), sizes });
            setNewName('');
            setNewSizes('');
            fetch();
        } catch (err: unknown) {
            const data = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: unknown } } }).response?.data : undefined;
            const m = data?.message;
            setCreateError(Array.isArray(m) ? m.join('; ') : typeof m === 'string' ? m : 'Beden seti eklenemedi.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Ruler className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    <h1 className="text-lg font-semibold text-foreground">Beden Seti Yönetimi</h1>
                </div>
            </div>

            <form onSubmit={handleCreate} className="rounded-[10px] border border-border bg-card p-4 flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Set adı</label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ör: Standart ERKEK" className="h-[34px] w-48" />
                </div>
                <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Bedenler (virgülle ayrılmış)</label>
                    <Input value={newSizes} onChange={(e) => setNewSizes(e.target.value)} placeholder="S, M, L, XL, XXL" className="h-[34px] w-56" />
                </div>
                <Button type="submit" className="h-[34px]" disabled={creating || !newName.trim() || !newSizes.trim()}>
                    {creating ? '...' : <><Plus className="w-4 h-4" /> Ekle</>}
                </Button>
                {createError && <p className="w-full text-xs text-destructive">{createError}</p>}
            </form>

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Set Adı', 'Bedenler', 'Ürün Sayısı'].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i} className="border-b border-border">
                                {Array.from({ length: 3 }).map((_, j) => (<td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>))}
                            </tr>
                        )) : sizeSets?.data.length === 0 ? (
                            <tr><td colSpan={3} className="px-4 py-16 text-center">
                                <Ruler className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                <p className="text-sm text-muted-foreground">Beden seti bulunamadı.</p>
                            </td></tr>
                        ) : sizeSets?.data.map((ss) => (
                            <tr key={ss.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                                <td className="px-4 py-2.5 text-[13px] font-medium text-foreground">{ss.name}</td>
                                <td className="px-4 py-2.5">
                                    <div className="flex gap-1 flex-wrap">
                                        {ss.sizes.map((sz) => (
                                            <span key={sz} className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{sz}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{ss.productCount ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
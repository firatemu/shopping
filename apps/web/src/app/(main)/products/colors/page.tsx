'use client';

import { useEffect, useState, useCallback } from 'react';
import { Palette, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

interface ColorItem {
    id: string;
    name: string;
    code: string;
    productCount?: number;
}

export default function ProductsColorsPage() {
    const [colors, setColors] = useState<{ data: ColorItem[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/catalog/colors');
            setColors(res.data?.data ?? res.data);
        } catch {
            setColors({ data: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || !newCode.trim()) return;
        setCreateError('');
        setCreating(true);
        try {
            await api.post('/catalog/colors', { name: newName.trim(), code: newCode.trim() });
            setNewName('');
            setNewCode('');
            fetch();
        } catch (err: unknown) {
            const data = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: unknown } } }).response?.data : undefined;
            const m = data?.message;
            setCreateError(Array.isArray(m) ? m.join('; ') : typeof m === 'string' ? m : 'Renk eklenemedi.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    <h1 className="text-lg font-semibold text-foreground">Renk Yönetimi</h1>
                </div>
            </div>

            <form onSubmit={handleCreate} className="rounded-[10px] border border-border bg-card p-4 flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Renk adı</label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ör: Lacivert" className="h-[34px] w-40" />
                </div>
                <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Renk kodu</label>
                    <div className="flex gap-2 items-center">
                        <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="#0000FF" className="h-[34px] w-28 font-mono" maxLength={7} />
                        {newCode && (
                            <div className="w-8 h-8 rounded border border-border" style={{ backgroundColor: newCode.startsWith('#') ? newCode : `#${newCode}` }} />
                        )}
                    </div>
                </div>
                <Button type="submit" className="h-[34px]" disabled={creating || !newName.trim() || !newCode.trim()}>
                    {creating ? '...' : <><Plus className="w-4 h-4" /> Ekle</>}
                </Button>
                {createError && <p className="w-full text-xs text-destructive">{createError}</p>}
            </form>

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Renk', 'Kod', 'Ürün Sayısı', ''].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i} className="border-b border-border">
                                {Array.from({ length: 4 }).map((_, j) => (<td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>))}
                            </tr>
                        )) : colors?.data.length === 0 ? (
                            <tr><td colSpan={4} className="px-4 py-16 text-center">
                                <Palette className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                <p className="text-sm text-muted-foreground">Renk bulunamadı.</p>
                            </td></tr>
                        ) : colors?.data.map((c) => (
                            <tr key={c.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                                <td className="px-4 py-2.5 flex items-center gap-2">
                                    <div className="w-5 h-5 rounded border border-border flex-shrink-0" style={{ backgroundColor: c.code.startsWith('#') ? c.code : `#${c.code}` }} />
                                    <span className="text-[13px] font-medium text-foreground">{c.name}</span>
                                </td>
                                <td className="px-4 py-2.5 text-[13px] font-mono text-muted-foreground">{c.code}</td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{c.productCount ?? '—'}</td>
                                <td className="px-4 py-2.5 text-right">
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
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
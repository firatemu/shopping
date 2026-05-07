'use client';

import { useEffect, useState, useCallback } from 'react';
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

interface LabelTemplate {
    id: string;
    name: string;
    type: string;
    widthMm: number;
    heightMm: number;
    fields: string[];
    isDefault: boolean;
}

export default function LabelTemplatesPage() {
    const [templates, setTemplates] = useState<{ data: LabelTemplate[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/label-templates');
            setTemplates(res.data?.data ?? res.data);
        } catch {
            setTemplates({ data: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setCreateError('');
        setCreating(true);
        try {
            await api.post('/label-templates', { name: newName.trim(), type: 'STANDARD', widthMm: 50, heightMm: 25, fields: ['name', 'price', 'barcode'] });
            setNewName('');
            setShowForm(false);
            fetch();
        } catch (err: unknown) {
            const data = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: unknown } } }).response?.data : undefined;
            const m = data?.message;
            setCreateError(Array.isArray(m) ? m.join('; ') : typeof m === 'string' ? m : 'Şablon eklenemedi.');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu şablonu silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/label-templates/${id}`);
            fetch();
        } catch { /* ignore */ }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    <h1 className="text-lg font-semibold text-foreground">Etiket Şablonları</h1>
                </div>
                <Button onClick={() => setShowForm(true)} className="h-8 gap-1.5">
                    <Plus className="w-4 h-4" /> Yeni Şablon
                </Button>
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className="rounded-[10px] border border-border bg-card p-4 flex gap-3 items-end">
                    <div className="space-y-1 flex-1">
                        <label className="text-[11px] text-muted-foreground">Şablon adı</label>
                        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ör: Standart Etiket" className="h-[34px]" />
                    </div>
                    <Button type="submit" className="h-[34px]" disabled={creating || !newName.trim()}>{creating ? '...' : 'Ekle'}</Button>
                    <Button type="button" variant="ghost" className="h-[34px]" onClick={() => setShowForm(false)}>İptal</Button>
                    {createError && <p className="w-full text-xs text-destructive">{createError}</p>}
                </form>
            )}

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Şablon Adı', 'Tür', 'Boyut (mm)', 'Alanlar', 'Varsayılan', ''].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i} className="border-b border-border">
                                {Array.from({ length: 6 }).map((_, j) => (<td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>))}
                            </tr>
                        )) : templates?.data.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-16 text-center">
                                <Tag className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                <p className="text-sm text-muted-foreground">Şablon bulunamadı.</p>
                            </td></tr>
                        ) : templates?.data.map((t) => (
                            <tr key={t.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                                <td className="px-4 py-2.5 text-[13px] font-medium text-foreground">{t.name}</td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{t.type}</td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{t.widthMm} × {t.heightMm}</td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{t.fields.join(', ')}</td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{t.isDefault ? '✅' : ''}</td>
                                <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                            onClick={() => handleDelete(t.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

interface ExpCat {
    id: string;
    name: string;
    kind: 'INCOME' | 'EXPENSE';
}

export default function NewExpensePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
    const [categories, setCategories] = useState<ExpCat[]>([]);
    const [categoryId, setCategoryId] = useState('');
    const [newCatName, setNewCatName] = useState('');
    const [addingCat, setAddingCat] = useState(false);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [reference, setReference] = useState('');

    const loadCategories = useCallback(async (kind: 'EXPENSE' | 'INCOME') => {
        try {
            const res = await api.get<ExpCat[]>('/expenses/categories', { params: { kind } });
            const list = res.data ?? [];
            setCategories(list);
            setCategoryId((prev) => {
                if (prev && list.some((c) => c.id === prev)) return prev;
                return list[0]?.id ?? '';
            });
        } catch {
           setCategories([]);
            setCategoryId('');
        }
    }, []);

    useEffect(() => {
        loadCategories(type);
    }, [type, loadCategories]);

    const addCategory = async () => {
        const name = newCatName.trim();
        if (!name) {
            setError('Yeni kategori adı girin.');
            return;
        }
        setAddingCat(true);
        setError(null);
        try {
            await api.post('/expenses/categories', { name, kind: type });
            setNewCatName('');
            await loadCategories(type);
        } catch (err: unknown) {
            const data =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: unknown } } }).response?.data
                    : undefined;
            const m = data?.message;
            setError(
                Array.isArray(m) ? m.join('; ') : typeof m === 'string' ? m : 'Kategori eklenemedi.',
            );
        } finally {
            setAddingCat(false);
        }
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!categoryId) {
            setError('Önce bir kategori seçin veya oluşturun.');
            return;
        }
        const am = Number(amount.replace(',', '.'));
        if (!Number.isFinite(am) || am <= 0) {
            setError('Geçerli tutar girin.');
            return;
        }
        setLoading(true);
        try {
            await api.post('/expenses', {
                type,
                categoryId,
                amount: am,
                description: description.trim() || undefined,
                reference: reference.trim() || undefined,
                date: new Date().toISOString(),
            });
            router.push('/expenses');
        } catch (err: unknown) {
            const data =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: unknown } } }).response?.data
                    : undefined;
            const m = data?.message;
            setError(
                Array.isArray(m) ? m.join('; ') : typeof m === 'string' ? m : 'Kayıt eklenemedi.',
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-xl space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-foreground">Yeni Gider / Gelir</h1>
                <Link
                    href="/expenses"
                    className="inline-flex items-center justify-center h-8 px-3 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                    Geri
                </Link>
            </div>

            <form onSubmit={submit} className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="space-y-1.5">
                    <Label htmlFor="ex-type">Tür</Label>
                    <select
                        id="ex-type"
                        className="w-full h-[34px] rounded-md border border-input bg-transparent px-2 text-[13px]"
                        value={type}
                        onChange={(e) => setType(e.target.value as 'EXPENSE' | 'INCOME')}
                    >
                        <option value="EXPENSE">Gider</option>
                        <option value="INCOME">Gelir</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="cat-select">Kategori *</Label>
                    <select
                        id="cat-select"
                        className="w-full h-[34px] rounded-md border border-input bg-transparent px-2 text-[13px]"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                    >
                        {categories.length === 0 ? (
                            <option value="">— Önce kategori ekleyin —</option>
                        ) : (
                            categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))
                        )}
                    </select>
                </div>
                <div className="rounded-md border border-dashed border-border p-3 space-y-2 bg-muted/20">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Yeni kategori</p>
                    <div className="flex gap-2">
                        <Input
                            placeholder={
                                type === 'EXPENSE' ? 'Örn. Elektrik giderleri' : 'Örn. Faiz geliri'
                            }
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            className="h-[34px] flex-1"
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            className="h-8 shrink-0 gap-1"
                            onClick={addCategory}
                            disabled={addingCat}
                        >
                            <Plus className="w-3.5 h-3.5" /> Ekle
                        </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                        Kategoriler gelir ve gider için ayrı tanımlanır (aynı isim iki türde olabilir).
                    </p>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="amt">Tutar (TRY) *</Label>
                    <Input id="amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="desc">Açıklama</Label>
                    <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="ref">Referans / fatura no</Label>
                    <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading || !categoryId}>
                    Kaydet
                </Button>
            </form>
        </div>
    );
}

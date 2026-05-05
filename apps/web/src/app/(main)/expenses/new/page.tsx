'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

export default function NewExpensePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!category.trim()) {
            setError('Kategori zorunludur.');
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
                category: category.trim(),
                amount: am,
                description: description.trim() || undefined,
                date: new Date().toISOString(),
            });
            router.push('/expenses');
        } catch {
            setError('Kayıt eklenemedi.');
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
                    <Label htmlFor="cat">Kategori *</Label>
                    <Input id="cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Örn. Kira, Elektrik" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="amt">Tutar (TRY) *</Label>
                    <Input id="amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="desc">Açıklama</Label>
                    <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading}>
                    Kaydet
                </Button>
            </form>
        </div>
    );
}

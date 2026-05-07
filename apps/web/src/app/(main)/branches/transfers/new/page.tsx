'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

interface BranchOption { id: string; name: string; }

export default function NewBranchTransferPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [toBranchId, setToBranchId] = useState('');
    const [note, setNote] = useState('');
    const [items, setItems] = useState<{ variantId: string; productName: string; quantity: number }[]>([]);

    // Load branches for dropdown
    useState(() => {
        api.get('/branches').then((res) => {
            setBranches(res.data?.data ?? res.data ?? []);
        }).catch(() => {});
    });

    const addItem = (variantId: string, productName: string) => {
        if (!variantId || items.some((i) => i.variantId === variantId)) return;
        setItems((prev) => [...prev, { variantId, productName, quantity: 1 }]);
    };

    const removeItem = (variantId: string) => {
        setItems((prev) => prev.filter((i) => i.variantId !== variantId));
    };

    const updateQuantity = (variantId: string, quantity: number) => {
        setItems((prev) => prev.map((i) => i.variantId === variantId ? { ...i, quantity } : i));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!toBranchId) { setError('Hedef şube seçin.'); return; }
        if (items.length === 0) { setError('En az bir ürün ekleyin.'); return; }
        setLoading(true);
        setError('');
        try {
            await api.post('/branches/transfers', {
                toBranchId,
                note: note.trim() || undefined,
                items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
            });
            router.push('/branches/transfers');
        } catch (err: unknown) {
            const data = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: unknown } } }).response?.data : undefined;
            const m = data?.message;
            setError(Array.isArray(m) ? m.join('; ') : typeof m === 'string' ? m : 'Transfer oluşturulamadı.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl space-y-4">
            <h1 className="text-lg font-semibold text-foreground">Yeni Stok Transferi</h1>

            <form onSubmit={handleSubmit} className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="space-y-1.5">
                    <Label htmlFor="to-branch">Hedef Şube *</Label>
                    <select
                        id="to-branch"
                        className="w-full h-[34px] rounded-md border border-input bg-transparent px-2 text-[13px]"
                        value={toBranchId}
                        onChange={(e) => setToBranchId(e.target.value)}
                    >
                        <option value="">Şube seçin...</option>
                        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="note">Not</Label>
                    <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Açıklama..." />
                </div>

                <div className="space-y-1.5">
                    <Label>Transfer Ürünleri</Label>
                    {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Henüz ürün eklenmedi.</p>
                    ) : (
                        <div className="rounded-[8px] border border-border divide-y divide-border">
                            {items.map((item) => (
                                <div key={item.variantId} className="flex items-center gap-2 p-2">
                                    <span className="flex-1 text-sm">{item.productName}</span>
                                    <Input
                                        type="number"
                                        value={item.quantity}
                                        min={1}
                                        onChange={(e) => updateQuantity(item.variantId, Number(e.target.value))}
                                        className="w-20 h-[28px] text-center"
                                    />
                                    <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive"
                                        onClick={() => removeItem(item.variantId)}>Kaldır</Button>
                                </div>
                            ))}
                        </div>
                    )}
                    <p className="text-[11px] text-muted-foreground">Ürün eklemek için barkod taratın veya arama yapın. (Barkod araması henüz entegre değil.)</p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Oluşturuluyor...' : 'Transfer oluştur'}
                </Button>
            </form>
        </div>
    );
}
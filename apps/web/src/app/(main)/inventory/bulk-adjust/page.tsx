'use client';

import { useState } from 'react';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

interface BulkAdjustItem {
    variantId: string;
    productName: string;
    variantDesc?: string;
    currentStock: number;
    newStock: number;
}

export default function InventoryBulkAdjustPage() {
    const [items, setItems] = useState<BulkAdjustItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [search, setSearch] = useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!search.trim()) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/products/barcodes/lookup', { barcode: search.trim() });
            const data = res.data?.data ?? res.data;
            const variant = Array.isArray(data) ? data[0] : data;
            if (!variant) { setError('Ürün bulunamadı.'); return; }
            if (items.some((i) => i.variantId === variant.variantId)) { setError('Bu ürün zaten listede.'); return; }
            setItems((prev) => [...prev, {
                variantId: variant.variantId,
                productName: variant.productName,
                variantDesc: variant.variantDesc,
                currentStock: variant.stockQuantity,
                newStock: variant.stockQuantity,
            }]);
            setSearch('');
        } catch {
            setError('Ürün bulunamadı.');
        } finally {
            setLoading(false);
        }
    };

    const updateNewStock = (variantId: string, newStock: number) => {
        setItems((prev) => prev.map((i) => i.variantId === variantId ? { ...i, newStock } : i));
    };

    const removeItem = (variantId: string) => {
        setItems((prev) => prev.filter((i) => i.variantId !== variantId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) return;
        setSubmitting(true);
        setError('');
        setSuccess(false);
        try {
            await api.patch('/inventory/bulk-adjust', {
                adjustments: items.map((i) => ({ variantId: i.variantId, newStock: i.newStock })),
            });
            setSuccess(true);
            setItems([]);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: unknown) {
            const data = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: unknown } } }).response?.data : undefined;
            const m = data?.message;
            setError(Array.isArray(m) ? m.join('; ') : typeof m === 'string' ? m : 'Güncelleme yapılamadı.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl space-y-4">
            <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <h1 className="text-lg font-semibold text-foreground">Toplu Stok Düzeltme</h1>
            </div>

            {success && (
                <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium bg-green-600 text-white animate-in fade-in slide-in-from-top-2">
                    Stok başarıyla güncellendi.
                </div>
            )}

            <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Barkod tarayın veya girin..."
                    className="h-[34px] font-mono flex-1 max-w-sm"
                />
                <Button type="submit" className="h-[34px]" disabled={loading || !search.trim()}>
                    {loading ? '...' : 'Ekle'}
                </Button>
            </form>

            {error && !success && <p className="text-sm text-destructive">{error}</p>}

            {items.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-border bg-card p-8 text-center">
                    <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">Henüz ürün eklenmedi. Barkod tarayarak ürün ekleyin.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    {['Ürün', 'Mevcut', 'Yeni Stok', ''].map((h) => (
                                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.variantId} className="border-b border-border">
                                        <td className="px-4 py-2.5">
                                            <p className="text-[13px] text-foreground">{item.productName}</p>
                                            {item.variantDesc && <p className="text-[11px] text-muted-foreground">{item.variantDesc}</p>}
                                        </td>
                                        <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-muted-foreground">{item.currentStock}</td>
                                        <td className="px-4 py-2.5">
                                            <Input
                                                type="number"
                                                value={item.newStock}
                                                min={0}
                                                onChange={(e) => updateNewStock(item.variantId, Number(e.target.value))}
                                                className="h-[28px] w-24 text-center font-mono"
                                            />
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive"
                                                onClick={() => removeItem(item.variantId)}>Kaldır</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting || items.length === 0}>
                        {submitting ? 'Kaydediliyor...' : `${items.length} ürünü güncelle`}
                    </Button>
                </form>
            )}
        </div>
    );
}
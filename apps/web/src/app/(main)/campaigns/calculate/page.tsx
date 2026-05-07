'use client';

import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, formatCurrency } from '@/lib/api';

interface CampaignResult {
    campaignName: string;
    originalTotal: number;
    discountAmount: number;
    finalTotal: number;
    appliedToItems: string[];
}

export default function CampaignCalculatePage() {
    const [cartTotal, setCartTotal] = useState('');
    const [result, setResult] = useState<CampaignResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCalculate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResult(null);
        const total = Number(cartTotal.replace(',', '.'));
        if (!Number.isFinite(total) || total <= 0) {
            setError('Geçerli bir sepet tutarı girin.');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/campaigns/calculate', { cartTotal: total });
            setResult(res.data?.data ?? res.data);
        } catch (err: unknown) {
            const data = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: unknown } } }).response?.data : undefined;
            const m = data?.message;
            setError(Array.isArray(m) ? m.join('; ') : typeof m === 'string' ? m : 'Hesaplama yapılamadı.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-xl space-y-4">
            <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <h1 className="text-lg font-semibold text-foreground">Kampanya Hesaplama</h1>
            </div>

            <form onSubmit={handleCalculate} className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="space-y-1.5">
                    <Label htmlFor="cart-total">Sepet Tutarı (TRY)</Label>
                    <Input
                        id="cart-total"
                        inputMode="decimal"
                        value={cartTotal}
                        onChange={(e) => setCartTotal(e.target.value)}
                        placeholder="0,00"
                    />
                </div>
                <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                    {loading ? 'Hesaplanıyor...' : 'Kampanya uygula'}
                </Button>
            </form>

            {result && (
                <div className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                    <h2 className="text-sm font-semibold text-foreground">Sonuç: {result.campaignName}</h2>
                    <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Sepet tutarı</span>
                            <span className="font-mono tabular-nums">{formatCurrency(result.originalTotal)}</span>
                        </div>
                        <div className="flex justify-between text-success">
                            <span className="text-muted-foreground">İndirim</span>
                            <span className="font-mono tabular-nums">-{formatCurrency(result.discountAmount)}</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t border-border pt-2">
                            <span>Ödenecek</span>
                            <span className="font-mono tabular-nums">{formatCurrency(result.finalTotal)}</span>
                        </div>
                    </div>
                    {result.appliedToItems.length > 0 && (
                        <div className="text-xs text-muted-foreground pt-2 border-t border-dashed border-border">
                            Uygulanan ürünler: {result.appliedToItems.join(', ')}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
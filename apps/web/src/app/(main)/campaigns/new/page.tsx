'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

const CAMPAIGN_TYPES = [
    { value: 'PERCENTAGE_DISCOUNT', label: 'Yüzdesel indirim' },
    { value: 'FIXED_DISCOUNT', label: 'Sabit tutar indirim' },
    { value: 'BUY_X_GET_Y', label: 'X al Y öde' },
    { value: 'SECOND_ITEM_PERCENT', label: '2. ürün indirimi' },
    { value: 'FREE_GIFT', label: 'Kategori / hediye' },
] as const;

export default function NewCampaignPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [type, setType] = useState<(typeof CAMPAIGN_TYPES)[number]['value']>('PERCENTAGE_DISCOUNT');
    const [name, setName] = useState('');
    const [discountPercent, setDiscountPercent] = useState('');
    const [discountAmount, setDiscountAmount] = useState('');
    const [buyQuantity, setBuyQuantity] = useState('');
    const [getQuantity, setGetQuantity] = useState('');
    const [minOrderAmount, setMinOrderAmount] = useState('');
    const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(() => new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!name.trim()) {
            setError('Kampanya adı zorunludur.');
            return;
        }
        setLoading(true);
        try {
            const body: Record<string, unknown> = {
                name: name.trim(),
                type,
                startDate,
                endDate,
                isActive: true,
            };
            const dp = Number(discountPercent.replace(',', '.'));
            if (Number.isFinite(dp) && dp >= 0) body.discountPercent = dp;
            const da = Number(discountAmount.replace(',', '.'));
            if (Number.isFinite(da) && da >= 0) body.discountAmount = da;
            const bx = Number(buyQuantity);
            if (Number.isFinite(bx) && bx >= 1) body.buyQuantity = bx;
            const gy = Number(getQuantity);
            if (Number.isFinite(gy) && gy >= 1) body.getQuantity = gy;
            const mo = Number(minOrderAmount.replace(',', '.'));
            if (Number.isFinite(mo) && mo >= 0) body.minOrderAmount = mo;

            await api.post('/campaigns', body);
            router.push('/campaigns');
        } catch {
            setError('Kampanya oluşturulamadı. Yetki ve tarihleri kontrol edin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-xl space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-foreground">Yeni Kampanya</h1>
                <Link
                    href="/campaigns"
                    className="inline-flex items-center justify-center h-8 px-3 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                    Geri
                </Link>
            </div>

            <form onSubmit={submit} className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="space-y-1.5">
                    <Label htmlFor="camp-name">Kampanya adı *</Label>
                    <Input id="camp-name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="camp-type">Tür</Label>
                    <select
                        id="camp-type"
                        className="w-full h-[34px] rounded-md border border-input bg-transparent px-2 text-[13px]"
                        value={type}
                        onChange={(e) => setType(e.target.value as (typeof CAMPAIGN_TYPES)[number]['value'])}
                    >
                        {CAMPAIGN_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                                {t.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="pct">İndirim %</Label>
                        <Input
                            id="pct"
                            inputMode="decimal"
                            value={discountPercent}
                            onChange={(e) => setDiscountPercent(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="amt">Sabit tutar (TRY)</Label>
                        <Input
                            id="amt"
                            inputMode="decimal"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(e.target.value)}
                        />
                    </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="bx">Satın al (X)</Label>
                        <Input id="bx" inputMode="numeric" value={buyQuantity} onChange={(e) => setBuyQuantity(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="gy">Öde (Y)</Label>
                        <Input id="gy" inputMode="numeric" value={getQuantity} onChange={(e) => setGetQuantity(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="mo">Minimum sepet tutarı</Label>
                    <Input id="mo" inputMode="decimal" value={minOrderAmount} onChange={(e) => setMinOrderAmount(e.target.value)} />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="sd">Başlangıç</Label>
                        <Input id="sd" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="ed">Bitiş</Label>
                        <Input id="ed" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                </div>
                <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                    Kampanyayı kaydet
                </Button>
            </form>
        </div>
    );
}

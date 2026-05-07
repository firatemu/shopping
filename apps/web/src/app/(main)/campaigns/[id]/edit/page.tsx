'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

const CAMPAIGN_TYPES = [
    { value: 'PERCENTAGE_DISCOUNT', label: 'Yüzdesel indirim' },
    { value: 'FIXED_DISCOUNT', label: 'Sabit tutar indirim' },
    { value: 'BUY_X_GET_Y', label: 'X al Y öde' },
    { value: 'SECOND_ITEM_PERCENT', label: '2. ürün indirimi' },
    { value: 'FREE_GIFT', label: 'Kategori / hediye' },
] as const;

interface Campaign {
    id: string;
    name: string;
    type: string;
    priority: number;
    isActive: boolean;
    startDate: string;
    endDate: string;
    discountPercent?: number;
    discountAmount?: number;
    buyQuantity?: number;
    getQuantity?: number;
    minOrderAmount?: number;
}

export default function CampaignEditPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [type, setType] = useState<(typeof CAMPAIGN_TYPES)[number]['value']>('PERCENTAGE_DISCOUNT');
    const [name, setName] = useState('');
    const [discountPercent, setDiscountPercent] = useState('');
    const [discountAmount, setDiscountAmount] = useState('');
    const [buyQuantity, setBuyQuantity] = useState('');
    const [getQuantity, setGetQuantity] = useState('');
    const [minOrderAmount, setMinOrderAmount] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isActive, setIsActive] = useState(true);

    const fetchCampaign = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/campaigns/${id}`);
            const data = res.data?.data ?? res.data;
            setCampaign(data);
            setName(data.name ?? '');
            setType(data.type ?? 'PERCENTAGE_DISCOUNT');
            setDiscountPercent(data.discountPercent != null ? String(data.discountPercent) : '');
            setDiscountAmount(data.discountAmount != null ? String(data.discountAmount) : '');
            setBuyQuantity(data.buyQuantity != null ? String(data.buyQuantity) : '');
            setGetQuantity(data.getQuantity != null ? String(data.getQuantity) : '');
            setMinOrderAmount(data.minOrderAmount != null ? String(data.minOrderAmount) : '');
            setStartDate(data.startDate ? String(data.startDate).split('T')[0] : '');
            setEndDate(data.endDate ? String(data.endDate).split('T')[0] : '');
            setIsActive(data.isActive ?? true);
        } catch {
            setError('Kampanya bilgileri yüklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchCampaign(); }, [fetchCampaign]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        if (!name.trim()) {
            setError('Kampanya adı zorunludur.');
            return;
        }
        setSubmitting(true);
        try {
            const body: Record<string, unknown> = {
                name: name.trim(),
                type,
                startDate,
                endDate,
                isActive,
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

            await api.put(`/campaigns/${id}`, body);
            setSuccess(true);
            setTimeout(() => router.push('/campaigns'), 1200);
        } catch {
            setError('Kampanya güncellenemedi. Yetki ve tarihleri kontrol edin.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 max-w-xl space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-xl space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-foreground">Kampanya Düzenle</h1>
                <Link href="/campaigns" className="inline-flex items-center justify-center h-8 px-3 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    Geri
                </Link>
            </div>

            {success && (
                <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium bg-green-600 text-white animate-in fade-in slide-in-from-top-2">
                    Kampanya başarıyla güncellendi.
                </div>
            )}

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
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="pct">İndirim %</Label>
                        <Input id="pct" inputMode="decimal" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="amt">Sabit tutar (TRY)</Label>
                        <Input id="amt" inputMode="decimal" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
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

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="isActive"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="w-4 h-4 rounded border-input"
                    />
                    <Label htmlFor="isActive" className="text-sm font-normal">Kampanya aktif</Label>
                </div>

                <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
                    {submitting ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
            </form>
        </div>
    );
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, formatCurrency } from '@/lib/api';

export default function NewGiftVoucherPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [amount, setAmount] = useState('');
    const [code, setCode] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        const parsed = Number(amount.replace(',', '.'));
        if (!Number.isFinite(parsed) || parsed <= 0) {
            setError('Geçerli bir tutar girin.');
            return;
        }
        setLoading(true);
        try {
            const body: Record<string, unknown> = { amount: parsed };
            if (code.trim()) body.code = code.trim();
            const res = await api.post('/gift-vouchers', body);
            const data = res.data?.data ?? res.data;
            setSuccess(true);
            setTimeout(() => router.push('/gift-vouchers'), 1200);
        } catch (err: unknown) {
            const data = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: unknown } } }).response?.data : undefined;
            const m = data?.message;
            setError(Array.isArray(m) ? m.join('; ') : typeof m === 'string' ? m : 'Hediye çeki oluşturulamadı.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-md space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-foreground">Hediye Çeki Oluştur</h1>
                <Link href="/gift-vouchers" className="inline-flex items-center justify-center h-8 px-3 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    Geri
                </Link>
            </div>

            {success && (
                <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium bg-green-600 text-white animate-in fade-in slide-in-from-top-2">
                    Hediye çeki başarıyla oluşturuldu.
                </div>
            )}

            <form onSubmit={handleSubmit} className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="space-y-1.5">
                    <Label htmlFor="code">Çek kodu (opsiyonel)</Label>
                    <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Otomatik oluşturulur" className="font-mono" />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="amount">Tutar (TRY)</Label>
                    <Input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
                    {amount && <p className="text-[11px] text-muted-foreground">{formatCurrency(Number(amount.replace(',', '.')) || 0)}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Oluşturuluyor...' : 'Çek oluştur'}
                </Button>
            </form>
        </div>
    );
}
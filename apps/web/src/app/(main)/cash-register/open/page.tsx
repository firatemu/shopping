'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

export default function CashRegisterOpenPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [openingBalance, setOpeningBalance] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const bal = Number(openingBalance.replace(',', '.'));
            await api.post('/cash-register/open', { openingBalance: Number.isFinite(bal) ? bal : 0 });
            router.push('/cash-register');
        } catch (err: unknown) {
            const data = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: unknown } } }).response?.data
                : undefined;
            const m = data?.message;
            setError(Array.isArray(m) ? m.join('; ') : typeof m === 'string' ? m : 'Kasa açılamadı.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-md space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-foreground">Kasa Aç</h1>
                <Link href="/cash-register" className="inline-flex items-center justify-center h-8 px-3 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    Geri
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="space-y-1.5">
                    <Label htmlFor="opening-balance">Açılış bakiyesi (TRY)</Label>
                    <Input
                        id="opening-balance"
                        inputMode="decimal"
                        value={openingBalance}
                        onChange={(e) => setOpeningBalance(e.target.value)}
                        placeholder="0,00"
                    />
                    <p className="text-[11px] text-muted-foreground">Günlük başlangıç nakit tutarını girin.</p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Açılıyor...' : 'Kasayı aç'}
                </Button>
            </form>
        </div>
    );
}
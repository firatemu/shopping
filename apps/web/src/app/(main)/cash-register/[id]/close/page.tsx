'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, formatCurrency } from '@/lib/api';

export default function CashRegisterClosePage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [session, setSession] = useState<{ id: string; openedAt: string; openingBalance: number; openedByName: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [physicalCount, setPhysicalCount] = useState('');

    const fetchSession = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/cash-register/current');
            const data = res.data?.data ?? res.data;
            if (data && data.id !== id) {
                setSession(data);
            } else {
                const sessions = await api.get('/cash-register/sessions', { params: { limit: 10 } });
                const list = sessions.data?.data ?? sessions.data ?? [];
                const found = Array.isArray(list) ? list.find((s: { id: string }) => s.id === id) : null;
                setSession(found ?? null);
            }
        } catch {
            setSession(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchSession(); }, [fetchSession]);

    const handleClose = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setSubmitting(true);
        try {
            const cnt = Number(physicalCount.replace(',', '.'));
            await api.post(`/cash-register/${id}/close`, { physicalCount: Number.isFinite(cnt) ? cnt : 0 });
            setSuccess(true);
            setTimeout(() => router.push('/cash-register'), 1200);
        } catch (err: unknown) {
            const data = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: unknown } } }).response?.data
                : undefined;
            const m = data?.message;
            setError(Array.isArray(m) ? m.join('; ') : typeof m === 'string' ? m : 'Kasa kapatılamadı.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-6 max-w-md space-y-4"><p className="text-sm text-muted-foreground">Yükleniyor...</p></div>;
    }

    if (!session) {
        return (
            <div className="p-6 max-w-md space-y-4">
                <h1 className="text-lg font-semibold text-foreground">Kasa Kapat</h1>
                <p className="text-sm text-muted-foreground">Aktif kasa oturumu bulunamadı.</p>
                <Link href="/cash-register"><Button variant="secondary">Kasa Yönetimi</Button></Link>
            </div>
        );
    }

    const expectedDiff = session.openingBalance;

    return (
        <div className="p-6 max-w-md space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-foreground">Kasa Kapat</h1>
                <Link href="/cash-register" className="inline-flex items-center justify-center h-8 px-3 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    Geri
                </Link>
            </div>

            {success && (
                <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium bg-green-600 text-white animate-in fade-in slide-in-from-top-2">
                    Kasa başarıyla kapatıldı.
                </div>
            )}

            <div className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Açılış</p>
                        <p className="font-mono tabular-nums font-medium">{formatCurrency(session.openingBalance)}</p>
                    </div>
                    <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Açan</p>
                        <p className="font-medium">{session.openedByName}</p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Açılış</p>
                        <p className="text-sm text-muted-foreground">{new Date(session.openedAt).toLocaleString('tr-TR')}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleClose} className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                <p className="text-sm text-muted-foreground">Kasa kapatıldığında bu tutar sistem bakiyesi ile karşılaştırılır.</p>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="space-y-1.5">
                    <Label htmlFor="physical">Fiili nakit sayımı (TRY)</Label>
                    <Input
                        id="physical"
                        inputMode="decimal"
                        value={physicalCount}
                        onChange={(e) => setPhysicalCount(e.target.value)}
                        placeholder={expectedDiff.toFixed(2)}
                    />
                </div>

                <div className="rounded-[8px] bg-muted/50 p-3 text-sm space-y-1">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Sistem bakiyesi</span>
                        <span className="font-mono tabular-nums">{formatCurrency(expectedDiff)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Fiili sayım</span>
                        <span className="font-mono tabular-nums">{physicalCount ? formatCurrency(Number(physicalCount.replace(',', '.')) || 0) : '—'}</span>
                    </div>
                    {physicalCount && (
                        <div className="flex justify-between border-t border-border pt-1 mt-1">
                            <span className="text-muted-foreground">Fark</span>
                            <span className={`font-mono tabular-nums font-medium ${Number(physicalCount.replace(',', '.')) === expectedDiff ? 'text-success' : 'text-destructive'}`}>
                                {formatCurrency((Number(physicalCount.replace(',', '.')) || 0) - expectedDiff)}
                            </span>
                        </div>
                    )}
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Kapatılıyor...' : 'Kasayı kapat'}
                </Button>
            </form>
        </div>
    );
}
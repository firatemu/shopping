'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, formatCurrency } from '@/lib/api';

const PAYMENT_TYPES = [
    { value: 'COLLECTION', label: 'Tahsilat' },
    { value: 'PAYMENT', label: 'Ödeme' },
] as const;

export default function CustomerPaymentsPage() {
    const router = useRouter();
    const params = useParams();
    const customerId = params.id as string;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [type, setType] = useState<(typeof PAYMENT_TYPES)[number]['value']>('COLLECTION');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

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
            await api.post('/customers/payments', {
                customerId,
                type,
                amount: parsed,
                note: note.trim() || undefined,
            });
            setSuccess(true);
            setAmount('');
            setNote('');
            setTimeout(() => router.push(`/customers/${customerId}`), 1200);
        } catch (err: unknown) {
            const data = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: unknown } } }).response?.data
                : undefined;
            const m = data?.message;
            setError(Array.isArray(m) ? m.join('; ') : typeof m === 'string' ? m : 'İşlem kaydedilemedi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-md space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-foreground">Cari Ödeme Kaydet</h1>
                <Link href={`/customers/${customerId}`}
                    className="inline-flex items-center justify-center h-8 px-3 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    Geri
                </Link>
            </div>

            {success && (
                <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium bg-green-600 text-white animate-in fade-in slide-in-from-top-2">
                    Ödeme başarıyla kaydedildi.
                </div>
            )}

            <form onSubmit={handleSubmit} className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="space-y-1.5">
                    <Label htmlFor="type">İşlem türü</Label>
                    <select
                        id="type"
                        className="w-full h-[34px] rounded-md border border-input bg-transparent px-2 text-[13px]"
                        value={type}
                        onChange={(e) => setType(e.target.value as (typeof PAYMENT_TYPES)[number]['value'])}
                    >
                        {PAYMENT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="amount">Tutar (TRY)</Label>
                    <Input
                        id="amount"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0,00"
                    />
                    {amount && (
                        <p className="text-[11px] text-muted-foreground">
                            {formatCurrency(Number(amount.replace(',', '.')) || 0)}
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="note">Not (opsiyonel)</Label>
                    <Input
                        id="note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Açıklama..."
                    />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
            </form>
        </div>
    );
}
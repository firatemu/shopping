'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useTabStore } from '@/stores/useTabStore';

function formatSubmitError(err: unknown): string {
    if (!err || typeof err !== 'object' || !('response' in err)) {
        return 'Kayıt oluşturulamadı';
    }
    const data = (err as { response?: { data?: Record<string, unknown> } }).response?.data;
    if (!data) return 'Kayıt oluşturulamadı';
    const msg = data.message;
    const base =
        typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.join(', ') : 'Kayıt oluşturulamadı';
    const dev = data.devDetails;
    if (dev && typeof dev === 'object' && 'prismaCode' in dev) {
        const code = (dev as { prismaCode?: string }).prismaCode;
        return code ? `${base} (${code})` : base;
    }
    return base;
}

const KINDS = [
    {
        value: 'CHECKING',
        label: 'Vadesiz banka hesabı',
        hint: 'Gelen ve giden havale / EFT işlemleri bu hesaplar üzerinden kaydedilir.',
    },
    {
        value: 'POS_SETTLEMENT',
        label: 'POS mutabakat hesabı',
        hint: 'POS cihazından yapılan kredi kartı tahsilatlarında kullanılır; başka işlem türlerinde seçilmez.',
    },
    {
        value: 'CREDIT_CARD',
        label: 'Firma kredi kartı',
        hint: 'Şirket kredi kartıyla yapılan ödemelerde kullanılır; tahsilatta veya havalede seçilmez.',
    },
] as const;

export default function NewBankAccountPage() {
    const router = useRouter();
    const addTab = useTabStore((s) => s.addTab);
    const [name, setName] = useState('');
    const [bankName, setBankName] = useState('');
    const [iban, setIban] = useState('');
    const [kind, setKind] = useState('CHECKING');
    const [opening, setOpening] = useState('0');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            await api.post('/bank-accounts', {
                name: name.trim(),
                bankName: bankName.trim(),
                iban: iban.trim() || undefined,
                kind,
                openingBalance: parseFloat(opening.replace(',', '.')) || 0,
            });
            addTab({ title: 'Banka hesapları', path: '/finance/bank-accounts', closable: true });
            router.push('/finance/bank-accounts');
        } catch (err: unknown) {
            setError(formatSubmitError(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-lg">
            <h1 className="text-lg font-semibold text-foreground mb-4">Yeni banka hesabı</h1>
            <form onSubmit={(e) => void submit(e)} className="space-y-4">
                <div className="space-y-1.5">
                    <Label>Hesap adı</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required className="h-9" />
                </div>
                <div className="space-y-1.5">
                    <Label>Banka adı</Label>
                    <Input value={bankName} onChange={(e) => setBankName(e.target.value)} required className="h-9" />
                </div>
                <div className="space-y-1.5">
                    <Label>IBAN (isteğe bağlı)</Label>
                    <Input value={iban} onChange={(e) => setIban(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                    <Label>Hesap türü</Label>
                    <select
                        className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-[13px]"
                        value={kind}
                        onChange={(e) => setKind(e.target.value)}
                    >
                        {KINDS.map((k) => (
                            <option key={k.value} value={k.value}>{k.label}</option>
                        ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {KINDS.find((k) => k.value === kind)?.hint}
                    </p>
                </div>
                <div className="space-y-1.5">
                    <Label>Başlangıç bakiyesi (TRY)</Label>
                    <Input value={opening} onChange={(e) => setOpening(e.target.value)} className="h-9" inputMode="decimal" />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={saving} className="h-9">{saving ? 'Kaydediliyor…' : 'Kaydet'}</Button>
                    <Button type="button" variant="outline" className="h-9" onClick={() => router.back()}>İptal</Button>
                </div>
            </form>
        </div>
    );
}

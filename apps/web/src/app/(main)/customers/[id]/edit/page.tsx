'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useTabStore } from '@/stores/useTabStore';

type CustomerType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH';

interface CustomerData {
    code: string;
    type: CustomerType;
    name: string;
    surname?: string | null;
    companyName?: string | null;
    phone?: string | null;
    email?: string | null;
    taxId?: string | null;
    taxOffice?: string | null;
    country?: string | null;
    city?: string | null;
    district?: string | null;
    neighborhood?: string | null;
    postalCode?: string | null;
    address?: string | null;
    creditLimit?: string | number | null;
    defaultDueDays?: number | null;
    openingBalance?: string | number | null;
    iban?: string | null;
    bankName?: string | null;
    paymentNotes?: string | null;
    notes?: string | null;
}

export default function EditCustomerPage() {
    const params = useParams();
    const router = useRouter();
    const id = typeof params?.id === 'string' ? params.id : '';
    const addTab = useTabStore((s) => s.addTab);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [customerName, setCustomerName] = useState('');

    const [form, setForm] = useState({
        code: '',
        type: 'CUSTOMER' as CustomerType,
        name: '',
        surname: '',
        companyName: '',
        phone: '',
        email: '',
        taxId: '',
        taxOffice: '',
        country: 'Türkiye',
        city: '',
        district: '',
        neighborhood: '',
        postalCode: '',
        address: '',
        creditLimit: '',
        defaultDueDays: '',
        openingBalance: '',
        iban: '',
        bankName: '',
        paymentNotes: '',
        notes: '',
    });

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        api.get(`/customers/${id}`)
            .then((res) => {
                const c: CustomerData = res.data;
                setCustomerName(`${c.name} ${c.surname || ''}`.trim());
                setForm({
                    code: c.code || '',
                    type: c.type || 'CUSTOMER',
                    name: c.name || '',
                    surname: c.surname || '',
                    companyName: c.companyName || '',
                    phone: c.phone || '',
                    email: c.email || '',
                    taxId: c.taxId || '',
                    taxOffice: c.taxOffice || '',
                    country: c.country || 'Türkiye',
                    city: c.city || '',
                    district: c.district || '',
                    neighborhood: c.neighborhood || '',
                    postalCode: c.postalCode || '',
                    address: c.address || '',
                    creditLimit: c.creditLimit?.toString() || '',
                    defaultDueDays: c.defaultDueDays?.toString() || '',
                    openingBalance: c.openingBalance?.toString() || '',
                    iban: c.iban || '',
                    bankName: c.bankName || '',
                    paymentNotes: c.paymentNotes || '',
                    notes: c.notes || '',
                });
            })
            .catch(() => {
                setError('Müşteri bilgileri yüklenemedi.');
            })
            .finally(() => setLoading(false));
    }, [id]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!form.name.trim()) {
            setError('Ad zorunludur.');
            return;
        }
        setSaving(true);
        try {
            const body: Record<string, unknown> = {
                code: form.code.trim() || undefined,
                type: form.type,
                name: form.name.trim(),
                surname: form.surname.trim() || undefined,
                phone: form.phone.trim() || undefined,
                email: form.email.trim() || undefined,
                companyName: form.companyName.trim() || undefined,
                taxId: form.taxId.trim() || undefined,
                taxOffice: form.taxOffice.trim() || undefined,
                country: form.country.trim() || 'Türkiye',
                city: form.city.trim() || undefined,
                district: form.district.trim() || undefined,
                neighborhood: form.neighborhood.trim() || undefined,
                postalCode: form.postalCode.trim() || undefined,
                address: form.address.trim() || undefined,
                iban: form.iban.trim() || undefined,
                bankName: form.bankName.trim() || undefined,
                paymentNotes: form.paymentNotes.trim() || undefined,
                notes: form.notes.trim() || undefined,
            };
            const cl = Number(form.creditLimit.replace(',', '.'));
            if (Number.isFinite(cl) && cl >= 0) body.creditLimit = cl;
            const dd = Number(form.defaultDueDays);
            if (Number.isFinite(dd) && dd >= 0) body.defaultDueDays = dd;
            const ob = Number(form.openingBalance.replace(',', '.'));
            if (Number.isFinite(ob)) body.openingBalance = ob;

            await api.patch(`/customers/${id}`, body);

            // Remove this tab and go to customer detail
            addTab({ title: customerName, path: `/customers/${id}`, closable: true });
            router.push(`/customers/${id}`);
        } catch {
            setError('Kayıt güncellenemedi.');
        } finally {
            setSaving(false);
        }
    };

    if (!id) {
        return (
            <div className="p-6">
                <p className="text-sm text-muted-foreground">Geçersiz müşteri.</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-xl space-y-4">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <h1 className="text-lg font-semibold text-foreground">Cari Düzenle</h1>
                    {customerName && <p className="text-xs text-muted-foreground">{customerName}</p>}
                </div>
                <Link
                    href={`/customers/${id}`}
                    className="inline-flex items-center justify-center h-8 px-3 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                    Geri
                </Link>
            </div>

            {loading ? (
                <div className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
            ) : (
                <form onSubmit={submit} className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Cari bilgileri</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="code">Cari kodu</Label>
                            <Input id="code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} className="font-mono" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="type">Cari tipi</Label>
                            <select
                                id="type"
                                className="w-full h-[34px] rounded-md border border-input bg-transparent px-2 text-[13px]"
                                value={form.type}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        type: e.target.value as CustomerType,
                                    }))
                                }
                            >
                                <option value="CUSTOMER">Müşteri</option>
                                <option value="SUPPLIER">Tedarikçi</option>
                                <option value="BOTH">Müşteri + Tedarikçi</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="name">Ad *</Label>
                            <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="surname">Soyad</Label>
                            <Input id="surname" value={form.surname} onChange={(e) => setForm((f) => ({ ...f, surname: e.target.value }))} />
                        </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="phone">Telefon</Label>
                            <Input id="phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="email">E-posta</Label>
                            <Input id="email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="company">Firma adı / Ünvan</Label>
                        <Input id="company" value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
                    </div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground pt-2 border-t border-border">Vergi bilgileri</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="tax">VKN / TCKN</Label>
                            <Input id="tax" value={form.taxId} onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="taxOffice">Vergi dairesi</Label>
                            <Input id="taxOffice" value={form.taxOffice} onChange={(e) => setForm((f) => ({ ...f, taxOffice: e.target.value }))} />
                        </div>
                    </div>

                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground pt-2 border-t border-border">Adres</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="country">Ülke</Label>
                            <Input id="country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="postal">Posta kodu</Label>
                            <Input id="postal" value={form.postalCode} onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))} className="font-mono" />
                        </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="city">İl</Label>
                            <Input id="city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="district">İlçe</Label>
                            <Input id="district" value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="neighborhood">Mahalle</Label>
                        <Input id="neighborhood" value={form.neighborhood} onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="address">Adres</Label>
                        <Input id="address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                    </div>

                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground pt-2 border-t border-border">Finans</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="limit">Kredi limiti</Label>
                            <Input id="limit" inputMode="decimal" placeholder="0" value={form.creditLimit} onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="due">Varsayılan vade (gün)</Label>
                            <Input id="due" type="number" min={0} placeholder="0" value={form.defaultDueDays} onChange={(e) => setForm((f) => ({ ...f, defaultDueDays: e.target.value }))} />
                        </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="opening">Açılış bakiyesi</Label>
                            <Input id="opening" inputMode="decimal" placeholder="0" value={form.openingBalance} onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))} className="font-mono" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="iban">IBAN</Label>
                            <Input id="iban" value={form.iban} onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))} className="font-mono" />
                        </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="bank">Banka</Label>
                            <Input id="bank" value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="payNotes">Ödeme notları</Label>
                            <Input id="payNotes" value={form.paymentNotes} onChange={(e) => setForm((f) => ({ ...f, paymentNotes: e.target.value }))} />
                        </div>
                    </div>

                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground pt-2 border-t border-border">Notlar</p>
                    <div className="space-y-1.5">
                        <Label htmlFor="notes">Not</Label>
                        <Input id="notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <Button type="submit" className="w-full sm:w-auto" disabled={saving || loading}>
                        {saving ? 'Kaydediliyor…' : 'Kaydet'}
                    </Button>
                </form>
            )}
        </div>
    );
}
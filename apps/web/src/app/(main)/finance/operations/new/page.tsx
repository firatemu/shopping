'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    AlertTriangle,
    Building2,
    CheckCircle2,
    FileText,
    Landmark,
    Loader2,
    Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { api, formatCurrency } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTabStore } from '@/stores/useTabStore';

const KIND_GROUPS: { heading: string; options: { value: string; label: string }[] }[] = [
    {
        heading: 'Tahsilat',
        options: [
            { value: 'CASH_COLLECTION', label: 'Nakit tahsilat' },
            { value: 'CARD_COLLECTION', label: 'Kredi kartı tahsilatı (POS mutabakat hesabı)' },
            { value: 'TRANSFER_IN', label: 'Gelen havale / EFT' },
            { value: 'CHECK_RECEIVED', label: 'Alınan çek' },
            { value: 'PROMISSORY_RECEIVED', label: 'Alınan senet' },
        ],
    },
    {
        heading: 'Ödeme',
        options: [
            { value: 'CASH_PAYMENT', label: 'Nakit ödeme' },
            { value: 'CARD_PAYMENT', label: 'Firma kredi kartı ödemesi' },
            { value: 'TRANSFER_OUT', label: 'Giden havale / EFT' },
            { value: 'CHECK_ISSUED', label: 'Verilen çek' },
            { value: 'PROMISSORY_ISSUED', label: 'Verilen senet' },
        ],
    },
    {
        heading: 'Dekont (kasa / banka dışı)',
        options: [
            { value: 'DEBIT_VOUCHER', label: 'Borç dekontu' },
            { value: 'CREDIT_VOUCHER', label: 'Alacak dekontu' },
        ],
    },
];

const KIND_LABEL = new Map(KIND_GROUPS.flatMap((g) => g.options).map((o) => [o.value, o.label]));

function operationCategory(kind: string): 'collection' | 'payment' | 'voucher' {
    if (
        [
            'CASH_COLLECTION',
            'CARD_COLLECTION',
            'TRANSFER_IN',
            'CHECK_RECEIVED',
            'PROMISSORY_RECEIVED',
        ].includes(kind)
    ) {
        return 'collection';
    }
    if (
        [
            'CASH_PAYMENT',
            'CARD_PAYMENT',
            'TRANSFER_OUT',
            'CHECK_ISSUED',
            'PROMISSORY_ISSUED',
        ].includes(kind)
    ) {
        return 'payment';
    }
    return 'voucher';
}

interface CustomerOpt {
    id: string;
    code: string;
    name: string;
    surname?: string;
    companyName?: string;
    currentBalance?: string | number;
}

interface BankOpt {
    id: string;
    name: string;
    bankName: string;
}

function customerDisplayName(c: CustomerOpt) {
    return c.companyName ?? `${c.name} ${c.surname ?? ''}`.trim();
}

function customerDisplayLine(c: CustomerOpt) {
    return (
        <>
            <span className="font-mono text-xs text-muted-foreground">{c.code}</span>{' '}
            {customerDisplayName(c)}
        </>
    );
}

function bankDisplayLine(b: BankOpt) {
    return (
        <>
            {b.name}{' '}
            <span className="text-muted-foreground">({b.bankName})</span>
        </>
    );
}

export default function NewFinanceOperationPage() {
    const router = useRouter();
    const addTab = useTabStore((s) => s.addTab);
    const [kind, setKind] = useState('CASH_COLLECTION');
    const [customerId, setCustomerId] = useState('');
    const [customers, setCustomers] = useState<CustomerOpt[]>([]);
    const [banks, setBanks] = useState<BankOpt[]>([]);
    const [cashSessionId, setCashSessionId] = useState<string | null>(null);
    const [bankAccountId, setBankAccountId] = useState('');
    const [amount, setAmount] = useState('');
    const [operationDate, setOperationDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [reference, setReference] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [bankLoadError, setBankLoadError] = useState<string | null>(null);
    const [refsLoading, setRefsLoading] = useState(true);

    const needsCash = kind === 'CASH_COLLECTION' || kind === 'CASH_PAYMENT';
    const needsBankChannel =
        kind === 'TRANSFER_IN' ||
        kind === 'TRANSFER_OUT' ||
        kind === 'CARD_COLLECTION' ||
        kind === 'CARD_PAYMENT';
    const isInstrumentKind = [
        'CHECK_RECEIVED',
        'CHECK_ISSUED',
        'PROMISSORY_RECEIVED',
        'PROMISSORY_ISSUED',
    ].includes(kind);

    const bankPurpose = useMemo(() => {
        if (kind === 'TRANSFER_IN' || kind === 'TRANSFER_OUT') return 'bank_transfer' as const;
        if (kind === 'CARD_COLLECTION') return 'card_collection' as const;
        if (kind === 'CARD_PAYMENT') return 'card_payment' as const;
        return null;
    }, [kind]);

    const selectedCustomer = useMemo(
        () => customers.find((c) => c.id === customerId),
        [customers, customerId],
    );

    const parsedAmount = useMemo(() => {
        const n = parseFloat(String(amount).replace(',', '.'));
        return Number.isFinite(n) ? n : null;
    }, [amount]);

    const category = operationCategory(kind);

    const loadRefs = useCallback(async () => {
        setRefsLoading(true);
        setBankLoadError(null);

        try {
            const cRes = await api.get('/customers', { params: { limit: 100 } });
            setCustomers(cRes.data?.data ?? []);
        } catch {
            setCustomers([]);
        }

        try {
            if (bankPurpose) {
                const bRes = await api.get('/bank-accounts', {
                    params: { limit: 100, purpose: bankPurpose },
                });
                setBanks(bRes.data?.data ?? []);
                setBankLoadError(null);
            } else {
                setBanks([]);
                setBankLoadError(null);
            }
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data
                          ?.message
                    : undefined;
            const text =
                typeof msg === 'string'
                    ? msg
                    : Array.isArray(msg)
                      ? msg.join(', ')
                      : 'Banka hesapları yüklenemedi.';
            setBanks([]);
            setBankLoadError(text);
        }

        if (needsCash) {
            try {
                const s = await api.get('/cash-register/current');
                setCashSessionId(s.data?.id ?? null);
            } catch {
                setCashSessionId(null);
            }
        } else {
            setCashSessionId(null);
        }
        setRefsLoading(false);
    }, [needsCash, bankPurpose]);

    useEffect(() => {
        void loadRefs();
    }, [loadRefs]);

    useEffect(() => {
        setBankAccountId('');
    }, [bankPurpose]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!customerId.trim()) {
            setError('Lütfen cari hesap seçin.');
            return;
        }
        const parsed = parseFloat(String(amount).replace(',', '.'));
        if (!Number.isFinite(parsed) || parsed <= 0) {
            setError('Geçerli bir tutar girin (örn. 1250 veya 1250,50).');
            return;
        }
        if (needsBankChannel && !bankAccountId.trim()) {
            if (kind === 'CARD_COLLECTION') {
                setError('Kredi kartı tahsilatı için POS mutabakat hesabı seçin.');
            } else if (kind === 'CARD_PAYMENT') {
                setError('Firma kredi kartı ödemesi için firma kredi kartı hesabı seçin.');
            } else {
                setError('Havale / EFT için vadesiz banka hesabı seçin.');
            }
            return;
        }

        setSaving(true);
        try {
            let sessionId: string | undefined;
            if (needsCash) {
                if (!cashSessionId) {
                    setError('Açık kasa oturumu yok. Önce kasa sayfasından oturum açın.');
                    setSaving(false);
                    return;
                }
                sessionId = cashSessionId;
            }

            const meta: Record<string, string> = {};
            if (dueDate && isInstrumentKind) {
                meta.dueDate = dueDate;
            }
            if (reference.trim()) meta.reference = reference.trim();

            await api.post('/partner-finance/operations', {
                kind,
                customerId,
                amount: parsed,
                operationDate,
                description: description.trim() || undefined,
                cashRegisterSessionId: sessionId,
                bankAccountId: needsBankChannel && bankAccountId ? bankAccountId : undefined,
                metadata: Object.keys(meta).length ? meta : undefined,
            });
            addTab({ title: 'Ödeme & tahsilat', path: '/finance/operations', closable: true });
            router.push('/finance/operations');
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: string | string[] } } }).response
                          ?.data?.message
                    : undefined;
            setError(
                typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.join(', ') : 'Kayıt oluşturulamadı',
            );
        } finally {
            setSaving(false);
        }
    };

    const categoryBadge =
        category === 'collection' ? (
            <Badge variant="secondary">Tahsilat</Badge>
        ) : category === 'payment' ? (
            <Badge variant="outline">Ödeme</Badge>
        ) : (
            <Badge variant="outline">Dekont</Badge>
        );

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-muted/25">
            <header className="border-b border-border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:py-8">
                    <div className="flex gap-4">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="mt-0.5 shrink-0 rounded-lg border border-border bg-background shadow-sm hover:bg-muted"
                            onClick={() => router.back()}
                            aria-label="Geri"
                        >
                            <ArrowLeft className="size-4" />
                        </Button>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Finans
                            </p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                                Yeni işlem kaydı
                            </h1>
                            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                                Cari hesaba tahsilat, ödeme veya dekont girişi. Hareket defteri ve kasa
                                bağlantıları kayıt sırasında doğrulanır.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:pt-1">
                        {categoryBadge}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => router.push('/finance/operations')}
                        >
                            İşlem listesine dön
                        </Button>
                    </div>
                </div>
            </header>

            <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:py-10">
                <aside className="space-y-4 lg:col-span-4">
                    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Building2 className="size-4 text-muted-foreground" />
                            Bağlam özeti
                        </h2>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                            Seçimlerinize göre otomatik güncellenir. Kayıt öncesi zorunlu alanlar
                            kontrol edilir.
                        </p>
                        <Separator className="my-4" />

                        {refsLoading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-16 w-full rounded-lg" />
                                <Skeleton className="h-12 w-full rounded-lg" />
                            </div>
                        ) : (
                            <>
                                <div className="rounded-lg border border-border/80 bg-muted/30 p-3">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                        Cari hesap
                                    </p>
                                    {selectedCustomer ? (
                                        <>
                                            <p className="mt-1.5 text-sm font-medium text-foreground">
                                                {selectedCustomer.code}{' '}
                                                <span className="font-normal text-muted-foreground">
                                                    — {customerDisplayName(selectedCustomer)}
                                                </span>
                                            </p>
                                            <p className="mt-2 text-xs text-muted-foreground">
                                                Güncel bakiye
                                            </p>
                                            <p className="text-lg font-semibold tabular-nums tracking-tight text-foreground">
                                                {formatCurrency(selectedCustomer.currentBalance ?? 0)}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Henüz cari seçilmedi. Formdan seçim yapın.
                                        </p>
                                    )}
                                </div>

                                {needsCash && (
                                    <div
                                        className={cn(
                                            'mt-3 flex gap-3 rounded-lg border p-3',
                                            cashSessionId
                                                ? 'border-emerald-500/30 bg-emerald-500/5'
                                                : 'border-amber-500/40 bg-amber-500/10',
                                        )}
                                    >
                                        {cashSessionId ? (
                                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                        ) : (
                                            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                                        )}
                                        <div>
                                            <p className="text-xs font-medium text-foreground">
                                                Kasa oturumu
                                            </p>
                                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                                {cashSessionId
                                                    ? `Açık oturum bu işleme bağlanacak (${cashSessionId.slice(0, 8)}…).`
                                                    : 'Açık kasa oturumu yok. Kasa modülünden oturum açmadan nakit işlemi kaydedilemez.'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {needsBankChannel && (
                                    <div className="mt-3 flex gap-3 rounded-lg border border-border bg-background p-3">
                                        <Landmark className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-foreground">
                                                Banka / POS / firma kartı
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {kind === 'CARD_COLLECTION'
                                                    ? 'Kart tahsilatı yalnızca tanımlı POS mutabakat hesabına kaydedilir.'
                                                    : kind === 'CARD_PAYMENT'
                                                      ? 'Ödeme yalnızca firma kredi kartı hesabına kaydedilir.'
                                                      : 'Havale ve EFT yalnızca vadesiz banka hesapları üzerinden kaydedilir.'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
                        <p className="font-medium text-foreground">Kısa rehber</p>
                        <ul className="mt-2 list-inside list-disc space-y-1.5">
                            <li>Tutar ve tarih muhasebe dökümünde aynen görünür.</li>
                            <li>
                                Kart tahsilatında yalnızca POS mutabakat hesabı; havalede yalnızca vadesiz
                                banka; firma kartı ödemesinde yalnızca firma kredi kartı hesabı kullanılır.
                            </li>
                            <li>Çek ve senet için vade ile referans alanlarını doldurun.</li>
                            <li>Dekontlar kasa veya banka bakiyesini değiştirmez; cari bakiyeyi düzenler.</li>
                        </ul>
                    </div>
                </aside>

                <main className="lg:col-span-8">
                    <form
                        onSubmit={(e) => void submit(e)}
                        className="rounded-xl border border-border bg-card shadow-sm"
                    >
                        <div className="border-b border-border px-5 py-4 sm:px-6">
                            <h2 className="text-sm font-semibold text-foreground">İşlem formu</h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Zorunlu alanlar kayıt öncesi doğrulanır.
                            </p>
                        </div>

                        <div className="space-y-8 px-5 py-6 sm:px-6">
                            {error && (
                                <div
                                    role="alert"
                                    className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-destructive"
                                >
                                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    <FileText className="size-3.5" />
                                    Tür ve cari
                                </div>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="op-kind" className="text-xs font-medium">
                                            İşlem türü
                                        </Label>
                                        <Select value={kind} onValueChange={(v) => v && setKind(v)}>
                                            <SelectTrigger
                                                id="op-kind"
                                                size="default"
                                                className="h-10 w-full text-left"
                                            >
                                                <SelectValue placeholder="İşlem türü seçin…">
                                                    {(v) =>
                                                        v
                                                            ? (KIND_LABEL.get(String(v)) ?? String(v))
                                                            : null}
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {KIND_GROUPS.map((g) => (
                                                    <SelectGroup key={g.heading}>
                                                        <SelectLabel>{g.heading}</SelectLabel>
                                                        {g.options.map((o) => (
                                                            <SelectItem key={o.value} value={o.value}>
                                                                {o.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[11px] text-muted-foreground">
                                            Seçilen: {KIND_LABEL.get(kind) ?? kind}
                                        </p>
                                    </div>

                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="op-customer" className="text-xs font-medium">
                                            Cari hesap
                                        </Label>
                                        <Select
                                            value={customerId || null}
                                            onValueChange={(v) => setCustomerId(v ?? '')}
                                            required
                                        >
                                            <SelectTrigger
                                                id="op-customer"
                                                className="h-10 w-full text-left"
                                            >
                                                <SelectValue placeholder="Cari seçin…">
                                                    {(v) => {
                                                        if (!v) return null;
                                                        const c = customers.find((x) => x.id === String(v));
                                                        return c ? customerDisplayLine(c) : String(v);
                                                    }}
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent className="max-h-72">
                                                {customers.map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        {customerDisplayLine(c)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </section>

                            <Separator />

                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    <Wallet className="size-3.5" />
                                    Kanal ve tutar
                                </div>

                                {needsBankChannel && (
                                    <div className="space-y-2">
                                        <Label htmlFor="op-bank" className="text-xs font-medium">
                                            {kind === 'CARD_COLLECTION'
                                                ? 'POS mutabakat hesabı'
                                                : kind === 'CARD_PAYMENT'
                                                  ? 'Firma kredi kartı hesabı'
                                                  : 'Vadesiz banka hesabı (havale / EFT)'}
                                        </Label>
                                        <Select
                                            value={bankAccountId || null}
                                            onValueChange={(v) => setBankAccountId(v ?? '')}
                                            required
                                        >
                                            <SelectTrigger id="op-bank" className="h-10 w-full text-left">
                                                <SelectValue placeholder="Hesap seçin…">
                                                    {(v) => {
                                                        if (!v) return null;
                                                        const b = banks.find((x) => x.id === String(v));
                                                        return b ? bankDisplayLine(b) : String(v);
                                                    }}
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {banks.map((b) => (
                                                    <SelectItem key={b.id} value={b.id}>
                                                        {bankDisplayLine(b)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {bankLoadError && (
                                            <p
                                                role="alert"
                                                className="text-[11px] text-destructive"
                                            >
                                                {bankLoadError} Veritabanı güncel değilse yönetici:
                                                <code className="mx-1 rounded bg-muted px-1 py-px text-[10px]">
                                                    npx prisma migrate deploy
                                                </code>
                                                (API klasöründen).
                                            </p>
                                        )}
                                        {!bankLoadError && banks.length === 0 && (
                                            <p className="text-[11px] text-amber-700 dark:text-amber-500">
                                                Bu kanal için henüz hesap tanımlanmamış. Banka hesapları
                                                sayfasından ekleyin.
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="op-amount" className="text-xs font-medium">
                                            Tutar (TRY)
                                        </Label>
                                        <Input
                                            id="op-amount"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            required
                                            className="h-10 font-medium tabular-nums"
                                            inputMode="decimal"
                                            placeholder="0,00"
                                        />
                                        {parsedAmount != null && parsedAmount > 0 && (
                                            <p className="text-[11px] text-muted-foreground">
                                                Önizleme:{' '}
                                                <span className="font-medium text-foreground">
                                                    {formatCurrency(parsedAmount)}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="op-date" className="text-xs font-medium">
                                            İşlem tarihi
                                        </Label>
                                        <Input
                                            id="op-date"
                                            type="date"
                                            value={operationDate}
                                            onChange={(e) => setOperationDate(e.target.value)}
                                            required
                                            className="h-10"
                                        />
                                    </div>
                                </div>
                            </section>

                            {isInstrumentKind && (
                                <>
                                    <Separator />
                                    <section className="space-y-4">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Çek / senet bilgisi
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="op-due" className="text-xs font-medium">
                                                    Vade tarihi
                                                </Label>
                                                <Input
                                                    id="op-due"
                                                    type="date"
                                                    value={dueDate}
                                                    onChange={(e) => setDueDate(e.target.value)}
                                                    className="h-10"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="op-ref" className="text-xs font-medium">
                                                    Çek / senet no veya referans
                                                </Label>
                                                <Input
                                                    id="op-ref"
                                                    value={reference}
                                                    onChange={(e) => setReference(e.target.value)}
                                                    className="h-10"
                                                    placeholder="Örn. bordro no"
                                                />
                                            </div>
                                        </div>
                                    </section>
                                </>
                            )}

                            <Separator />

                            <section className="space-y-2">
                                <Label htmlFor="op-desc" className="text-xs font-medium">
                                    Açıklama (isteğe bağlı)
                                </Label>
                                <textarea
                                    id="op-desc"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className={cn(
                                        'flex w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
                                    )}
                                    placeholder="İşlemle ilgili notlar…"
                                />
                            </section>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-border bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-10 sm:min-w-[100px]"
                                onClick={() => router.back()}
                            >
                                İptal
                            </Button>
                            <Button
                                type="submit"
                                className="h-10 sm:min-w-[140px]"
                                disabled={
                                    saving ||
                                    refsLoading ||
                                    (needsCash && !cashSessionId) ||
                                    (needsBankChannel && banks.length === 0)
                                }
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 size-4 animate-spin" />
                                        Kaydediliyor…
                                    </>
                                ) : (
                                    'Kaydı oluştur'
                                )}
                            </Button>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
}

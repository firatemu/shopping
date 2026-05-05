'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { api, formatCurrency, formatDate } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type CustomerType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH';

interface CustomerDetail {
    id: string;
    code: string;
    type: CustomerType;
    name: string;
    surname?: string | null;
    companyName?: string | null;
    phone?: string | null;
    email?: string | null;
    taxId?: string | null;
    taxOffice?: string | null;
    defaultDueDays?: number | null;
    openingBalance?: string | number;
    currentBalance: string | number;
    creditLimit: string | number;
    isActive: boolean;
    createdAt: string;
}

type Summary = {
    currentBalance: string | number;
    creditLimit: string | number;
    debitTotal: string | number;
    creditTotal: string | number;
};

type StatementRow = {
    id: string;
    createdAt: string;
    type: string;
    description?: string | null;
    reference?: string | null;
    documentType?: string | null;
    documentNo?: string | null;
    debit: string | number;
    credit: string | number;
    balanceAfter: string | number;
};

export default function CustomerDetailPage() {
    const params = useParams();
    const id = typeof params?.id === 'string' ? params.id : '';
    const [cust, setCust] = useState<CustomerDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'general' | 'statement'>('general');

    const [summary, setSummary] = useState<Summary | null>(null);
    const [statement, setStatement] = useState<{ data: StatementRow[]; summary?: any } | null>(null);
    const [statementLoading, setStatementLoading] = useState(false);

    const [payOpen, setPayOpen] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState<'PAYMENT_CASH' | 'PAYMENT_CARD' | 'PAYMENT_TRANSFER' | 'PAYMENT_CHECK'>('PAYMENT_CASH');
    const [payRef, setPayRef] = useState('');
    const [payDesc, setPayDesc] = useState('');
    const [paySaving, setPaySaving] = useState(false);
    const [payError, setPayError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        Promise.all([
            api.get(`/customers/${id}`),
            api.get(`/customers/${id}/summary`),
        ])
            .then(([c, s]) => {
                setCust(c.data);
                setSummary(s.data);
            })
            .catch(() => {
                setCust(null);
                setSummary(null);
            })
            .finally(() => setLoading(false));
    }, [id]);

    const loadStatement = async () => {
        if (!id) return;
        setStatementLoading(true);
        try {
            const res = await api.get(`/customers/${id}/statement`, { params: { page: 1, limit: 100 } });
            setStatement(res.data);
        } catch {
            setStatement({ data: [] });
        } finally {
            setStatementLoading(false);
        }
    };

    useEffect(() => {
        if (tab !== 'statement') return;
        void loadStatement();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, id]);

    const title = useMemo(() => {
        if (!cust) return 'Cari';
        const n = [cust.name, cust.surname].filter(Boolean).join(' ').trim();
        return cust.companyName ? `${cust.companyName} — ${n}` : n;
    }, [cust]);

    if (!id)
        return (
            <div className="p-6">
                <p className="text-sm text-muted-foreground">Geçersiz müşteri.</p>
            </div>
        );

    return (
        <div className="p-6 max-w-5xl space-y-4">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <h1 className="text-lg font-semibold text-foreground">Cari kartı</h1>
                    {cust?.code ? <p className="text-xs font-mono text-muted-foreground">{cust.code}</p> : null}
                </div>
                <Link
                    href="/customers"
                    className="inline-flex items-center justify-center h-8 px-3 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                    Listeye
                </Link>
            </div>

            <div className="rounded-[10px] border border-border bg-card p-4 space-y-4">
                {loading ? (
                    <Skeleton className="h-28 w-full" />
                ) : !cust ? (
                    <p className="text-sm text-muted-foreground">Müşteri bulunamadı.</p>
                ) : (
                    <>
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-lg font-medium text-foreground">
                                    {title}
                                </p>
                                {cust.companyName && (
                                    <p className="text-sm text-muted-foreground">
                                        {[cust.name, cust.surname].filter(Boolean).join(' ')}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] font-normal">
                                    {cust.type === 'CUSTOMER' ? 'Müşteri' : cust.type === 'SUPPLIER' ? 'Tedarikçi' : 'Her ikisi'}
                                </Badge>
                                <Badge variant={cust.isActive ? 'default' : 'secondary'} className="text-[10px]">
                                    {cust.isActive ? 'Aktif' : 'Pasif'}
                                </Badge>
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-4">
                            <div className="rounded-md border border-border p-3 bg-muted/20">
                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Bakiye</p>
                                <p className="font-mono tabular-nums text-base">{formatCurrency(cust.currentBalance)}</p>
                                <p className="text-[11px] text-muted-foreground mt-1">Borç (+) / Alacak (-)</p>
                            </div>
                            <div className="rounded-md border border-border p-3 bg-muted/20">
                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Limit</p>
                                <p className="font-mono tabular-nums text-base">{formatCurrency(cust.creditLimit)}</p>
                                <p className="text-[11px] text-muted-foreground mt-1">Vade: {cust.defaultDueDays ?? 0} gün</p>
                            </div>
                            <div className="rounded-md border border-border p-3 bg-muted/20">
                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Dönem borç</p>
                                <p className="font-mono tabular-nums text-base">{formatCurrency(summary?.debitTotal ?? 0)}</p>
                                <p className="text-[11px] text-muted-foreground mt-1">Ekstre toplamı</p>
                            </div>
                            <div className="rounded-md border border-border p-3 bg-muted/20">
                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Dönem alacak</p>
                                <p className="font-mono tabular-nums text-base">{formatCurrency(summary?.creditTotal ?? 0)}</p>
                                <p className="text-[11px] text-muted-foreground mt-1">Ekstre toplamı</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex gap-1">
                                <Button type="button" size="sm" variant={tab === 'general' ? 'default' : 'outline'} className="h-8" onClick={() => setTab('general')}>
                                    Genel
                                </Button>
                                <Button type="button" size="sm" variant={tab === 'statement' ? 'default' : 'outline'} className="h-8" onClick={() => setTab('statement')}>
                                    Hareketler (Ekstre)
                                </Button>
                            </div>
                            <Button type="button" size="sm" className="h-8" onClick={() => { setPayOpen(true); setPayError(null); }}>
                                Tahsilat
                            </Button>
                        </div>

                        {tab === 'general' && (
                            <div className="grid gap-2 text-[13px] pt-2 border-t border-border">
                                <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Telefon</span>
                                    <span>{cust.phone ?? '—'}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">E-posta</span>
                                    <span>{cust.email ?? '—'}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">VKN</span>
                                    <span className="font-mono tabular-nums">{cust.taxId ?? '—'}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Vergi dairesi</span>
                                    <span>{cust.taxOffice ?? '—'}</span>
                                </div>
                                <div className="flex justify-between gap-4 pt-2 border-t border-border">
                                    <span className="text-muted-foreground">Kayıt tarihi</span>
                                    <span>{formatDate(cust.createdAt)}</span>
                                </div>
                            </div>
                        )}

                        {tab === 'statement' && (
                            <div className="pt-2 border-t border-border space-y-2">
                                {statementLoading ? (
                                    <Skeleton className="h-24 w-full" />
                                ) : (
                                    <div className="rounded-md border border-border overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Tarih</TableHead>
                                                    <TableHead>Fiş</TableHead>
                                                    <TableHead>Açıklama</TableHead>
                                                    <TableHead className="text-right">Borç</TableHead>
                                                    <TableHead className="text-right">Alacak</TableHead>
                                                    <TableHead className="text-right">Bakiye</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(statement?.data ?? []).length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                                            Hareket yok.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    (statement?.data ?? []).map((m) => (
                                                        <TableRow key={m.id}>
                                                            <TableCell className="text-xs">{formatDate(m.createdAt)}</TableCell>
                                                            <TableCell className="text-xs font-mono">
                                                                {[m.documentType, m.documentNo].filter(Boolean).join('-') || '—'}
                                                            </TableCell>
                                                            <TableCell className="text-sm">
                                                                <div className="space-y-0.5">
                                                                    <p className="text-foreground">{m.description ?? m.type}</p>
                                                                    {m.reference ? <p className="text-xs text-muted-foreground font-mono">{m.reference}</p> : null}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono tabular-nums">
                                                                {Number(m.debit) > 0 ? formatCurrency(m.debit) : '—'}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono tabular-nums">
                                                                {Number(m.credit) > 0 ? formatCurrency(m.credit) : '—'}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono tabular-nums">
                                                                {formatCurrency(m.balanceAfter)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            <Dialog open={payOpen} onOpenChange={(o) => !paySaving && setPayOpen(o)}>
                <DialogContent showCloseButton={!paySaving}>
                    <DialogHeader>
                        <DialogTitle>Tahsilat</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label>Yöntem</Label>
                            <select
                                className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                                value={payMethod}
                                onChange={(e) => setPayMethod(e.target.value as any)}
                            >
                                <option value="PAYMENT_CASH">Nakit</option>
                                <option value="PAYMENT_CARD">Kart</option>
                                <option value="PAYMENT_TRANSFER">Havale/EFT</option>
                                <option value="PAYMENT_CHECK">Çek/Senet</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Tutar</Label>
                            <Input inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0,00" className="font-mono" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Referans</Label>
                            <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Fiş no / dekont no…" className="font-mono" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Açıklama</Label>
                            <Input value={payDesc} onChange={(e) => setPayDesc(e.target.value)} placeholder="İsteğe bağlı" />
                        </div>
                        {payError ? <p className="text-sm text-destructive">{payError}</p> : null}
                    </div>
                    <DialogFooter className="sm:flex-row gap-2">
                        <Button type="button" variant="ghost" onClick={() => setPayOpen(false)} disabled={paySaving}>
                            İptal
                        </Button>
                        <Button
                            type="button"
                            disabled={paySaving}
                            onClick={async () => {
                                setPayError(null);
                                const amt = parseFloat(payAmount.replace(',', '.'));
                                if (!Number.isFinite(amt) || amt <= 0) {
                                    setPayError('Geçerli bir tutar girin');
                                    return;
                                }
                                setPaySaving(true);
                                try {
                                    await api.post('/customers/payments', {
                                        customerId: id,
                                        method: payMethod,
                                        amount: amt,
                                        reference: payRef || undefined,
                                        description: payDesc || undefined,
                                    });
                                    setPayOpen(false);
                                    setPayAmount('');
                                    setPayRef('');
                                    setPayDesc('');
                                    // refresh card + summary + statement if open
                                    const [c, s] = await Promise.all([
                                        api.get(`/customers/${id}`),
                                        api.get(`/customers/${id}/summary`),
                                    ]);
                                    setCust(c.data);
                                    setSummary(s.data);
                                    if (tab === 'statement') await loadStatement();
                                } catch (err: unknown) {
                                    const msg =
                                        err && typeof err === 'object' && 'response' in err
                                            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                                            : undefined;
                                    setPayError(typeof msg === 'string' ? msg : 'Tahsilat kaydedilemedi');
                                } finally {
                                    setPaySaving(false);
                                }
                            }}
                        >
                            Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

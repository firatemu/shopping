'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, formatCurrency, formatDate, downloadAuthenticatedFile } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CustomerSummary {
    currentBalance: string | number;
    creditLimit: string | number;
    debitTotal: string | number;
    creditTotal: string | number;
}

interface StatementRow {
    id: string;
    createdAt: string;
    type: string;
    typeLabel: string;
    note?: string | null;
    reference?: string | null;
    documentType?: string | null;
    documentNo?: string | null;
    documentSummary?: string | null;
    debit: string;
    credit: string;
    balanceAfter: string;
}

type PaymentMethod = 'PAYMENT_CASH' | 'PAYMENT_CARD' | 'PAYMENT_TRANSFER' | 'PAYMENT_CHECK';

export default function CustomerMovementsPage() {
    const params = useParams();
    const id = typeof params?.id === 'string' ? params.id : '';

    const [customerName, setCustomerName] = useState('');
    const [customerCode, setCustomerCode] = useState('');

    const [summary, setSummary] = useState<CustomerSummary | null>(null);
    const [statement, setStatement] = useState<{ data: StatementRow[] } | null>(null);
    const [statementLoading, setStatementLoading] = useState(true);

    // Collection/Payment dialog
    const [payOpen, setPayOpen] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState<PaymentMethod>('PAYMENT_CASH');
    const [payRef, setPayRef] = useState('');
    const [payDesc, setPayDesc] = useState('');
    const [paySaving, setPaySaving] = useState(false);
    const [payError, setPayError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        Promise.all([
            api.get(`/customers/${id}`),
            api.get(`/customers/${id}/summary`),
        ])
            .then(([c, s]) => {
                const cust = c.data;
                setCustomerName(`${cust.name} ${cust.surname || ''}`.trim());
                setCustomerCode(cust.code || '');
                setSummary(s.data);
            })
            .catch(() => {
                // error
            });
    }, [id]);

    useEffect(() => {
        if (!id) return;
        setStatementLoading(true);
        api.get(`/customers/${id}/statement`, { params: { page: 1, limit: 200 } })
            .then((res) => {
                const unwrapped = (res.data as { data?: { data: StatementRow[] } })?.data ?? (res.data as unknown as { data: StatementRow[] });
                setStatement(unwrapped);
            })
            .catch(() => setStatement({ data: [] }))
            .finally(() => setStatementLoading(false));
    }, [id]);

    const handlePayment = async () => {
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
            // Refresh summary and statement
            const [s, st] = await Promise.all([
                api.get(`/customers/${id}/summary`),
                api.get(`/customers/${id}/statement`, { params: { page: 1, limit: 200 } }),
            ]);
            const unwrappedS = (s.data as { data?: CustomerSummary })?.data ?? (s.data as unknown as CustomerSummary);
            const unwrappedSt = (st.data as { data?: { data: StatementRow[] } })?.data ?? (st.data as unknown as { data: StatementRow[] });
            setSummary(unwrappedS);
            setStatement(unwrappedSt);
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            setPayError(typeof msg === 'string' ? msg : 'Tahsilat kaydedilemedi');
        } finally {
            setPaySaving(false);
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
        <div className="p-6 max-w-5xl space-y-4">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <h1 className="text-lg font-semibold text-foreground">Cari Hareketler</h1>
                    {customerName && (
                        <p className="text-xs text-muted-foreground">
                            {customerName}
                            {customerCode ? ` — ${customerCode}` : ''}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() =>
                            void downloadAuthenticatedFile(`/customers/${id}/statement/export/excel`, {
                                filenameFallback: `cari_ekstre_${id.slice(0, 8)}.xlsx`,
                            })
                        }
                    >
                        Excel
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() =>
                            void downloadAuthenticatedFile(`/customers/${id}/statement/export/pdf`, {
                                filenameFallback: `cari_ekstre_${id.slice(0, 8)}.pdf`,
                            })
                        }
                    >
                        PDF
                    </Button>
                    <Link
                        href={`/customers/${id}`}
                        className="inline-flex items-center justify-center h-8 px-3 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        Detay
                    </Link>
                </div>
            </div>

            {/* Özet kartları */}
            <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-[10px] border border-border bg-card p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Bakiye</p>
                    <p className={`font-mono tabular-nums text-base ${Number(summary?.currentBalance ?? 0) > 0 ? 'text-destructive' : 'text-success'}`}>
                        {formatCurrency(summary?.currentBalance ?? 0)}
                    </p>
                </div>
                <div className="rounded-[10px] border border-border bg-card p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Borç Toplam</p>
                    <p className="font-mono tabular-nums text-base text-destructive">{formatCurrency(summary?.debitTotal ?? 0)}</p>
                </div>
                <div className="rounded-[10px] border border-border bg-card p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Alacak Toplam</p>
                    <p className="font-mono tabular-nums text-base text-success">{formatCurrency(summary?.creditTotal ?? 0)}</p>
                </div>
                <div className="rounded-[10px] border border-border bg-card p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Kredi Limiti</p>
                    <p className="font-mono tabular-nums text-base">{formatCurrency(summary?.creditLimit ?? 0)}</p>
                </div>
            </div>

            {/* Tahsilat butonu */}
            <div className="flex justify-end">
                <Button type="button" size="sm" className="h-8" onClick={() => { setPayOpen(true); setPayError(null); }}>
                    Tahsilat
                </Button>
            </div>

            {/* Hareketler tablosu */}
            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                {statementLoading ? (
                    <div className="p-4 space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tarih</TableHead>
                                    <TableHead>Belge</TableHead>
                                    <TableHead>Tür</TableHead>
                                    <TableHead>Açıklama</TableHead>
                                    <TableHead className="text-right">Borç</TableHead>
                                    <TableHead className="text-right">Alacak</TableHead>
                                    <TableHead className="text-right">Bakiye</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(statement?.data ?? []).length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                                            <p className="text-sm">Bu cariye ait hareket bulunamadı.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    (statement?.data ?? []).map((m) => (
                                        <TableRow key={m.id}>
                                            <TableCell className="text-xs whitespace-nowrap font-mono">
                                                {formatDate(m.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono">
                                                {m.documentSummary ||
                                                    [m.documentType, m.documentNo].filter(Boolean).join(' - ') ||
                                                    '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] font-normal">
                                                    {m.typeLabel}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm max-w-[16rem]">
                                                <div className="space-y-0.5">
                                                    <p className="text-foreground truncate">{m.note?.trim() || '—'}</p>
                                                    {m.reference ? (
                                                        <p className="text-xs text-muted-foreground font-mono">Ref: {m.reference}</p>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono tabular-nums text-destructive">
                                                {Number(m.debit) > 0 ? formatCurrency(m.debit) : '—'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono tabular-nums text-success">
                                                {Number(m.credit) > 0 ? formatCurrency(m.credit) : '—'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono tabular-nums font-medium">
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

            {/* Tahsilat Dialog */}
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
                                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                            >
                                <option value="PAYMENT_CASH">Nakit</option>
                                <option value="PAYMENT_CARD">Kart</option>
                                <option value="PAYMENT_TRANSFER">Havale/EFT</option>
                                <option value="PAYMENT_CHECK">Çek/Senet</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Tutar</Label>
                            <Input
                                inputMode="decimal"
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                                placeholder="0,00"
                                className="font-mono"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Referans</Label>
                            <Input
                                value={payRef}
                                onChange={(e) => setPayRef(e.target.value)}
                                placeholder="Fiş no / dekont no…"
                                className="font-mono"
                            />
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
                        <Button type="button" disabled={paySaving} onClick={handlePayment}>
                            {paySaving ? 'Kaydediliyor…' : 'Kaydet'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
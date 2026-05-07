'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { api, formatCurrency, formatDate, downloadAuthenticatedFile } from '@/lib/api';
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
    updatedAt?: string;
    createdBy?: string;
    updatedBy?: string;
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
    typeLabel: string;
    note?: string | null;
    reference?: string | null;
    documentType?: string | null;
    documentNo?: string | null;
    documentSummary?: string | null;
    debit: string;
    credit: string;
    balanceAfter: string;
};

export default function CustomerDetailPage() {
    const params = useParams();
    const id = typeof params?.id === 'string' ? params.id : '';
    const [cust, setCust] = useState<CustomerDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'general' | 'statement'>('general');

    const [summary, setSummary] = useState<Summary | null>(null);
    const [statement, setStatement] = useState<{ data: StatementRow[]; summary?: Record<string, unknown> } | null>(null);
    const [statementLoading, setStatementLoading] = useState(false);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        Promise.all([
            api.get(`/customers/${id}`),
            api.get(`/customers/${id}/summary`),
        ])
            .then(([c, s]) => {
                const unwrappedC = (c.data as { data?: CustomerDetail })?.data ?? (c.data as unknown as CustomerDetail);
                const unwrappedS = (s.data as { data?: Summary })?.data ?? (s.data as unknown as Summary);
                setCust(unwrappedC);
                setSummary(unwrappedS);
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
            const wrapped = res.data as { data?: { data: StatementRow[]; summary?: Record<string, unknown> } };
            const unwrapped = wrapped?.data ?? (res.data as unknown as { data: StatementRow[]; summary?: Record<string, unknown> });
            setStatement(unwrapped);
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
                                <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Güncelleme</span>
                                    <span>{cust.updatedAt ? formatDate(cust.updatedAt) : '—'}</span>
                                </div>
                            </div>
                        )}

                        {tab === 'statement' && (
                            <div className="pt-2 border-t border-border space-y-3">
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    <Link
                                        href={`/customers/${id}/statement/preview`}
                                        className="inline-flex items-center justify-center h-8 px-3 rounded-md text-sm border border-input bg-transparent hover:bg-accent hover:text-foreground transition-colors"
                                    >
                                        PDF önizle
                                    </Link>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8"
                                        onClick={() =>
                                            void downloadAuthenticatedFile(`/customers/${id}/statement/export/excel`, {
                                                filenameFallback: `cari_ekstre_${id.slice(0, 8)}.xlsx`,
                                            })
                                        }
                                    >
                                        Excel indir
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8"
                                        onClick={() =>
                                            void downloadAuthenticatedFile(`/customers/${id}/statement/export/pdf`, {
                                                filenameFallback: `cari_ekstre_${id.slice(0, 8)}.pdf`,
                                            })
                                        }
                                    >
                                        PDF indir
                                    </Button>
                                </div>
                                {statementLoading ? (
                                    <Skeleton className="h-24 w-full" />
                                ) : (
                                    <div className="rounded-md border border-border overflow-x-auto">
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
                                                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                                            Hareket yok.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    (statement?.data ?? []).map((m) => (
                                                        <TableRow key={m.id}>
                                                            <TableCell className="text-xs whitespace-nowrap">
                                                                {formatDate(m.createdAt)}
                                                            </TableCell>
                                                            <TableCell className="text-xs font-mono">
                                                                {m.documentSummary ||
                                                                    [m.documentType, m.documentNo].filter(Boolean).join('-') ||
                                                                    '—'}
                                                            </TableCell>
                                                            <TableCell className="text-sm max-w-[14rem]">{m.typeLabel}</TableCell>
                                                            <TableCell className="text-sm max-w-[18rem]">
                                                                <div className="space-y-0.5">
                                                                    <p className="text-foreground">{m.note?.trim() || '—'}</p>
                                                                    {m.reference ? (
                                                                        <p className="text-xs text-muted-foreground font-mono">
                                                                            Ref: {m.reference}
                                                                        </p>
                                                                    ) : null}
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

        </div>
    );
}

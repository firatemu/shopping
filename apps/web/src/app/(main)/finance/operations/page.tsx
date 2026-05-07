'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, Printer, Download } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { api, formatCurrency } from '@/lib/api';
import { useTabStore } from '@/stores/useTabStore';

const KIND_LABEL: Record<string, string> = {
    CASH_COLLECTION: 'Nakit tahsilat',
    CARD_COLLECTION: 'Kredi kartı tahsilat (POS)',
    TRANSFER_IN: 'Gelen havale/EFT',
    CHECK_RECEIVED: 'Alınan çek',
    PROMISSORY_RECEIVED: 'Alınan senet',
    CASH_PAYMENT: 'Nakit ödeme',
    CARD_PAYMENT: 'Firma kredi kartı ödemesi',
    TRANSFER_OUT: 'Giden havale/EFT',
    CHECK_ISSUED: 'Verilen çek',
    PROMISSORY_ISSUED: 'Verilen senet',
    DEBIT_VOUCHER: 'Borç dekontu',
    CREDIT_VOUCHER: 'Alacak dekontu',
};

interface OpRow {
    id: string;
    kind: string;
    documentNo: string;
    amount: string | number;
    operationDate: string;
    customer: { code: string; name: string; surname?: string; companyName?: string };
    createdBy?: string;
    createdByName?: string | null;
    updatedBy?: string;
    updatedByName?: string | null;
}

export default function FinanceOperationsPage() {
    const router = useRouter();
    const addTab = useTabStore((s) => s.addTab);
    const [data, setData] = useState<{ data: OpRow[]; meta: { totalPages: number } } | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [page, setPage] = useState(1);
    const [printDialogId, setPrintDialogId] = useState<string | null>(null);
    const [printPaper, setPrintPaper] = useState<'A4' | 'A5'>('A4');
    const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const [printPreviewUrl, setPrintPreviewUrl] = useState<string | null>(null);
    const [printLoading, setPrintLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const res = await api.get('/partner-finance/operations', { params: { page, limit: 25 } });
            setData(res.data?.data ?? res.data);
        } catch (e) {
            setData(null);
            if (axios.isAxiosError(e) && e.response?.data && typeof (e.response.data as { message?: unknown }).message === 'string') {
                setLoadError((e.response.data as { message: string }).message);
            } else {
                setLoadError('Liste yüklenemedi. Oturum veya ağ bağlantınızı kontrol edin.');
            }
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { void load(); }, [load]);

    const openPrintDialog = (opId: string) => {
        setPrintDialogId(opId);
        setPrintPreviewUrl(null);
        setPrintPaper('A4');
        setPrintOrientation('portrait');
    };

    const closePrintDialog = () => {
        setPrintDialogId(null);
        if (printPreviewUrl) {
            URL.revokeObjectURL(printPreviewUrl);
            setPrintPreviewUrl(null);
        }
    };

    const loadPrintPreview = useCallback(async () => {
        if (!printDialogId) return;
        setPrintLoading(true);
        try {
            const res = await api.get(`/partner-finance/operations/${printDialogId}/receipt/pdf`, {
                params: { paper: printPaper, orientation: printOrientation },
                responseType: 'blob',
            });
            const url = URL.createObjectURL(res.data);
            setPrintPreviewUrl(url);
        } catch {
            setPrintPreviewUrl(null);
        } finally {
            setPrintLoading(false);
        }
    }, [printDialogId, printPaper, printOrientation]);

    useEffect(() => {
        if (printDialogId) {
            void loadPrintPreview();
        }
    }, [printDialogId, loadPrintPreview]);

    useEffect(() => {
        return () => {
            if (printPreviewUrl) URL.revokeObjectURL(printPreviewUrl);
        };
    }, [printPreviewUrl]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold text-foreground">Ödeme &amp; tahsilat</h1>
                    <p className="text-[13px] text-muted-foreground mt-0.5">Cariye bağlı tahsilat, ödeme ve dekontlar</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => void load()}>
                        <RefreshCw className="w-3.5 h-3.5" /> Yenile
                    </Button>
                    <Button
                        className="h-8 gap-1.5"
                        onClick={() => {
                            addTab({ title: 'Yeni işlem', path: '/finance/operations/new', closable: true });
                            router.push('/finance/operations/new');
                        }}
                    >
                        <Plus className="w-4 h-4" /> Yeni işlem
                    </Button>
                </div>
            </div>

            {loadError && (
                <div
                    role="alert"
                    className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                    {loadError}
                </div>
            )}

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Belge no', 'Tarih', 'Cari', 'Tür', 'Tutar', 'Oluşturan', ''].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <tr key={i} className="border-b border-border">
                                    {Array.from({ length: 5 }).map((_, j) => (
                                        <td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>
                                    ))}
                                </tr>
                            ))
                        ) : !data ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-16 text-center text-sm text-muted-foreground">
                                    {loadError ? 'Yukarıdaki hatayı giderip yenileyin.' : '—'}
                                </td>
                            </tr>
                        ) : data.data.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-16 text-center text-sm text-muted-foreground">
                                    Henüz kayıt yok. Yeni işlem ekleyin.
                                </td>
                            </tr>
                        ) : (
                            data.data.map((r) => {
                                const cust = r.customer.companyName
                                    ?? `${r.customer.name} ${r.customer.surname ?? ''}`.trim();
                                return (
                                    <tr key={r.id} className="border-b border-border hover:bg-accent/40">
                                        <td className="px-4 py-2.5 text-[13px] font-mono">{r.documentNo}</td>
                                        <td className="px-4 py-2.5 text-[13px] text-muted-foreground">
                                            {new Date(r.operationDate).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="px-4 py-2.5 text-[13px]">
                                            <span className="text-muted-foreground mr-1">{r.customer.code}</span>
                                            {cust}
                                        </td>
                                        <td className="px-4 py-2.5 text-[12px]">{KIND_LABEL[r.kind] ?? r.kind}</td>
                                        <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums">{formatCurrency(Number(r.amount))}</td>
                                        <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{r.createdByName ?? '—'}</td>
                                        <td className="px-4 py-2.5">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                title="Makbuz önizle / indir"
                                                onClick={() => openPrintDialog(r.id)}
                                            >
                                                <Printer className="w-3.5 h-3.5" />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {data && data.meta.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Önceki</Button>
                    <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Sonraki</Button>
                </div>
            )}

            {/* PDF Print Dialog */}
            <Dialog open={!!printDialogId} onOpenChange={(open) => { if (!open) closePrintDialog(); }}>
                <DialogContent className="max-w-2xl h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Makbuz Önizleme</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col flex-1 min-h-0 gap-3">
                        <div className="flex gap-3 items-center flex-wrap">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs">Kağıt</Label>
                                <Select value={printPaper} onValueChange={(v) => setPrintPaper(v as 'A4' | 'A5')}>
                                    <SelectTrigger className="h-8 w-20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="A4">A4</SelectItem>
                                        <SelectItem value="A5">A5</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-xs">Yön</Label>
                                <Select value={printOrientation} onValueChange={(v) => setPrintOrientation(v as 'portrait' | 'landscape')}>
                                    <SelectTrigger className="h-8 w-28">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="portrait">Dikey</SelectItem>
                                        <SelectItem value="landscape">Yatay</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-muted">
                            {printLoading ? (
                                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                    Yükleniyor...
                                </div>
                            ) : printPreviewUrl ? (
                                <iframe
                                    src={printPreviewUrl}
                                    className="w-full h-full border-0"
                                    title="Makbuz önizleme"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                    Önizleme yüklenemedi.
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={closePrintDialog}>
                                Kapat
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => {
                                    if (!printDialogId) return;
                                    api.get(`/partner-finance/operations/${printDialogId}/receipt/pdf`, {
                                        params: { paper: printPaper, orientation: printOrientation },
                                        responseType: 'blob',
                                    }).then((res) => {
                                        const blob = res.data;
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `makbuz_${printDialogId.slice(0, 8)}.pdf`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    });
                                }}
                            >
                                <Download className="w-4 h-4 mr-1" />
                                PDF İndir
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

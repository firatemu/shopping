'use client';

import { useCallback, useEffect, useState } from 'react';
import { Wallet, PlayCircle, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { api, formatCurrency } from '@/lib/api';

interface CashSession {
    id: string;
    openedAt: string;
    closedAt: string | null;
    openingBalance: number;
    closingBalance: number | null;
    status: string;
    openedByName: string;
}

export default function CashRegisterPage() {
    const [sessions, setSessions] = useState<CashSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [closeDialog, setCloseDialog] = useState(false);
    const [openingBal, setOpeningBal] = useState('0');
    const [physicalCount, setPhysicalCount] = useState('0');
    const [actionLoading, setActionLoading] = useState(false);
    const [openError, setOpenError] = useState('');
    const [closeError, setCloseError] = useState('');

    const fetchSessions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/cash-register/sessions', { params: { limit: 50 } });
            setSessions(res.data?.data ?? []);
        } catch {
            setSessions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const activeSession = sessions.find((s) => !s.closedAt);

    const handleOpenSession = async () => {
        setOpenError('');
        setActionLoading(true);
        try {
            const bal = Number(openingBal.replace(',', '.'));
            await api.post('/cash-register/open', { openingBalance: Number.isFinite(bal) ? bal : 0 });
            setOpenDialog(false);
            setOpeningBal('0');
            await fetchSessions();
        } catch (err: unknown) {
            const data = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: unknown } } }).response?.data
                : undefined;
            const m = data?.message;
            setOpenError(
                Array.isArray(m) ? m.join('; ') : typeof m === 'string' ? m : 'Kasa açılamadı',
            );
        } finally {
            setActionLoading(false);
        }
    };

    const handleCloseSession = async () => {
        if (!activeSession) return;
        setCloseError('');
        setActionLoading(true);
        try {
            const cnt = Number(physicalCount.replace(',', '.'));
            await api.post(`/cash-register/${activeSession.id}/close`, {
                physicalCount: Number.isFinite(cnt) ? cnt : 0,
            });
            setCloseDialog(false);
            setPhysicalCount('0');
            await fetchSessions();
        } catch (err: unknown) {
            const data = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: unknown } } }).response?.data
                : undefined;
            const m = data?.message;
            setCloseError(
                Array.isArray(m) ? m.join('; ') : typeof m === 'string' ? m : 'Kasa kapatılamadı',
            );
        } finally {
            setActionLoading(false);
        }
    };

    const headerBtn = activeSession ? (
        <Button
            type="button"
            variant="secondary"
            className="h-8 gap-1.5"
            onClick={() => {
                setCloseError('');
                setPhysicalCount(activeSession.openingBalance.toFixed(2));
                setCloseDialog(true);
            }}
        >
            <StopCircle className="w-4 h-4" /> Kasa Kapat
        </Button>
    ) : (
                        <Button type="button" className="h-8 gap-1.5" onClick={() => { setOpenError(''); setOpenDialog(true); }}>
            <PlayCircle className="w-4 h-4" /> Kasa Aç
        </Button>
    );

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-foreground">Kasa Yönetimi</h1>
                {headerBtn}
            </div>

            {!loading && activeSession && (
                <div className="rounded-[10px] border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <span className="text-sm font-medium text-foreground">Aktif Oturum</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Açılış</p>
                            <p className="text-sm font-mono tabular-nums text-foreground">
                                {formatCurrency(activeSession.openingBalance)}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Açan</p>
                            <p className="text-sm text-foreground">{activeSession.openedByName}</p>
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Başlangıç</p>
                            <p className="text-sm text-foreground">{new Date(activeSession.openedAt).toLocaleString('tr-TR')}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Tarih', 'Açılış', 'Kapanış', 'Açan', 'Durum'].map((h) => (
                                <th
                                    key={h}
                                    className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i} className="border-b border-border">
                                    {Array.from({ length: 5 }).map((_, j) => (
                                        <td key={j} className="px-4 py-2.5">
                                            <Skeleton className="h-4 w-20" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : sessions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-16 text-center">
                                    <Wallet className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                    <p className="text-sm text-muted-foreground">Henüz kasa oturumu yok</p>
                                </td>
                            </tr>
                        ) : (
                            sessions.map((s) => (
                                <tr key={s.id} className="border-b border-border">
                                    <td className="px-4 py-2.5 text-[13px] text-foreground">
                                        {new Date(s.openedAt).toLocaleDateString('tr-TR')}
                                    </td>
                                    <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-foreground">
                                        {formatCurrency(s.openingBalance)}
                                    </td>
                                    <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-foreground">
                                        {s.closingBalance != null ? formatCurrency(s.closingBalance) : '—'}
                                    </td>
                                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{s.openedByName}</td>
                                    <td className="px-4 py-2.5">
                                        <Badge variant={s.closedAt ? 'secondary' : 'default'} className="text-[10px]">
                                            {s.closedAt ? 'Kapalı' : 'Açık'}
                                        </Badge>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Dialog open={openDialog} onOpenChange={(o) => !actionLoading && setOpenDialog(o)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Kasa aç</DialogTitle>
                        <DialogDescription>Günlük nakit ile oturumu başlatın.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="opening-balance">Açılış bakiyesi (TRY)</Label>
                        <Input
                            id="opening-balance"
                            inputMode="decimal"
                            value={openingBal}
                            onChange={(e) => setOpeningBal(e.target.value)}
                        />
                        {openError ? (
                            <p className="text-xs text-destructive">{openError}</p>
                        ) : null}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpenDialog(false)} disabled={actionLoading}>
                            İptal
                        </Button>
                        <Button type="button" onClick={handleOpenSession} disabled={actionLoading}>
                            Oturumu aç
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={closeDialog} onOpenChange={(o) => !actionLoading && setCloseDialog(o)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Kasa kapat</DialogTitle>
                        <DialogDescription>Kasayı saydığınız fiili tutarı girin.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="physical">Fiili nakit sayımı (TRY)</Label>
                        <Input
                            id="physical"
                            inputMode="decimal"
                            value={physicalCount}
                            onChange={(e) => setPhysicalCount(e.target.value)}
                        />
                        {closeError ? (
                            <p className="text-xs text-destructive">{closeError}</p>
                        ) : null}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setCloseDialog(false)} disabled={actionLoading}>
                            İptal
                        </Button>
                        <Button type="button" onClick={handleCloseSession} disabled={actionLoading}>
                            Kapat
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

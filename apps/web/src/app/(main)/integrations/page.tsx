'use client';

import { useEffect, useState, useCallback } from 'react';
import { Link2, Plug, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

interface Integration {
    type: string;
    name: string;
    status: 'CONNECTED' | 'DISCONNECTED' | 'PAUSED' | 'ERROR';
    lastSyncAt?: string;
    errorMessage?: string;
    config?: Record<string, unknown>;
}

const typeLabels: Record<string, string> = {
    TRENDYOL: 'Trendyol', HEPTA: 'Hepsi Ödeme', PARATIKA: 'Paratika',
    Ideasoft: 'İdeasoft', Shopify: 'Shopify',
};

const typeColors: Record<string, string> = {
    CONNECTED: 'default', DISCONNECTED: 'secondary', PAUSED: 'secondary', ERROR: 'destructive',
};

export default function IntegrationsPage() {
    const [integrations, setIntegrations] = useState<{ data: Integration[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/integrations');
            setIntegrations(res.data?.data ?? res.data);
        } catch {
            setIntegrations({ data: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const handleConnect = async (type: string) => {
        setActionLoading(type);
        try {
            await api.post('/integrations/connect', { type });
            fetch();
        } catch { /* ignore */ }
        finally { setActionLoading(null); }
    };

    const handleDisconnect = async (type: string) => {
        if (!confirm(`${typeLabels[type] || type} entegrasyonunu bağlantısını kesmek istediğinize emin misiniz?`)) return;
        setActionLoading(type);
        try {
            await api.post(`/integrations/${type}/disconnect`);
            fetch();
        } catch { /* ignore */ }
        finally { setActionLoading(null); }
    };

    const handlePause = async (type: string) => {
        setActionLoading(type);
        try {
            await api.post(`/integrations/${type}/pause`);
            fetch();
        } catch { /* ignore */ }
        finally { setActionLoading(null); }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <h1 className="text-lg font-semibold text-foreground">E-ticaret Entegrasyonları</h1>
            </div>

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Platform', 'Durum', 'Son Senkron', 'Hata', ''].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i} className="border-b border-border">
                                {Array.from({ length: 5 }).map((_, j) => (<td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>))}
                            </tr>
                        )) : integrations?.data.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-16 text-center">
                                <Plug className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                <p className="text-sm text-muted-foreground">E-ticaret entegrasyonu bulunamadı.</p>
                            </td></tr>
                        ) : integrations?.data.map((intg) => (
                            <tr key={intg.type} className="border-b border-border hover:bg-accent/50 transition-colors">
                                <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <Plug className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                                        <span className="text-[13px] font-medium text-foreground">{typeLabels[intg.type] ?? intg.type}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-2.5">
                                    <Badge variant={typeColors[intg.status] as 'default' | 'secondary' | 'destructive' | undefined} className="text-[10px]">
                                        {intg.status === 'CONNECTED' ? 'Bağlı' : intg.status === 'DISCONNECTED' ? 'Bağlı değil' : intg.status === 'PAUSED' ? 'Duraklatıldı' : 'Hata'}
                                    </Badge>
                                </td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">
                                    {intg.lastSyncAt ? new Date(intg.lastSyncAt).toLocaleString('tr-TR') : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground max-w-xs truncate">
                                    {intg.errorMessage ?? '—'}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {intg.status === 'DISCONNECTED' && (
                                            <Button variant="secondary" size="sm" className="h-7 text-xs"
                                                onClick={() => handleConnect(intg.type)} disabled={actionLoading === intg.type}>
                                                <Plug className="w-3 h-3 mr-1" /> Bağlan
                                            </Button>
                                        )}
                                        {intg.status === 'CONNECTED' && (
                                            <>
                                                <Button variant="ghost" size="sm" className="h-7 text-xs"
                                                    onClick={() => handlePause(intg.type)} disabled={actionLoading === intg.type}>
                                                    <Pause className="w-3 h-3 mr-1" /> Duraklat
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive"
                                                    onClick={() => handleDisconnect(intg.type)} disabled={actionLoading === intg.type}>
                                                    Bağlantıyı kes
                                                </Button>
                                            </>
                                        )}
                                        {intg.status === 'PAUSED' && (
                                            <Button variant="secondary" size="sm" className="h-7 text-xs"
                                                onClick={() => handleConnect(intg.type)} disabled={actionLoading === intg.type}>
                                                <Play className="w-3 h-3 mr-1" /> Devam et
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
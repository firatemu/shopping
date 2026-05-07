'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import axios from 'axios';
import { api, downloadAuthenticatedFile } from '@/lib/api';

type Paper = 'A4' | 'A5';
type Orientation = 'portrait' | 'landscape';

export default function CustomerStatementPreviewPage() {
    const params = useParams();
    const id = typeof params?.id === 'string' ? params.id : '';

    const [paper, setPaper] = useState<Paper>('A4');
    const [orientation, setOrientation] = useState<Orientation>('portrait');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    const title = useMemo(() => {
        const fmt = `${paper} ${orientation === 'portrait' ? 'Dikey' : 'Yatay'}`;
        return `Ekstre PDF Önizleme · ${fmt}`;
    }, [paper, orientation]);

    const loadPdf = async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/customers/${id}/statement/export/pdf`, {
                responseType: 'blob',
                params: { paper, orientation },
            });
            const blob = res.data as Blob;
            const url = URL.createObjectURL(blob);
            setObjectUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return url;
            });
        } catch (e: unknown) {
            setObjectUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
            });
            const msg = axios.isAxiosError(e)
                ? String(e.response?.data?.message ?? 'PDF oluşturulamadı.')
                : e instanceof Error
                  ? e.message
                  : 'PDF oluşturulamadı.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadPdf();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, paper, orientation]);

    useEffect(() => {
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!id) {
        return (
            <div className="p-6">
                <p className="text-sm text-muted-foreground">Geçersiz müşteri.</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                    <h1 className="text-lg font-semibold text-foreground">{title}</h1>
                    <p className="text-xs text-muted-foreground">
                        Seçim değişince PDF otomatik yenilenir.
                    </p>
                </div>
                <Link
                    href={`/customers/${id}`}
                    className="inline-flex items-center justify-center h-8 px-3 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                    Geri
                </Link>
            </div>

            <div className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                <div className="flex flex-wrap items-end gap-3 justify-between">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Kağıt</p>
                            <select
                                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                                value={paper}
                                onChange={(e) => setPaper(e.target.value as Paper)}
                            >
                                <option value="A4">A4</option>
                                <option value="A5">A5</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Yön</p>
                            <select
                                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                                value={orientation}
                                onChange={(e) => setOrientation(e.target.value as Orientation)}
                            >
                                <option value="portrait">Dikey</option>
                                <option value="landscape">Yatay</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void loadPdf()} disabled={loading}>
                            Yenile
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            onClick={() =>
                                void downloadAuthenticatedFile(`/customers/${id}/statement/export/pdf`, {
                                    params: { paper, orientation },
                                    filenameFallback: `cari_ekstre_${id.slice(0, 8)}_${paper}_${orientation}.pdf`,
                                })
                            }
                        >
                            İndir
                        </Button>
                    </div>
                </div>

                {error ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                        {error}
                    </div>
                ) : null}

                {loading ? (
                    <Skeleton className="h-[70vh] w-full" />
                ) : objectUrl ? (
                    <div className="rounded-md border border-border overflow-hidden bg-background">
                        <iframe
                            title="Ekstre PDF önizleme"
                            src={objectUrl}
                            className="w-full h-[75vh]"
                        />
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">Önizleme yok.</p>
                )}
            </div>
        </div>
    );
}


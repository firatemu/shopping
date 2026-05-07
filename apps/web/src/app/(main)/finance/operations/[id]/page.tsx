'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency, formatDate } from '@/lib/api';

interface OperationDetail {
    id: string;
    type: string;
    serialNumber: string;
    amount: number;
    dueDate: string;
    status: string;
    issuerName: string;
    relatedCustomerName?: string;
    description?: string;
    createdAt: string;
    paidAt?: string;
}

const statusLabels: Record<string, string> = {
    PENDING: 'Bekliyor', CASHED: 'Tahsil Edildi', RETURNED: 'İade Edildi', CANCELLED: 'İptal',
};

export default function FinanceOperationDetailPage() {
    const params = useParams();
    const operationId = params.id as string;

    const [operation, setOperation] = useState<OperationDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetch = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/partner-finance/operations/${operationId}`);
            setOperation(res.data?.data ?? res.data);
        } catch {
            setError('Operasyon bilgileri yüklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [operationId]);

    useEffect(() => { fetch(); }, [fetch]);

    if (loading) {
        return (
            <div className="p-6 max-w-lg space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    if (error || !operation) {
        return (
            <div className="p-6 max-w-lg space-y-4">
                <p className="text-sm text-destructive">{error || 'Operasyon bulunamadı.'}</p>
                <Link href="/finance/operations"><Button variant="secondary">Operasyonlara dön</Button></Link>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-lg space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-foreground">Operasyon Detay</h1>
                <Link href="/finance/operations">
                    <Button variant="ghost" className="h-8">Geri</Button>
                </Link>
            </div>

            <div className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tür</p>
                        <p className="text-[13px] font-medium text-foreground mt-0.5">
                            {operation.type === 'CHECK' ? 'Çek' : operation.type === 'PROMISSORY_NOTE' ? 'Senet' : operation.type}
                        </p>
                    </div>
                    <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Seri No</p>
                        <p className="text-[13px] font-mono text-foreground mt-0.5">{operation.serialNumber}</p>
                    </div>
                    <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tutar</p>
                        <p className="text-lg font-semibold font-mono tabular-nums text-foreground mt-0.5">{formatCurrency(operation.amount)}</p>
                    </div>
                    <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Durum</p>
                        <span className={`inline-block mt-0.5 text-[11px] px-2 py-0.5 rounded-full ${operation.status === 'CASHED' ? 'bg-success/10 text-success' : operation.status === 'PENDING' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            {statusLabels[operation.status] ?? operation.status}
                        </span>
                    </div>
                    <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Vade</p>
                        <p className="text-[13px] text-foreground mt-0.5">{formatDate(operation.dueDate)}</p>
                    </div>
                    <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Keşideci</p>
                        <p className="text-[13px] text-foreground mt-0.5">{operation.issuerName}</p>
                    </div>
                    {operation.relatedCustomerName && (
                        <div>
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">İlişkili Müşteri</p>
                            <p className="text-[13px] text-foreground mt-0.5">{operation.relatedCustomerName}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Oluşturulma</p>
                        <p className="text-[13px] text-muted-foreground mt-0.5">{formatDate(operation.createdAt)}</p>
                    </div>
                    {operation.paidAt && (
                        <div>
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tahsilat</p>
                            <p className="text-[13px] text-success mt-0.5">{formatDate(operation.paidAt)}</p>
                        </div>
                    )}
                </div>
                {operation.description && (
                    <div className="pt-2 border-t border-dashed border-border">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Açıklama</p>
                        <p className="text-[13px] text-foreground mt-0.5">{operation.description}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
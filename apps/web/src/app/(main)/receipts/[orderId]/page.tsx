'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency } from '@/lib/api';

interface ReceiptItem {
    productName: string;
    variantDesc?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
}

interface Receipt {
    orderId: string;
    receiptNumber: string;
    date: string;
    customerName?: string;
    items: ReceiptItem[];
    subtotal: number;
    discountTotal: number;
    vatTotal: number;
    total: number;
    paymentMethod: string;
    cashierName: string;
    branchName: string;
}

export default function ReceiptPage() {
    const params = useParams();
    const orderId = params.orderId as string;

    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchReceipt = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/receipts/${orderId}`);
            setReceipt(res.data?.data ?? res.data);
        } catch {
            setError('Fiş bilgileri yüklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => { fetchReceipt(); }, [fetchReceipt]);

    const handlePrint = () => window.print();

    if (loading) {
        return (
            <div className="p-6 max-w-lg space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error || !receipt) {
        return (
            <div className="p-6 max-w-lg space-y-4">
                <p className="text-sm text-destructive">{error || 'Fiş bulunamadı.'}</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-lg space-y-4">
            <div className="flex items-center justify-between print:hidden">
                <h1 className="text-lg font-semibold text-foreground">Fiş #{receipt.receiptNumber}</h1>
                <Button onClick={handlePrint} className="gap-1.5 h-8" variant="secondary">
                    <Printer className="w-4 h-4" /> Yazdır
                </Button>
            </div>

            <div className="rounded-[10px] border border-border bg-card p-6 space-y-4 text-sm" id="receipt-print-area">
                <div className="text-center border-b border-dashed border-border pb-4">
                    <h2 className="font-semibold text-base">{receipt.branchName}</h2>
                    <p className="text-xs text-muted-foreground">Fiş No: {receipt.receiptNumber}</p>
                    <p className="text-xs text-muted-foreground">{new Date(receipt.date).toLocaleString('tr-TR')}</p>
                    {receipt.customerName && <p className="text-xs text-muted-foreground mt-1">Müşteri: {receipt.customerName}</p>}
                </div>

                <div className="space-y-2">
                    {receipt.items.map((item, i) => (
                        <div key={i} className="flex justify-between gap-2">
                            <div className="flex-1">
                                <p className="font-medium">{item.productName}</p>
                                {item.variantDesc && <p className="text-[11px] text-muted-foreground">{item.variantDesc}</p>}
                                <p className="text-[11px] text-muted-foreground">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                            </div>
                            <div className="text-right font-mono tabular-nums">
                                {item.discount > 0 && <p className="text-[11px] text-muted-foreground">-{formatCurrency(item.discount)}</p>}
                                <p className="font-medium">{formatCurrency(item.total)}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t border-dashed border-border pt-3 space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Ara toplam</span>
                        <span className="font-mono tabular-nums">{formatCurrency(receipt.subtotal)}</span>
                    </div>
                    {receipt.discountTotal > 0 && (
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">İndirim</span>
                            <span className="font-mono tabular-nums text-success">-{formatCurrency(receipt.discountTotal)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">KDV</span>
                        <span className="font-mono tabular-nums">{formatCurrency(receipt.vatTotal)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base border-t border-dashed border-border pt-2">
                        <span>TOPLAM</span>
                        <span className="font-mono tabular-nums">{formatCurrency(receipt.total)}</span>
                    </div>
                </div>

                <div className="text-center text-xs text-muted-foreground border-t border-dashed border-border pt-3">
                    <p>Ödeme: {receipt.paymentMethod}</p>
                    <p>Kasiyer: {receipt.cashierName}</p>
                    <p className="mt-2">İşlemleriniz için teşekkür ederiz.</p>
                </div>
            </div>
        </div>
    );
}
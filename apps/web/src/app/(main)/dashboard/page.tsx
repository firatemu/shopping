'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, ShoppingCart, Undo2, Users, AlertTriangle } from 'lucide-react';
import { api, formatCurrency } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardKpis {
    todayRevenue: number;
    todayOrders: number;
    todayReturns: number;
    activeCustomers: number;
    lowStockCount: number;
}

export default function DashboardPage() {
    const [kpis, setKpis] = useState<DashboardKpis | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/reports/dashboard')
            .then((res) => setKpis(res.data?.data ?? res.data))
            .catch(() => setKpis({ todayRevenue: 0, todayOrders: 0, todayReturns: 0, activeCustomers: 0, lowStockCount: 0 }))
            .finally(() => setLoading(false));
    }, []);

    const cards = [
        {
            label: 'Bugünkü Ciro',
            value: kpis ? formatCurrency(kpis.todayRevenue) : '—',
            sub: kpis ? `${kpis.todayOrders} sipariş` : '',
            icon: TrendingUp,
            color: 'text-success',
        },
        {
            label: 'İadeler',
            value: kpis ? `${kpis.todayReturns}` : '—',
            sub: 'bugün',
            icon: Undo2,
            color: 'text-warning',
        },
        {
            label: 'Aktif Müşteriler',
            value: kpis ? `${kpis.activeCustomers}` : '—',
            sub: 'toplam',
            icon: Users,
            color: 'text-primary',
        },
        {
            label: 'Düşük Stok',
            value: kpis ? `${kpis.lowStockCount}` : '—',
            sub: 'uyarı',
            icon: AlertTriangle,
            color: kpis && kpis.lowStockCount > 0 ? 'text-destructive' : 'text-muted-foreground',
        },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="rounded-[10px] border border-border bg-card p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                    {card.label}
                                </p>
                                <Icon className={`w-4 h-4 ${card.color}`} strokeWidth={1.5} />
                            </div>
                            {loading ? (
                                <Skeleton className="h-8 w-24" />
                            ) : (
                                <>
                                    <p className="text-2xl font-semibold text-foreground font-mono tabular-nums">{card.value}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Recent Activity Placeholder */}
            <div className="rounded-[10px] border border-border bg-card p-4">
                <h2 className="text-sm font-medium text-foreground mb-3">Son İşlemler</h2>
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                    <div className="text-center">
                        <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                        <p>Henüz işlem yok</p>
                        <p className="text-xs mt-1">Satış konsolu üzerinden yeni satış oluşturabilirsiniz</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

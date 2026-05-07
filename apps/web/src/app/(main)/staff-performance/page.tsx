'use client';

import { useEffect, useState, useCallback } from 'react';
import { Trophy, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency } from '@/lib/api';

interface LeaderboardEntry {
    userId: string;
    userName: string;
    branchName: string;
    totalSales: number;
    orderCount: number;
    returnRate: number;
    rank: number;
}

interface SalesTarget {
    id: string;
    userName: string;
    targetAmount: number;
    achievedAmount: number;
    period: string;
    status: string;
}

export default function StaffPerformancePage() {
    const [leaderboard, setLeaderboard] = useState<{ data: LeaderboardEntry[] } | null>(null);
    const [targets, setTargets] = useState<{ data: SalesTarget[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'leaderboard' | 'targets'>('leaderboard');

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const [lbRes, tgtRes] = await Promise.all([
                api.get('/staff-performance/leaderboard'),
                api.get('/staff-performance/targets'),
            ]);
            setLeaderboard(lbRes.data?.data ?? lbRes.data);
            setTargets(tgtRes.data?.data ?? tgtRes.data);
        } catch {
            setLeaderboard({ data: [] });
            setTargets({ data: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    <h1 className="text-lg font-semibold text-foreground">Personel Performansı</h1>
                </div>
                <div className="flex rounded-[8px] border border-border overflow-hidden">
                    <button onClick={() => setTab('leaderboard')}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${tab === 'leaderboard' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent'}`}>
                        Lider Tablosu
                    </button>
                    <button onClick={() => setTab('targets')}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${tab === 'targets' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent'}`}>
                        Hedefler
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-16 w-full" />))}</div>
            ) : tab === 'leaderboard' ? (
                leaderboard?.data.length === 0 ? (
                    <div className="rounded-[10px] border border-border bg-card p-8 text-center">
                        <Trophy className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                        <p className="text-sm text-muted-foreground">Lider tablosu verisi yok.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {leaderboard?.data.map((entry) => (
                            <div key={entry.userId} className={`rounded-[10px] border bg-card p-4 flex items-center gap-4 ${entry.rank === 1 ? 'border-yellow-400/50 bg-yellow-50/50' : 'border-border'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${entry.rank === 1 ? 'bg-yellow-400 text-white' : entry.rank === 2 ? 'bg-gray-300 text-white' : entry.rank === 3 ? 'bg-amber-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                                    {entry.rank}
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] font-medium text-foreground">{entry.userName}</p>
                                    <p className="text-[11px] text-muted-foreground">{entry.branchName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[13px] font-mono tabular-nums font-semibold text-foreground">{formatCurrency(entry.totalSales)}</p>
                                    <p className="text-[11px] text-muted-foreground">{entry.orderCount} satış · %{entry.returnRate.toFixed(1)} iade</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                targets?.data.length === 0 ? (
                    <div className="rounded-[10px] border border-border bg-card p-8 text-center">
                        <Target className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                        <p className="text-sm text-muted-foreground">Hedef bulunamadı.</p>
                        <Button className="mt-3" onClick={() => window.location.href = '/staff-performance/targets/new'} size="sm">Yeni Hedef Ekle</Button>
                    </div>
                ) : (
                    <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    {['Personel', 'Dönem', 'Hedef', 'Gerçekleşen', 'Oran', 'Durum'].map((h) => (
                                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {targets?.data.map((t) => {
                                    const pct = t.targetAmount > 0 ? (t.achievedAmount / t.targetAmount) * 100 : 0;
                                    return (
                                        <tr key={t.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                                            <td className="px-4 py-2.5 text-[13px] text-foreground font-medium">{t.userName}</td>
                                            <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{t.period}</td>
                                            <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-muted-foreground">{formatCurrency(t.targetAmount)}</td>
                                            <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-foreground">{formatCurrency(t.achievedAmount)}</td>
                                            <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums">
                                                <span className={pct >= 100 ? 'text-success' : pct >= 70 ? 'text-yellow-600' : 'text-destructive'}>
                                                    %{pct.toFixed(1)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-[11px]">
                                                <span className={`px-2 py-0.5 rounded-full ${t.status === 'ACHIEVED' ? 'bg-success/10 text-success' : t.status === 'ACTIVE' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );
}
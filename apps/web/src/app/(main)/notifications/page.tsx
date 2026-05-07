'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, CheckCheck, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatDate } from '@/lib/api';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    link?: string;
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<{ data: Notification[] } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data?.data ?? res.data);
        } catch {
            setNotifications({ data: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const markAsRead = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications((prev) => prev ? {
                ...prev,
                data: prev.data.map((n) => n.id === id ? { ...n, isRead: true } : n),
            } : prev);
        } catch { /* ignore */ }
    };

    const markAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications((prev) => prev ? { ...prev, data: prev.data.map((n) => ({ ...n, isRead: true })) } : prev);
        } catch { /* ignore */ }
    };

    const unreadCount = notifications?.data.filter((n) => !n.isRead).length ?? 0;

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    <h1 className="text-lg font-semibold text-foreground">Bildirimler</h1>
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-destructive text-[11px] text-white font-medium">{unreadCount}</span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 gap-1.5 text-xs">
                        <CheckCheck className="w-4 h-4" /> Tümünü okundu işaretle
                    </Button>
                )}
            </div>

            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                {loading ? (
                    <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-14 w-full" />))}</div>
                ) : notifications?.data.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                        <p className="text-sm text-muted-foreground">Bildirim bulunamadı.</p>
                    </div>
                ) : (
                    notifications?.data.map((n) => (
                        <div key={n.id} className={`flex items-start gap-3 p-4 border-b border-border last:border-0 hover:bg-accent/50 transition-colors ${!n.isRead ? 'bg-accent/20' : ''}`}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-[13px] font-medium text-foreground">{n.title}</p>
                                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                                </div>
                                <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                                <p className="text-[11px] text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                                {n.link && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (n.link) window.location.href = n.link; }}>
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                )}
                                {!n.isRead && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markAsRead(n.id)} title="Okundu işaretle">
                                        <CheckCheck className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
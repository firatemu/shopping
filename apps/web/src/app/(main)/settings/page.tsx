'use client';

import { Store, Users, Bell } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

export default function SettingsPage() {
    const user = useAuthStore((s) => s.user);

    const sections = [
        {
            title: 'Mağaza Bilgileri',
            icon: Store,
            items: [
                { label: 'Mağaza Adı', value: 'SoftShopping Mağaza' },
                { label: 'Vergi No', value: '123456789' },
                { label: 'Varsayılan KDV', value: '%20' },
                { label: 'Para Birimi', value: 'TRY' },
            ],
        },
        {
            title: 'Kullanıcı',
            icon: Users,
            items: [
                { label: 'Ad Soyad', value: user ? `${user.firstName} ${user.lastName}` : '—' },
                { label: 'E-posta', value: user?.email ?? '—' },
                { label: 'Rol', value: user?.role ?? '—' },
            ],
        },
        {
            title: 'Bildirimler',
            icon: Bell,
            items: [
                { label: 'Düşük Stok Uyarısı', value: 'Aktif' },
                { label: 'Vadesi Geçmiş Müşteri', value: 'Aktif' },
                { label: 'Gün Sonu Rapor', value: 'Aktif' },
            ],
        },
    ];

    return (
        <div className="p-6 space-y-6 max-w-2xl">
            <h1 className="text-lg font-semibold text-foreground">Ayarlar</h1>

            {sections.map((section) => {
                const Icon = section.icon;
                return (
                    <div key={section.title} className="rounded-[10px] border border-border bg-card">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                            <Icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                            <span className="text-sm font-medium text-foreground">{section.title}</span>
                        </div>
                        <div className="divide-y divide-border">
                            {section.items.map((item) => (
                                <div key={item.label} className="flex items-center justify-between px-4 py-3">
                                    <span className="text-[13px] text-muted-foreground">{item.label}</span>
                                    <span className="text-[13px] text-foreground">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

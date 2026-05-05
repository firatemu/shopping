'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/useAuthStore';
import { api } from '@/lib/api';
import axios from 'axios';

function formatLoginError(err: unknown): string {
    if (!axios.isAxiosError(err)) {
        return 'Giriş başarısız';
    }
    if (err.response == null) {
        return 'API’ye bağlanılamıyor. Nest’i :4000’de çalıştırın; Web ve API aynı makinedeyse apps/web/.env.local içinde API_DEV_PROXY_TARGET deneyin.';
    }
    const status = err.response.status;
    const body = err.response.data;

    if (typeof body === 'string' && body.includes('<!DOCTYPE')) {
        return 'API yanıtı HTML (muhtemelen Next veya ağ hatası). Arka uç loglarına bakın.';
    }

    let messageFromBody: string | undefined;
    if (typeof body === 'object' && body !== null && 'message' in body) {
        const msg = (body as { message: unknown }).message;
        if (Array.isArray(msg)) {
            messageFromBody = msg.join('; ');
        } else if (typeof msg === 'string') {
            messageFromBody = msg;
        }
    }

    if (messageFromBody && messageFromBody.trim().length > 0) {
        return messageFromBody;
    }

    if (status === 502 || status === 504) {
        return 'Proxy arka uca ulaşamadı. Nest çalışıyor mu ve API_DEV_PROXY_TARGET doğru mu?';
    }

    if (status === 503) {
        return 'API geçici olarak kullanılamıyor (503). Çoğunlukla PostgreSQL veya Redis yok; kök dizinde `npm run docker:db` ardından migrate/seed ve `npm run dev:api` çalıştırın.';
    }

    /* Next dev proxy often returns 500 when nothing listens on :4000 — indistinguishable from a real Nest 500 without a JSON body. */
    if (status === 500) {
        return 'Sunucu veya proxy hatası (500). Nest API’yi 4000 portunda çalıştırın (`npm run dev:api`). Docker kapalıysa önce `npm run docker:db` ile postgres ve redis’i açın.';
    }

    return 'Giriş başarısız';
}

export default function LoginPage() {
    const router = useRouter();
    const setAuth = useAuthStore((s) => s.setAuth);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/auth/login', { identifier: username, password });
            setAuth(res.data.user, res.data.accessToken);
            router.push('/dashboard');
        } catch (err: unknown) {
            setError(formatLoginError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <Store className="w-6 h-6 text-primary" />
                    <span className="text-lg font-semibold text-foreground">TextilePOS</span>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                            Kullanıcı Adı
                        </label>
                        <Input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="info@azemyazilim.com"
                            className="h-[34px]"
                            autoFocus
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                            Şifre
                        </label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="h-[34px]"
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-xs text-destructive">{error}</p>
                    )}

                    <Button
                        type="submit"
                        className="w-full h-8"
                        disabled={loading}
                    >
                        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                    </Button>
                </form>

                <p className="mt-6 text-center text-xs text-muted-foreground">
                    TextilePOS v1.0 — Textile Retail Management
                </p>
            </div>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, ArrowRight, Package, FileText, MonitorSmartphone, Globe, BarChart3, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/useAuthStore';
import { api } from '@/lib/api';
import axios from 'axios';
import Image from 'next/image';

function formatLoginError(err: unknown): string {
    if (!axios.isAxiosError(err)) {
        return 'Giriş başarısız';
    }
    if (err.response == null) {
        return 'API’ye bağlanılamıyor.';
    }
    const status = err.response.status;
    const body = err.response.data;

    if (typeof body === 'string' && body.includes('<!DOCTYPE')) {
        return 'API yanıtı HTML. Arka uç loglarına bakın.';
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

    if (status === 502 || status === 504) return 'Proxy arka uca ulaşamadı. Nest çalışıyor mu?';
    if (status === 503) return 'API geçici olarak kullanılamıyor.';
    if (status === 500) return 'Sunucu veya proxy hatası (500).';

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
        <div className="flex min-h-screen bg-background">
            {/* Left Box: Image & App Features */}
            <div className="relative hidden w-[55%] lg:flex flex-col justify-between border-r border-border/20 bg-slate-950">
                {/* Background Image & Corporate Dark Overlays */}
                <div className="absolute inset-0 overflow-hidden">
                    <Image
                        src="/textilepos_dashboard_bg.png"
                        alt="SoftShopping Dashboard"
                        fill
                        priority
                        className="object-cover opacity-30 mix-blend-luminosity scale-105"
                        sizes="60vw"
                    />
                    {/* Dark professional gradient, strictly preventing any purple tint by using slate and indigo tones */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/90 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 to-transparent" />
                </div>

                {/* Top Branding Content */}
                <div className="relative z-10 flex items-center gap-3 px-12 pt-12">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20 backdrop-blur-md border border-primary/30">
                        <Store className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-2xl font-bold text-white tracking-tight">Soft<span className="text-primary">Shopping</span></span>
                </div>

                {/* Bottom App Info & Features */}
                <div className="relative z-10 px-12 pb-16 space-y-8">
                    <div className="space-y-4">
                        <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
                            Perakendenin <br />
                            <span className="text-primary font-medium tracking-normal">
                                Dijital Dönüşümü
                            </span>
                        </h1>
                        <p className="text-lg text-slate-300 max-w-lg font-light leading-relaxed">
                            SoftShopping ile mağazanızın tüm muhasebe, stok ve kasa süreçlerini tek bir merkezden, bulut hızıyla yönetin.
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-4 max-w-2xl">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                                <Package className="w-4 h-4" />
                            </div>
                            <span className="text-sm text-slate-200 font-medium">Gelişmiş Stok ve Varyant Takibi</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                                <FileText className="w-4 h-4" />
                            </div>
                            <span className="text-sm text-slate-200 font-medium">E-Fatura & E-Arşiv Uyumlu</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                                <MonitorSmartphone className="w-4 h-4" />
                            </div>
                            <span className="text-sm text-slate-200 font-medium">Hızlı Satış (POS) ve Kasa Yönetimi</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                                <Globe className="w-4 h-4" />
                            </div>
                            <span className="text-sm text-slate-200 font-medium">Gelişmiş B2B Çözümleri</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                                <BarChart3 className="w-4 h-4" />
                            </div>
                            <span className="text-sm text-slate-200 font-medium">Kapsamlı Finansal Raporlama</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            </div>
                            <span className="text-sm text-slate-200 font-medium">Tenant Mimarisi ile Tam Güvenlik</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Box: Login Form */}
            <div className="flex flex-col justify-center w-full lg:w-[45%] px-8 sm:px-16 md:px-20 xl:px-24 bg-background">
                {/* Mobile Logo */}
                <div className="flex lg:hidden items-center justify-center gap-3 mb-10 mt-8">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20">
                        <Store className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-2xl font-bold text-foreground tracking-tight">SoftShopping</span>
                </div>

                <div className="w-full max-w-[360px] mx-auto">
                    <div className="text-center lg:text-left mb-10">
                        <h2 className="text-3xl font-bold tracking-tight mb-2">Kurumsal Giriş</h2>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            Satış ve stok yönetimine başlamak için hesap bilgilerinizi giriniz.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-foreground">
                                Kullanıcı Adı
                            </label>
                            <Input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="info@azemyazilim.com"
                                className="h-11 bg-muted/40 border-border/50 focus-visible:ring-primary/20 transition-all font-medium text-sm"
                                autoFocus
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[13px] font-medium text-foreground">
                                    Şifre
                                </label>
                                <a href="#" className="text-[12px] text-primary hover:underline transition-colors focus:outline-none" tabIndex={-1}>
                                    Şifremi unuttum?
                                </a>
                            </div>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="h-11 bg-muted/40 border-border/50 focus-visible:ring-primary/20 transition-all font-medium tracking-widest text-sm"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 text-[13px] font-medium text-destructive bg-destructive/10 rounded-md border border-destructive/20 text-center animate-in fade-in slide-in-from-top-1">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-11 text-base font-medium shadow-md transition-all mt-4"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">Sisteme bağlanılıyor...</span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Giriş Yap <ArrowRight className="w-4 h-4 ml-1" />
                                </span>
                            )}
                        </Button>
                    </form>

                    <div className="mt-14 text-center lg:text-left">
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-medium">
                            © 2026 SoftShopping by AzemYazilim
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

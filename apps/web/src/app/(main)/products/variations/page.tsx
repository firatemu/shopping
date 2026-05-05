'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Layers } from 'lucide-react';
import { ProductManagementPageFrame, productManagementCrumbs } from '@/components/product-management/ProductManagementPageFrame';
import { CatalogPageSection, CatalogStatsRow } from '@/components/product-management/CatalogPageSection';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface VariantRow {
    id: string;
    barcode: string;
    color: string;
    colorCode: string;
    size: string;
    sizeCode: string;
    stockQuantity: number;
    reservedQty: number;
    isActive: boolean;
    product: {
        id: string;
        name: string;
        brand: string | null;
        category: string | null;
    };
}

interface VariantsResponse {
    data: VariantRow[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export default function VariationsManagementPage() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const limit = 25;

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 320);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    const { data, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ['product-variants', page, debouncedSearch, limit],
        queryFn: async () => {
            const res = await api.get<VariantsResponse>('/products/variants', {
                params: {
                    page,
                    limit,
                    search: debouncedSearch.trim() || undefined,
                },
            });
            return res.data;
        },
    });

    const rows = data?.data ?? [];
    const meta = data?.meta;

    return (
        <ProductManagementPageFrame
            title="Varyasyon yönetimi"
            description="Tüm renk ve beden kombinasyonlarını izleyin. Yeni varyasyon eklemek için ürün listesinden ürüne girip «Yeni varyasyon ekle» formunu kullanın."
            breadcrumbs={[productManagementCrumbs.root, { label: 'Varyasyon yönetimi' }]}
        >
            {meta ? (
                <CatalogStatsRow
                    items={[
                        { label: 'Toplam varyasyon', value: meta.total, hint: 'Bu kiracıya ait aktif kayıtlar' },
                        { label: 'Sayfa', value: `${meta.page} / ${Math.max(meta.totalPages, 1)}`, hint: `${meta.limit} kayıt / sayfa` },
                        { label: 'Bu sayfada', value: rows.length, hint: isFetching ? 'Güncelleniyor…' : 'Yüklendi' },
                        {
                            label: 'Durum',
                            value: isError ? 'Hata' : 'Bağlı',
                            hint: isError ? 'API yanıtı alınamadı' : 'Ürün servisi',
                        },
                    ]}
                />
            ) : null}

            <CatalogPageSection
                title="Varyasyon listesi"
                description="Barkod, renk, beden ve ürün adına göre arayın. Satış konsolu barkod okutarak bu kayıtlarla eşleşir."
                badge={
                    <Badge variant="outline" className="text-[10px] font-normal">
                        <Layers className="w-3 h-3 mr-1" strokeWidth={1.5} />
                        Canlı veri
                    </Badge>
                }
                headerRight={
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()}>
                        Yenile
                    </Button>
                }
            >
                {isError ? (
                    <p className="text-sm text-destructive">Varyasyonlar yüklenemedi. Oturum ve API bağlantınızı kontrol edin.</p>
                ) : null}

                <div className="space-y-4">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Ürün, marka, barkod, renk veya beden ara…"
                            className="h-10 pl-10 bg-background"
                        />
                    </div>

                    <div className="rounded-xl border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px]">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        {['Ürün', 'Marka', 'Barkod', 'Renk', 'Beden', 'Kullanılabilir stok', 'Durum'].map((h) => (
                                            <th
                                                key={h}
                                                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        Array.from({ length: 8 }).map((_, i) => (
                                            <tr key={i} className="border-b border-border">
                                                {Array.from({ length: 7 }).map((_, j) => (
                                                    <td key={j} className="px-4 py-3">
                                                        <Skeleton className="h-4 w-full max-w-[140px]" />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-20 text-center">
                                                <Layers className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" strokeWidth={1.5} />
                                                <p className="text-sm text-muted-foreground">Kayıt bulunamadı</p>
                                                <p className="text-xs text-muted-foreground mt-1">Arama kriterlerini sıfırlayın veya yeni ürün ekleyin.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((v) => {
                                            const avail = v.stockQuantity - v.reservedQty;
                                            return (
                                                <tr
                                                    key={v.id}
                                                    className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                                                    onClick={() => router.push(`/products/${v.product.id}`)}
                                                    title="Ürün detayına git — varyasyon ekleyebilirsiniz"
                                                >
                                                    <td className="px-4 py-3 text-[13px] font-medium text-foreground underline-offset-2 hover:underline">
                                                        {v.product.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-[13px] text-muted-foreground">{v.product.brand ?? '—'}</td>
                                                    <td className="px-4 py-3 text-[13px] font-mono tabular-nums">{v.barcode}</td>
                                                    <td className="px-4 py-3 text-[13px]">
                                                        {v.color}
                                                        <span className="ml-1.5 text-xs text-muted-foreground">({v.colorCode})</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-[13px]">
                                                        {v.size}
                                                        <span className="ml-1.5 text-xs text-muted-foreground">({v.sizeCode})</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-[13px] font-mono tabular-nums">
                                                        <span className={avail <= 0 ? 'text-destructive' : 'text-foreground'}>{avail}</span>
                                                        <span className="text-xs text-muted-foreground font-sans font-normal ml-1">
                                                            / {v.stockQuantity}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant={v.isActive ? 'default' : 'secondary'} className="text-[10px]">
                                                            {v.isActive ? 'Aktif' : 'Pasif'}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {meta && meta.totalPages > 1 ? (
                            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 bg-muted/20">
                                <p className="text-xs text-muted-foreground">
                                    Toplam {meta.total} kayıt
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs"
                                        disabled={page <= 1}
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    >
                                        Önceki
                                    </Button>
                                    <span className="text-xs text-muted-foreground px-2">{page} / {meta.totalPages}</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs"
                                        disabled={page >= meta.totalPages}
                                        onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                                    >
                                        Sonraki
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </CatalogPageSection>
        </ProductManagementPageFrame>
    );
}

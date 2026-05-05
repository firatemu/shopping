'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, formatCurrency } from '@/lib/api';
import { useTabStore } from '@/stores/useTabStore';
import { ProductManagementPageFrame, productManagementCrumbs } from '@/components/product-management/ProductManagementPageFrame';

interface ProductVariant {
    id: string;
    barcode: string;
    color: string;
    size: string;
    stockQuantity: number;
    reservedQty: number;
    salePrice: string | number | null;
    costPrice: string | number | null;
}

interface ProductDetail {
    id: string;
    name: string;
    brand: string | null;
    category: string | null;
    subcategory: string | null;
    gender: string | null;
    season: string | null;
    description: string | null;
    costPrice: string | number;
    salePrice: string | number;
    kdvRate: string | number;
    imageUrl: string | null;
    isActive: boolean;
    variants: ProductVariant[];
}

type CatalogColor = { id: string; name: string; code: string; isActive: boolean };
type SizeSetRow = { id: string; name: string; sizes: unknown; isActive: boolean };

function num(v: string | number | null | undefined): number {
    if (v === null || v === undefined) return 0;
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isNaN(n) ? 0 : n;
}

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const id = typeof params.id === 'string' ? params.id : '';
    const addTab = useTabStore((s) => s.addTab);

    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [vColor, setVColor] = useState('');
    const [vColorCode, setVColorCode] = useState('');
    const [vSize, setVSize] = useState('');
    const [vSizeCode, setVSizeCode] = useState('');
    const [vStock, setVStock] = useState('0');
    const [vSalePrice, setVSalePrice] = useState('');
    const [vCostPrice, setVCostPrice] = useState('');
    const [variantSaving, setVariantSaving] = useState(false);
    const [variantFormMsg, setVariantFormMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(
        null,
    );

    const [bulkColorIds, setBulkColorIds] = useState<string[]>([]);
    const [bulkSizeSetId, setBulkSizeSetId] = useState('');
    const [bulkStockBySize, setBulkStockBySize] = useState<Record<string, number>>({});
    const [bulkSaving, setBulkSaving] = useState(false);
    const [bulkMsg, setBulkMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    const { data: catalogColors = [], isLoading: colorsLoading } = useQuery({
        queryKey: ['catalog-colors'],
        queryFn: async () => {
            const res = await api.get<CatalogColor[]>('/catalog/colors');
            return res.data;
        },
    });

    const { data: sizeSets = [], isLoading: sizeSetsLoading } = useQuery({
        queryKey: ['catalog-size-sets'],
        queryFn: async () => {
            const res = await api.get<SizeSetRow[]>('/catalog/size-sets');
            return res.data;
        },
    });

    const selectedSizeLabels = useMemo(() => {
        const ss = sizeSets.find((s) => s.id === bulkSizeSetId);
        if (!ss) return [];
        const raw = ss.sizes;
        if (!Array.isArray(raw)) return [];
        return raw.map((x) => String(x).trim()).filter(Boolean);
    }, [sizeSets, bulkSizeSetId]);

    useEffect(() => {
        if (!bulkSizeSetId) return;
        setBulkStockBySize((prev) => {
            const next = { ...prev };
            for (const s of selectedSizeLabels) {
                if (next[s] === undefined) next[s] = 1;
            }
            // keep other keys (user may switch back and forth)
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bulkSizeSetId, selectedSizeLabels.join('|')]);

    const load = useCallback(async () => {
        if (!id) {
            setError('Geçersiz ürün bağlantısı');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await api.get<ProductDetail>(`/products/${id}`);
            setProduct(res.data);
            addTab({
                title: res.data.name,
                path: `/products/${id}`,
                closable: true,
            });
        } catch (e: unknown) {
            setProduct(null);
            const msg =
                e && typeof e === 'object' && 'response' in e
                    ? (e as { response?: { status?: number; data?: { message?: string } } }).response
                    : undefined;
            if (msg?.status === 404) {
                setError('Ürün bulunamadı veya silinmiş.');
            } else {
                setError(
                    typeof msg?.data?.message === 'string' ? msg.data.message : 'Ürün yüklenemedi',
                );
            }
        } finally {
            setLoading(false);
        }
    }, [id, addTab]);

    useEffect(() => {
        load();
    }, [load]);

    const reloadProductOnly = useCallback(async () => {
        if (!id) return;
        const res = await api.get<ProductDetail>(`/products/${id}`);
        setProduct(res.data);
    }, [id]);

    const handleAddVariant = async (e: React.FormEvent) => {
        e.preventDefault();
        setVariantFormMsg(null);
        const color = vColor.trim();
        const colorCode = vColorCode.trim().toUpperCase().slice(0, 3);
        const size = vSize.trim();
        const sizeCode = vSizeCode.trim().toUpperCase().slice(0, 2);
        const stock = parseInt(vStock, 10);

        if (!color || !colorCode || !size || !sizeCode) {
            setVariantFormMsg({
                type: 'err',
                text: 'Renk, renk kodu (en fazla 3 karakter), beden ve beden kodu (en fazla 2 karakter) zorunludur.',
            });
            return;
        }
        if (Number.isNaN(stock) || stock < 0) {
            setVariantFormMsg({ type: 'err', text: 'Geçerli bir stok miktarı girin.' });
            return;
        }

        const payload: Record<string, unknown> = {
            color,
            colorCode,
            size,
            sizeCode,
            stockQuantity: stock,
        };
        const sp = vSalePrice.trim();
        const cp = vCostPrice.trim();
        if (sp !== '') {
            const n = parseFloat(sp.replace(',', '.'));
            if (Number.isNaN(n) || n < 0) {
                setVariantFormMsg({ type: 'err', text: 'Geçerli bir satış fiyatı girin veya boş bırakın.' });
                return;
            }
            payload.salePrice = n;
        }
        if (cp !== '') {
            const n = parseFloat(cp.replace(',', '.'));
            if (Number.isNaN(n) || n < 0) {
                setVariantFormMsg({ type: 'err', text: 'Geçerli bir maliyet girin veya boş bırakın.' });
                return;
            }
            payload.costPrice = n;
        }

        setVariantSaving(true);
        try {
            await api.post(`/products/${id}/variants`, payload);
            await reloadProductOnly();
            void queryClient.invalidateQueries({ queryKey: ['product-variants'] });
            setVColor('');
            setVColorCode('');
            setVSize('');
            setVSizeCode('');
            setVStock('0');
            setVSalePrice('');
            setVCostPrice('');
            setVariantFormMsg({ type: 'ok', text: 'Varyasyon eklendi. Barkod otomatik üretildi.' });
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
            const m = axiosErr.response?.data?.message;
            const text = Array.isArray(m) ? m.join(', ') : m;
            setVariantFormMsg({
                type: 'err',
                text: typeof text === 'string' ? text : 'Varyasyon eklenemedi',
            });
        } finally {
            setVariantSaving(false);
        }
    };

    const bulkPreviewCount = bulkColorIds.length * selectedSizeLabels.length;

    const handleBulkCreate = async () => {
        setBulkMsg(null);
        if (!bulkColorIds.length) {
            setBulkMsg({ type: 'err', text: 'En az bir renk seçin.' });
            return;
        }
        if (!bulkSizeSetId) {
            setBulkMsg({ type: 'err', text: 'Bir beden seti seçin.' });
            return;
        }
        if (selectedSizeLabels.length === 0) {
            setBulkMsg({ type: 'err', text: 'Seçilen beden seti boş.' });
            return;
        }

        const stockBySize: Record<string, number> = {};
        for (const s of selectedSizeLabels) {
            const v = bulkStockBySize[s];
            const n = Number.isFinite(Number(v)) ? Math.max(0, Math.trunc(Number(v))) : 1;
            stockBySize[s] = n;
        }

        setBulkSaving(true);
        try {
            const res = await api.post<{ created: number; skipped?: Array<{ reason: string }> }>(
                `/products/${id}/variants/bulk`,
                { colorIds: bulkColorIds, sizeSetId: bulkSizeSetId, stockBySize },
            );
            await reloadProductOnly();
            void queryClient.invalidateQueries({ queryKey: ['product-variants'] });

            const created = res.data?.created ?? 0;
            const skipped = res.data?.skipped?.length ?? 0;
            setBulkMsg({
                type: 'ok',
                text:
                    skipped > 0
                        ? `${created} varyasyon oluşturuldu, ${skipped} kombinasyon atlandı.`
                        : `${created} varyasyon oluşturuldu.`,
            });
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
            const m = axiosErr.response?.data?.message;
            const text = Array.isArray(m) ? m.join(', ') : m;
            setBulkMsg({ type: 'err', text: typeof text === 'string' ? text : 'Toplu oluşturma başarısız' });
        } finally {
            setBulkSaving(false);
        }
    };

    return (
        <ProductManagementPageFrame
            title={product?.name ?? 'Ürün detayı'}
            description="Ürün kartı, fiyatlar ve varyasyon (stok) bilgileri."
            breadcrumbs={[
                productManagementCrumbs.root,
                { label: 'Ürün listesi', href: '/products' },
                { label: product?.name ?? 'Detay' },
            ]}
            actions={
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => router.push('/products')}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Listeye dön
                </Button>
            }
        >
            {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Yükleniyor…
                </div>
            )}

            {!loading && error && (
                <div className="rounded-[10px] border border-border bg-card p-10 text-center space-y-3">
                    <Package className="w-10 h-10 mx-auto text-muted-foreground/40" strokeWidth={1.5} />
                    <p className="text-sm text-destructive">{error}</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => router.push('/products')}>
                        Ürün listesine git
                    </Button>
                </div>
            )}

            {!loading && product && (
                <div className="space-y-8 max-w-5xl">
                    <section className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                                    Temel bilgiler
                                </p>
                                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                    {[product.brand, product.category, product.subcategory]
                                        .filter(Boolean)
                                        .join(' · ') || '—'}
                                </div>
                                {product.gender && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Cinsiyet: {product.gender}
                                    </p>
                                )}
                                {product.season && (
                                    <p className="text-xs text-muted-foreground">Sezon: {product.season}</p>
                                )}
                            </div>
                            <Badge variant={product.isActive ? 'default' : 'secondary'}>
                                {product.isActive ? 'Aktif' : 'Pasif'}
                            </Badge>
                        </div>
                        {product.description && (
                            <p className="text-sm text-foreground/90 leading-relaxed border-t border-border pt-3">
                                {product.description}
                            </p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border pt-3">
                            <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                                    Maliyet
                                </p>
                                <p className="font-mono tabular-nums text-sm">{formatCurrency(num(product.costPrice))}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                                    Satış (KDV hariç)
                                </p>
                                <p className="font-mono tabular-nums text-sm font-medium">
                                    {formatCurrency(num(product.salePrice))}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                                    KDV
                                </p>
                                <p className="font-mono tabular-nums text-sm">%{num(product.kdvRate)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                                    Varyasyon
                                </p>
                                <p className="font-mono tabular-nums text-sm">{product.variants.length}</p>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium">Toplu varyasyon (renk × beden)</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Ürün seçiliyken katalog renkleri ve beden seti ile otomatik tüm kombinasyonları
                                    oluşturun. Her beden için stok belirleyin (varsayılan 1).
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label>Beden seti</Label>
                                <select
                                    className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                                    value={bulkSizeSetId}
                                    onChange={(e) => {
                                        setBulkSizeSetId(e.target.value);
                                        setBulkMsg(null);
                                    }}
                                    disabled={sizeSetsLoading}
                                >
                                    <option value="">Beden seti seçin…</option>
                                    {sizeSets
                                        .filter((s) => s.isActive)
                                        .map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Renkler</Label>
                                <div className="rounded-md border border-border bg-muted/20 p-2 max-h-40 overflow-auto">
                                    {colorsLoading ? (
                                        <p className="text-xs text-muted-foreground">Yükleniyor…</p>
                                    ) : catalogColors.filter((c) => c.isActive).length === 0 ? (
                                        <p className="text-xs text-muted-foreground">Katalog renk bulunamadı.</p>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            {catalogColors
                                                .filter((c) => c.isActive)
                                                .map((c) => {
                                                    const checked = bulkColorIds.includes(c.id);
                                                    return (
                                                        <label
                                                            key={c.id}
                                                            className="flex items-center gap-2 text-xs cursor-pointer select-none"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(e) => {
                                                                    setBulkMsg(null);
                                                                    setBulkColorIds((prev) =>
                                                                        e.target.checked
                                                                            ? [...prev, c.id]
                                                                            : prev.filter((x) => x !== c.id),
                                                                    );
                                                                }}
                                                            />
                                                            <span className="truncate">
                                                                {c.name}{' '}
                                                                <span className="text-muted-foreground font-mono">
                                                                    ({c.code})
                                                                </span>
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {selectedSizeLabels.length > 0 && (
                            <div className="rounded-md border border-border overflow-x-auto">
                                <table className="w-full min-w-[520px]">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                                Beden
                                            </th>
                                            <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-32">
                                                Stok
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedSizeLabels.map((s) => (
                                            <tr key={s} className="border-b border-border last:border-0">
                                                <td className="px-3 py-2 text-sm">{s}</td>
                                                <td className="px-3 py-2">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        className="h-8 text-right font-mono text-sm"
                                                        value={bulkStockBySize[s] ?? 1}
                                                        onChange={(e) => {
                                                            setBulkMsg(null);
                                                            const n = parseInt(e.target.value, 10);
                                                            const v = Number.isNaN(n) ? 0 : Math.max(0, n);
                                                            setBulkStockBySize((prev) => ({ ...prev, [s]: v }));
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <p className="text-xs text-muted-foreground">
                                Önizleme: {bulkColorIds.length} renk × {selectedSizeLabels.length} beden ={' '}
                                <span className="font-mono text-foreground">{bulkPreviewCount}</span> varyasyon
                            </p>
                            <Button type="button" size="sm" className="h-8" onClick={() => handleBulkCreate()} disabled={bulkSaving}>
                                {bulkSaving ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                        Oluşturuluyor…
                                    </>
                                ) : (
                                    'Toplu oluştur'
                                )}
                            </Button>
                        </div>

                        {bulkMsg && (
                            <p
                                className={
                                    bulkMsg.type === 'ok'
                                        ? 'text-xs text-green-700 dark:text-green-400'
                                        : 'text-xs text-destructive'
                                }
                                role={bulkMsg.type === 'err' ? 'alert' : undefined}
                            >
                                {bulkMsg.text}
                            </p>
                        )}
                    </section>

                    <section className="rounded-[10px] border border-border bg-card p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium flex items-center gap-2">
                                    <Plus className="w-4 h-4" strokeWidth={1.5} />
                                    Yeni varyasyon ekle
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Renk ve beden tanımlayın; barkod sistem tarafından üretilir. İsteğe bağlı
                                    olarak bu varyasyona özel fiyat girebilirsiniz (boş bırakılırsa ürün fiyatı
                                    kullanılır).
                                </p>
                            </div>
                        </div>
                        <form onSubmit={handleAddVariant} className="space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="nv-color">Renk</Label>
                                    <Input
                                        id="nv-color"
                                        value={vColor}
                                        onChange={(e) => setVColor(e.target.value)}
                                        placeholder="Örn. Siyah"
                                        className="h-9"
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="nv-color-code">Renk kodu (max 3)</Label>
                                    <Input
                                        id="nv-color-code"
                                        value={vColorCode}
                                        onChange={(e) => setVColorCode(e.target.value.toUpperCase())}
                                        placeholder="SYH max 3"
                                        maxLength={3}
                                        className="h-9 font-mono"
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="nv-size">Beden</Label>
                                    <Input
                                        id="nv-size"
                                        value={vSize}
                                        onChange={(e) => setVSize(e.target.value)}
                                        placeholder="Örn. M"
                                        className="h-9"
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="nv-size-code">Beden kodu (max 2)</Label>
                                    <Input
                                        id="nv-size-code"
                                        value={vSizeCode}
                                        onChange={(e) => setVSizeCode(e.target.value.toUpperCase())}
                                        placeholder="M max 2"
                                        maxLength={2}
                                        className="h-9 font-mono"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="nv-stock">Başlangıç stoku</Label>
                                    <Input
                                        id="nv-stock"
                                        type="number"
                                        min={0}
                                        value={vStock}
                                        onChange={(e) => setVStock(e.target.value)}
                                        className="h-9 font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="nv-sale">Satış fiyatı (isteğe bağlı, ₺)</Label>
                                    <Input
                                        id="nv-sale"
                                        inputMode="decimal"
                                        value={vSalePrice}
                                        onChange={(e) => setVSalePrice(e.target.value)}
                                        placeholder="Ürün fiyatı"
                                        className="h-9 font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="nv-cost">Maliyet (isteğe bağlı, ₺)</Label>
                                    <Input
                                        id="nv-cost"
                                        inputMode="decimal"
                                        value={vCostPrice}
                                        onChange={(e) => setVCostPrice(e.target.value)}
                                        placeholder="Ürün maliyeti"
                                        className="h-9 font-mono"
                                    />
                                </div>
                            </div>
                            {variantFormMsg && (
                                <p
                                    className={
                                        variantFormMsg.type === 'ok'
                                            ? 'text-xs text-green-700 dark:text-green-400'
                                            : 'text-xs text-destructive'
                                    }
                                    role={variantFormMsg.type === 'err' ? 'alert' : undefined}
                                >
                                    {variantFormMsg.text}
                                </p>
                            )}
                            <Button type="submit" size="sm" className="h-8" disabled={variantSaving}>
                                {variantSaving ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                        Kaydediliyor…
                                    </>
                                ) : (
                                    'Varyasyonu kaydet'
                                )}
                            </Button>
                        </form>
                    </section>

                    <section className="rounded-[10px] border border-border bg-card overflow-hidden">
                        <div className="px-4 py-3 border-b border-border">
                            <p className="text-sm font-medium">Varyasyonlar ve stok</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Barkod, renk / beden ve mağaza stoğu
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        {['Barkod', 'Renk', 'Beden', 'Stok', 'Rezerve', 'Satış fiyatı'].map((h) => (
                                            <th
                                                key={h}
                                                className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {product.variants.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                                                Bu ürün için varyasyon tanımlı değil.
                                            </td>
                                        </tr>
                                    ) : (
                                        product.variants.map((v) => {
                                            const sale =
                                                v.salePrice != null ? num(v.salePrice) : num(product.salePrice);
                                            return (
                                                <tr key={v.id} className="border-b border-border last:border-0">
                                                    <td className="px-4 py-2.5 font-mono text-xs">{v.barcode}</td>
                                                    <td className="px-4 py-2.5 text-sm">{v.color}</td>
                                                    <td className="px-4 py-2.5 text-sm">{v.size}</td>
                                                    <td className="px-4 py-2.5 font-mono tabular-nums text-sm">
                                                        {v.stockQuantity}
                                                    </td>
                                                    <td className="px-4 py-2.5 font-mono tabular-nums text-sm text-muted-foreground">
                                                        {v.reservedQty}
                                                    </td>
                                                    <td className="px-4 py-2.5 font-mono tabular-nums text-sm">
                                                        {formatCurrency(sale)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            )}
        </ProductManagementPageFrame>
    );
}

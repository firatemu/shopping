'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, apiOrigin, formatCurrency } from '@/lib/api';
import { ProductManagementPageFrame, productManagementCrumbs } from '@/components/product-management/ProductManagementPageFrame';

interface ProductForm {
    name: string;
    brand: string;
    category: string;
    subcategory: string;
    gender: string;
    costPrice: string;
    salePrice: string;
    kdvRate: string;
    supplierCode: string;
    supplierId: string;
    imageUrl: string;
}

interface VariantDraftRow {
    localId: string;
    barcode: string;
    color: string;
    colorCode: string;
    size: string;
    sizeCode: string;
    stockQuantity: string;
}

const GENDERS = ['Erkek', 'Kadın', 'Unisex', 'Çocuk'];
const KDV_RATES = ['0', '10', '20'];

export default function NewProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState<ProductForm>({
        name: '', brand: '', category: '', subcategory: '',
        gender: 'Unisex', costPrice: '', salePrice: '', kdvRate: '0',
        supplierCode: '', supplierId: '',
        imageUrl: '',
    });

    const newVariantRow = (): VariantDraftRow => ({
        localId: typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `v-${Date.now()}-${Math.random()}`,
        barcode: '',
        color: '',
        colorCode: '',
        size: '',
        sizeCode: '',
        stockQuantity: '0',
    });

    const [variantRows, setVariantRows] = useState<VariantDraftRow[]>([]);

    const { data: catalogBrands = [] } = useQuery({
        queryKey: ['catalog-brands'],
        queryFn: async () => {
            const res = await api.get<{ id: string; name: string }[]>('/catalog/brands');
            return res.data;
        },
    });

    const { data: catalogCategories = [] } = useQuery({
        queryKey: ['catalog-categories'],
        queryFn: async () => {
            const res = await api.get<{ id: string; name: string }[]>('/catalog/categories');
            return res.data;
        },
    });

    const [supplierSearch, setSupplierSearch] = useState('');
    const debouncedSupplierSearch = useMemo(() => supplierSearch.trim(), [supplierSearch]);
    const { data: supplierCustomers = [] } = useQuery({
        queryKey: ['customers-suppliers', debouncedSupplierSearch],
        queryFn: async () => {
            const res = await api.get<{ data: Array<{ id: string; name: string; surname?: string | null; companyName?: string | null }> }>(
                '/customers',
                { params: { page: 1, limit: 100, search: debouncedSupplierSearch || undefined } },
            );
            return (res.data?.data ?? []) as Array<{ id: string; name: string; surname?: string | null; companyName?: string | null }>;
        },
    });

    const set = (key: keyof ProductForm, value: string) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    // Kar oranı (maliyet bazlı): (satış - maliyet) / maliyet
    const profitRate = (() => {
        const cost = parseFloat(form.costPrice) || 0;
        const sale = parseFloat(form.salePrice) || 0;
        if (cost <= 0) return 0;
        return ((sale - cost) / cost) * 100;
    })();

    const [profitRateInput, setProfitRateInput] = useState('');

    const priceWithKdv = (() => {
        const sale = parseFloat(form.salePrice) || 0;
        const kdv = parseFloat(form.kdvRate) || 0;
        return sale * (1 + kdv / 100);
    })();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        for (const r of variantRows) {
            const touched =
                r.color.trim() ||
                r.colorCode.trim() ||
                r.size.trim() ||
                r.sizeCode.trim() ||
                (r.stockQuantity !== '' && r.stockQuantity !== '0');
            if (!touched) continue;
            if (!r.color.trim() || !r.colorCode.trim() || !r.size.trim() || !r.sizeCode.trim()) {
                setError(
                    'Varyasyon satırlarında renk, renk kodu, beden ve beden kodunun tamamı dolu olmalı (veya satırı silin).',
                );
                return;
            }
        }

        const variantsPayload = variantRows
            .filter((r) => r.color.trim() && r.colorCode.trim() && r.size.trim() && r.sizeCode.trim())
            .map((r) => ({
                barcode: r.barcode.trim() || undefined,
                color: r.color.trim(),
                colorCode: r.colorCode.trim().toUpperCase().slice(0, 3),
                size: r.size.trim(),
                sizeCode: r.sizeCode.trim().toUpperCase().slice(0, 2),
                stockQuantity: Math.max(0, parseInt(r.stockQuantity, 10) || 0),
            }));

        setLoading(true);
        try {
            const body: Record<string, unknown> = {
                ...form,
                costPrice: parseFloat(form.costPrice),
                salePrice: parseFloat(form.salePrice),
                kdvRate: parseFloat(form.kdvRate),
            };
            if (form.supplierCode.trim()) body.supplierCode = form.supplierCode.trim();
            if (form.supplierId) body.supplierId = form.supplierId;
            if (form.imageUrl) body.imageUrl = form.imageUrl;
            if (variantsPayload.length > 0) {
                body.variants = variantsPayload;
            }
            await api.post('/products', body);
            router.push('/products');
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setError(axiosErr.response?.data?.message ?? 'Ürün oluşturulamadı');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProductManagementPageFrame
            title="Ürün ekleme"
            description="Ürün kartını oluşturun; isteğe bağlı olarak aynı anda renk/beden varyasyonları ve stok ekleyebilirsiniz. Sonradan da ürün detayından varyasyon eklenebilir."
            breadcrumbs={[productManagementCrumbs.root, { label: 'Ürün ekleme' }]}
            actions={
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4" />
                    Geri
                </Button>
            }
        >
        <div className="max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                <datalist id="catalog-brand-suggestions">
                    {catalogBrands.map((b) => (
                        <option key={b.id} value={b.name} />
                    ))}
                </datalist>
                <datalist id="catalog-category-suggestions">
                    {catalogCategories.map((c) => (
                        <option key={c.id} value={c.name} />
                    ))}
                </datalist>
                {/* Basic Info */}
                <section className="space-y-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Temel Bilgiler</p>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Ürün Adı" value={form.name} onChange={(v) => set('name', v)} required />
                        <FormField label="Marka" value={form.brand} onChange={(v) => set('brand', v)} required listId="catalog-brand-suggestions" />
                        <FormField label="Kategori" value={form.category} onChange={(v) => set('category', v)} required listId="catalog-category-suggestions" />
                        <FormField label="Alt Kategori" value={form.subcategory} onChange={(v) => set('subcategory', v)} listId="catalog-category-suggestions" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Cinsiyet</label>
                            <div className="flex gap-1">
                                {GENDERS.map((g) => (
                                    <button
                                        key={g} type="button"
                                        onClick={() => set('gender', g)}
                                        className={`px-3 py-1 text-xs rounded-md border transition-colors ${form.gender === g
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-border text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Image */}
                <section className="space-y-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Ürün görseli</p>
                    <div className="grid grid-cols-2 gap-3 items-start">
                        <div>
                            <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                                Görsel yükle
                            </label>
                            <Input
                                type="file"
                                accept="image/*"
                                className="h-[34px]"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setError('');
                                    setLoading(true);
                                    try {
                                        const fd = new FormData();
                                        fd.append('file', file);
                                        const res = await api.post<{ path: string }>('/products/images/upload', fd, {
                                            headers: { 'Content-Type': 'multipart/form-data' },
                                        });
                                        const p = res.data?.path;
                                        if (p) set('imageUrl', `${apiOrigin}${p}`);
                                    } catch (err: unknown) {
                                        const axiosErr = err as { response?: { data?: { message?: string } } };
                                        setError(axiosErr.response?.data?.message ?? 'Görsel yüklenemedi');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                            />
                            {form.imageUrl ? (
                                <Button type="button" variant="ghost" size="sm" className="px-0 text-xs" onClick={() => set('imageUrl', '')}>
                                    Görseli kaldır
                                </Button>
                            ) : null}
                        </div>
                        <div>
                            <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                                Önizleme
                            </label>
                            <div className="rounded-md border border-border bg-muted/20 w-full aspect-square overflow-hidden flex items-center justify-center">
                                {form.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={form.imageUrl} alt="Ürün görseli" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs text-muted-foreground">Görsel yok</span>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Supplier */}
                <section className="space-y-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tedarikçi</p>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Tedarikçi kodu" value={form.supplierCode} onChange={(v) => set('supplierCode', v)} />
                        <div>
                            <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                                Tedarikçi firma (Cari)
                            </label>
                            <Input
                                value={supplierSearch}
                                onChange={(e) => setSupplierSearch(e.target.value)}
                                placeholder="Cari ara…"
                                className="h-[34px] mb-2"
                            />
                            <select
                                className="w-full h-[34px] rounded-md border border-input bg-transparent px-2 text-[13px]"
                                value={form.supplierId}
                                onChange={(e) => set('supplierId', e.target.value)}
                            >
                                <option value="">Seçiniz…</option>
                                {supplierCustomers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.companyName ? c.companyName : [c.name, c.surname].filter(Boolean).join(' ')}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>

                {/* Pricing */}
                <section className="space-y-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Fiyatlandırma</p>
                    <div className="grid grid-cols-3 gap-3">
                        <FormField label="Maliyet (₺)" value={form.costPrice} onChange={(v) => set('costPrice', v)} type="number" required />
                        <FormField label="Satış Fiyatı (₺)" value={form.salePrice} onChange={(v) => set('salePrice', v)} type="number" required />
                        <div>
                            <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">KDV (%)</label>
                            <div className="flex gap-1">
                                {KDV_RATES.map((r) => (
                                    <button
                                        key={r} type="button"
                                        onClick={() => set('kdvRate', r)}
                                        className={`flex-1 px-2 py-1.5 text-xs rounded-md border transition-colors ${form.kdvRate === r
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-border text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        %{r}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                                Kar oranı (% - maliyet bazlı)
                            </label>
                            <Input
                                value={profitRateInput}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setProfitRateInput(v);
                                    const cost = parseFloat(form.costPrice);
                                    const rate = parseFloat(v.replace(',', '.'));
                                    if (!Number.isFinite(cost) || cost <= 0) return;
                                    if (!Number.isFinite(rate)) return;
                                    const sale = cost * (1 + rate / 100);
                                    set('salePrice', String(Math.round(sale * 100) / 100));
                                }}
                                inputMode="decimal"
                                placeholder="Örn. 30"
                                className="h-[34px] font-mono"
                            />
                            <p className="text-[11px] text-muted-foreground mt-1">
                                Satış = Maliyet × (1 + oran/100)
                            </p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-3 text-xs flex flex-col justify-center">
                            <span className="text-muted-foreground">
                                Hesaplanan kar oranı:{' '}
                                <span className={`font-mono ${profitRate >= 0 ? 'text-success' : 'text-destructive'}`}>
                                    {profitRate.toFixed(1)}%
                                </span>
                            </span>
                            <span className="text-muted-foreground mt-1">
                                KDV Dahil:{' '}
                                <span className="font-mono text-foreground">
                                    {formatCurrency(priceWithKdv)}
                                </span>
                            </span>
                        </div>
                    </div>

                </section>

                {/* Varyasyonlar */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            Varyasyonlar (isteğe bağlı)
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => setVariantRows((rows) => [...rows, newVariantRow()])}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Satır ekle
                        </Button>
                    </div>
                    {variantRows.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                            Henüz satır yok. «Satır ekle» ile renk/beden kombinasyonları tanımlayın veya ürünü
                            kaydedip detay sayfasından varyasyon ekleyin.
                        </p>
                    ) : (
                        <div className="rounded-md border border-border overflow-x-auto">
                            <table className="w-full min-w-[640px] text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40">
                                        <th className="text-left px-2 py-2 text-[10px] uppercase text-muted-foreground font-medium w-40">
                                            Barkod (isteğe bağlı)
                                        </th>
                                        <th className="text-left px-2 py-2 text-[10px] uppercase text-muted-foreground font-medium">
                                            Renk
                                        </th>
                                        <th className="text-left px-2 py-2 text-[10px] uppercase text-muted-foreground font-medium w-24">
                                            Renk kodu
                                        </th>
                                        <th className="text-left px-2 py-2 text-[10px] uppercase text-muted-foreground font-medium">
                                            Beden
                                        </th>
                                        <th className="text-left px-2 py-2 text-[10px] uppercase text-muted-foreground font-medium w-24">
                                            Beden kodu
                                        </th>
                                        <th className="text-left px-2 py-2 text-[10px] uppercase text-muted-foreground font-medium w-20">
                                            Stok
                                        </th>
                                        <th className="w-10 px-1" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {variantRows.map((row, idx) => (
                                        <tr key={row.localId} className="border-b border-border last:border-0">
                                            <td className="p-1.5">
                                                <Input
                                                    value={row.barcode}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setVariantRows((rs) =>
                                                            rs.map((x) =>
                                                                x.localId === row.localId ? { ...x, barcode: v } : x,
                                                            ),
                                                        );
                                                    }}
                                                    className="h-8 text-xs font-mono"
                                                    placeholder="Boşsa sistem üretir"
                                                    maxLength={16}
                                                />
                                            </td>
                                            <td className="p-1.5">
                                                <Input
                                                    value={row.color}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setVariantRows((rs) =>
                                                            rs.map((x) =>
                                                                x.localId === row.localId ? { ...x, color: v } : x,
                                                            ),
                                                        );
                                                    }}
                                                    className="h-8 text-xs"
                                                    placeholder="Siyah"
                                                />
                                            </td>
                                            <td className="p-1.5">
                                                <Input
                                                    value={row.colorCode}
                                                    onChange={(e) => {
                                                        const v = e.target.value.toUpperCase().slice(0, 3);
                                                        setVariantRows((rs) =>
                                                            rs.map((x) =>
                                                                x.localId === row.localId ? { ...x, colorCode: v } : x,
                                                            ),
                                                        );
                                                    }}
                                                    className="h-8 text-xs font-mono"
                                                    placeholder="SYH"
                                                    maxLength={3}
                                                />
                                            </td>
                                            <td className="p-1.5">
                                                <Input
                                                    value={row.size}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setVariantRows((rs) =>
                                                            rs.map((x) =>
                                                                x.localId === row.localId ? { ...x, size: v } : x,
                                                            ),
                                                        );
                                                    }}
                                                    className="h-8 text-xs"
                                                    placeholder="M"
                                                />
                                            </td>
                                            <td className="p-1.5">
                                                <Input
                                                    value={row.sizeCode}
                                                    onChange={(e) => {
                                                        const v = e.target.value.toUpperCase().slice(0, 2);
                                                        setVariantRows((rs) =>
                                                            rs.map((x) =>
                                                                x.localId === row.localId ? { ...x, sizeCode: v } : x,
                                                            ),
                                                        );
                                                    }}
                                                    className="h-8 text-xs font-mono"
                                                    placeholder="M"
                                                    maxLength={2}
                                                />
                                            </td>
                                            <td className="p-1.5">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={row.stockQuantity}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setVariantRows((rs) =>
                                                            rs.map((x) =>
                                                                x.localId === row.localId
                                                                    ? { ...x, stockQuantity: v }
                                                                    : x,
                                                            ),
                                                        );
                                                    }}
                                                    className="h-8 text-xs font-mono"
                                                />
                                            </td>
                                            <td className="p-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    aria-label={`Satır ${idx + 1} sil`}
                                                    onClick={() =>
                                                        setVariantRows((rs) =>
                                                            rs.filter((x) => x.localId !== row.localId),
                                                        )
                                                    }
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => router.back()} className="h-8">İptal</Button>
                    <Button type="submit" disabled={loading} className="h-8 gap-1.5">
                        <Save className="w-4 h-4" />
                        {loading ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                </div>
            </form>
        </div>
        </ProductManagementPageFrame>
    );
}

function FormField({ label, value, onChange, type = 'text', required = false, listId }: {
    label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; listId?: string;
}) {
    return (
        <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">{label}</label>
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                type={type}
                className="h-[34px]"
                required={required}
                list={listId}
            />
        </div>
    );
}

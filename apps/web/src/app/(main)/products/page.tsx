'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency } from '@/lib/api';
import { useTabStore } from '@/stores/useTabStore';
import { ProductManagementPageFrame, productManagementCrumbs } from '@/components/product-management/ProductManagementPageFrame';

interface Product {
    id: string;
    name: string;
    brand: string;
    category: string;
    imageUrl?: string | null;
    salePrice: number;
    costPrice: number;
    kdvRate: number;
    totalStock: number;
    isActive: boolean;
}

interface PaginatedProducts {
    data: Product[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export default function ProductsPage() {
    const router = useRouter();
    const addTab = useTabStore((s) => s.addTab);
    const [products, setProducts] = useState<PaginatedProducts | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/products', { params: { page, limit, search: search || undefined } });
            setProducts(res.data);
        } catch {
            setProducts({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const handleNew = () => {
        addTab({ title: 'Yeni Ürün', path: '/products/new', closable: true });
        router.push('/products/new');
    };

    const handleEdit = (product: Product) => {
        addTab({ title: product.name, path: `/products/${product.id}`, closable: true });
        router.push(`/products/${product.id}`);
    };

    return (
        <ProductManagementPageFrame
            title="Ürün listesi"
            description="Mağazanızdaki tüm ürünleri arayın, durumlarını görün ve detaya geçin. Yeni ürün oluşturmak için sağ üstteki düğmeyi kullanın."
            breadcrumbs={[productManagementCrumbs.root, { label: 'Ürün listesi' }]}
            actions={
                <Button onClick={handleNew} className="h-8 gap-1.5">
                    <Plus className="w-4 h-4" /> Yeni Ürün
                </Button>
            }
        >
            <div className="space-y-4">
            {/* Search */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <Input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Ürün adı, marka veya barkod ara..."
                        className="h-[34px] pl-8"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-[10px] border border-border bg-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            {['Görsel', 'Ürün', 'Marka', 'Kategori', 'Stok', 'Fiyat', 'Durum'].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="border-b border-border">
                                    {Array.from({ length: 7 }).map((_, j) => (
                                        <td key={j} className="px-4 py-2.5">
                                            <Skeleton className="h-4 w-20" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : products?.data.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-16 text-center">
                                    <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                                    <p className="text-sm text-muted-foreground">Ürün bulunamadı</p>
                                </td>
                            </tr>
                        ) : (
                            products?.data.map((product) => (
                                <tr
                                    key={product.id}
                                    onClick={() => handleEdit(product)}
                                    className="border-b border-border cursor-pointer hover:bg-accent/50 transition-colors"
                                >
                                    <td className="px-4 py-2.5">
                                        <div className="w-10 h-10 rounded-md border border-border bg-muted/20 overflow-hidden flex items-center justify-center">
                                            {product.imageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground">—</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-[13px] text-foreground font-medium">{product.name}</td>
                                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{product.brand}</td>
                                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{product.category}</td>
                                    <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-foreground">{product.totalStock}</td>
                                    <td className="px-4 py-2.5 text-[13px] font-mono tabular-nums text-foreground">{formatCurrency(product.salePrice)}</td>
                                    <td className="px-4 py-2.5">
                                        <Badge variant={product.isActive ? 'default' : 'secondary'} className="text-[10px]">
                                            {product.isActive ? 'Aktif' : 'Pasif'}
                                        </Badge>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {products && products.meta.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                            {products.meta.total} üründen {((page - 1) * limit) + 1}–{Math.min(page * limit, products.meta.total)} arası
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost" size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="h-7 text-xs"
                            >
                                Önceki
                            </Button>
                            <span className="text-xs text-muted-foreground px-2">
                                {page} / {products.meta.totalPages}
                            </span>
                            <Button
                                variant="ghost" size="sm"
                                onClick={() => setPage((p) => Math.min(products.meta.totalPages, p + 1))}
                                disabled={page >= products.meta.totalPages}
                                className="h-7 text-xs"
                            >
                                Sonraki
                            </Button>
                        </div>
                    </div>
                )}
            </div>
            </div>
        </ProductManagementPageFrame>
    );
}

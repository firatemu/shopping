'use client';

import { useState } from 'react';
import { Search as SearchIcon, Barcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatCurrency } from '@/lib/api';
import Link from 'next/link';

interface SearchResult {
    productId: string;
    productName: string;
    variantId: string;
    variantDesc?: string;
    barcode: string;
    stockQuantity: number;
    price: number;
    imageUrl?: string;
}

export default function BarcodeSearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/products/barcodes/lookup', { barcode: query.trim() });
            const data = res.data?.data ?? res.data;
            setResults(Array.isArray(data) ? data : data ? [data] : []);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <h1 className="text-lg font-semibold text-foreground">Barkodlu Arama</h1>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1 max-w-md">
                    <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Barkod numarasını girin veya tarayın..."
                        className="h-[34px] pl-8 font-mono"
                        autoFocus
                    />
                </div>
                <Button type="submit" className="h-[34px]" disabled={loading || !query.trim()}>
                    {loading ? 'Aranıyor...' : 'Ara'}
                </Button>
            </form>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {loading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-16 w-full" />))}</div>
            ) : results === null ? (
                <div className="rounded-[10px] border border-dashed border-border bg-card p-8 text-center">
                    <Barcode className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">Barkod girerek ürün arayın.</p>
                </div>
            ) : results.length === 0 ? (
                <div className="rounded-[10px] border border-border bg-card p-8 text-center">
                    <p className="text-sm text-muted-foreground">Bu barkoda ait ürün bulunamadı.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {results.map((r) => (
                        <div key={r.variantId} className="rounded-[10px] border border-border bg-card p-4 flex items-center gap-4">
                            {r.imageUrl && <img src={r.imageUrl} alt={r.productName} className="w-16 h-16 object-contain rounded border border-border" />}
                            <div className="flex-1">
                                <p className="text-[13px] font-medium text-foreground">{r.productName}</p>
                                {r.variantDesc && <p className="text-[11px] text-muted-foreground">{r.variantDesc}</p>}
                                <p className="text-[11px] font-mono text-muted-foreground mt-1">{r.barcode}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[13px] font-mono tabular-nums font-semibold">{formatCurrency(r.price)}</p>
                                <p className={`text-[11px] font-mono ${r.stockQuantity > 0 ? 'text-success' : 'text-destructive'}`}>
                                    Stok: {r.stockQuantity}
                                </p>
                            </div>
                            <Link href={`/products/${r.productId}`}>
                                <Button variant="secondary" size="sm">Detay</Button>
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
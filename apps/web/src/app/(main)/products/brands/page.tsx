'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Award } from 'lucide-react';
import { ProductManagementPageFrame, productManagementCrumbs } from '@/components/product-management/ProductManagementPageFrame';
import { CatalogPageSection, CatalogStatsRow } from '@/components/product-management/CatalogPageSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';

interface ProductBrandDto {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
}

function msgFromAxios(err: unknown): string {
    const e = err as { response?: { data?: { message?: string | string[] } } };
    const m = e.response?.data?.message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string') return m;
    return 'İşlem başarısız';
}

export default function BrandsManagementPage() {
    const qc = useQueryClient();
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<ProductBrandDto | null>(null);
    const [formName, setFormName] = useState('');
    const [formCode, setFormCode] = useState('');

    const { data: items = [], isLoading, isError } = useQuery<ProductBrandDto[]>({
        queryKey: ['catalog-brands'],
        queryFn: async () => {
            const res = await api.get('/catalog/brands');
            return ((res.data as { data?: ProductBrandDto[] })?.data ?? res.data) as ProductBrandDto[];
        },
    });

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (b: ProductBrandDto) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q),
        );
    }, [items, search]);

    const activeCount = useMemo(() => items.filter((b) => b.isActive).length, [items]);

    const createMut = useMutation({
        mutationFn: async (body: { name: string; code: string }) => {
            const res = await api.post('/catalog/brands', body);
            return (res.data as { data?: ProductBrandDto })?.data ?? res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['catalog-brands'] });
            setDialogOpen(false);
        },
    });

    const updateMut = useMutation({
        mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
            const res = await api.put(`/catalog/brands/${id}`, body);
            return (res.data as { data?: ProductBrandDto })?.data ?? res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['catalog-brands'] });
            setDialogOpen(false);
        },
    });

    const deleteMut = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/catalog/brands/${id}`);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-brands'] }),
    });

    const toggleActive = (b: ProductBrandDto) => {
        updateMut.mutate({ id: b.id, body: { isActive: !b.isActive } }, {
            onError: (err) => window.alert(msgFromAxios(err)),
        });
    };

    const openCreate = () => {
        setEditing(null);
        setFormName('');
        setFormCode('');
        setDialogOpen(true);
    };

    const openEdit = (b: ProductBrandDto) => {
        setEditing(b);
        setFormName(b.name);
        setFormCode(b.code);
        setDialogOpen(true);
    };

    const handleSave = () => {
        const name = formName.trim();
        const code = formCode.trim().toUpperCase();
        if (!name || !code) return;
        if (editing) {
            updateMut.mutate({ id: editing.id, body: { name, code } });
        } else {
            createMut.mutate({ name, code });
        }
    };

    const handleDelete = (b: ProductBrandDto) => {
        if (!window.confirm(`“${b.name}” silinsin mi?`)) return;
        deleteMut.mutate(b.id, { onError: (err) => window.alert(msgFromAxios(err)) });
    };

    const mutErr = createMut.error ?? updateMut.error;

    return (
        <ProductManagementPageFrame
            title="Marka yönetimi"
            description="Marka adı ve kodlarını standartlaştırın. Kodlar raporlarda ve entegrasyonlarda kısa anahtar olarak kullanılabilir."
            breadcrumbs={[productManagementCrumbs.root, { label: 'Marka yönetimi' }]}
            actions={
                <Button size="sm" className="h-9 gap-1.5" onClick={openCreate}>
                    <Plus className="w-4 h-4" />
                    Marka ekle
                </Button>
            }
        >
            <CatalogStatsRow
                items={[
                    { label: 'Toplam marka', value: items.length },
                    { label: 'Aktif', value: activeCount },
                    { label: 'Liste filtresi', value: filtered.length, hint: search ? 'Filtre uygulu' : 'Tümü' },
                    { label: 'Durum', value: isError ? 'Hata' : isLoading ? '…' : 'Bağlı' },
                ]}
            />

            <CatalogPageSection
                title="Marka kartları"
                description="Satınalma ve satış fiyatları ürün kartında tutulur; burada yalnızca marka tanımı yönetilir."
                badge={
                    <Badge variant="outline" className="text-[10px] font-normal">
                        <Award className="w-3 h-3 mr-1" strokeWidth={1.5} />
                        Katalog
                    </Badge>
                }
            >
                {isError ? (
                    <p className="text-sm text-destructive mb-4">Markalar yüklenemedi.</p>
                ) : null}
                <div className="space-y-4">
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Marka adı veya kod ara…"
                        className="max-w-md h-10 bg-background"
                    />
                    <div className="rounded-xl border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px]">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        {['Marka', 'Kod', 'Durum', 'İşlemler'].map((h) => (
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
                                        <tr>
                                            <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                                                Yükleniyor…
                                            </td>
                                        </tr>
                                    ) : filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-16 text-center text-sm text-muted-foreground">
                                                Kayıt bulunamadı.
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((b) => (
                                            <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                                                <td className="px-4 py-3 text-[13px] font-medium">{b.name}</td>
                                                <td className="px-4 py-3 text-[13px] font-mono text-muted-foreground">{b.code}</td>
                                                <td className="px-4 py-3">
                                                    <button type="button" onClick={() => toggleActive(b)} className="inline-flex">
                                                        <Badge
                                                            variant={b.isActive ? 'default' : 'secondary'}
                                                            className="text-[10px] cursor-pointer"
                                                        >
                                                            {b.isActive ? 'Aktif' : 'Pasif'}
                                                        </Badge>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-0.5">
                                                        <Button variant="ghost" size="icon-sm" className="h-8 w-8" onClick={() => openEdit(b)}>
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                                            onClick={() => handleDelete(b)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </CatalogPageSection>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Markayı düzenle' : 'Marka ekle'}</DialogTitle>
                        <DialogDescription>Görünen ad ve sistemde tekil kısa kod.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="brand-name">Marka adı</Label>
                            <Input
                                id="brand-name"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                className="bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="brand-code">Kısa kod</Label>
                            <Input
                                id="brand-code"
                                value={formCode}
                                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                                className="bg-background font-mono"
                                maxLength={16}
                            />
                        </div>
                    </div>
                    {mutErr ? <p className="text-xs text-destructive">{msgFromAxios(mutErr)}</p> : null}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Vazgeç
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!formName.trim() || !formCode.trim() || createMut.isPending || updateMut.isPending}
                        >
                            Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ProductManagementPageFrame>
    );
}

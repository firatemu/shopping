'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Palette as PaletteIcon, Ruler } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface ProductColorDto {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
}

interface SizeSetDto {
    id: string;
    name: string;
    sizes: unknown;
    isActive: boolean;
}

function normalizeSizes(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw.map((x) => String(x));
    if (typeof raw === 'string') {
        try {
            const p = JSON.parse(raw);
            return Array.isArray(p) ? p.map((x: unknown) => String(x)) : [];
        } catch {
            return [];
        }
    }
    return [];
}

function msgFromAxios(err: unknown): string {
    const e = err as { response?: { data?: { message?: string | string[] } } };
    const m = e.response?.data?.message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string') return m;
    return 'İşlem başarısız';
}

type TabKey = 'colors' | 'sizes';

export default function ColorSizeManagementPage() {
    const qc = useQueryClient();
    const [tab, setTab] = useState<TabKey>('colors');
    const [search, setSearch] = useState('');

    const [colorDialog, setColorDialog] = useState(false);
    const [editingColor, setEditingColor] = useState<ProductColorDto | null>(null);
    const [colorName, setColorName] = useState('');
    const [colorCode, setColorCode] = useState('');

    const [sizeDialog, setSizeDialog] = useState(false);
    const [editingSizeSet, setEditingSizeSet] = useState<SizeSetDto | null>(null);
    const [sizeSetName, setSizeSetName] = useState('');
    const [sizeListRaw, setSizeListRaw] = useState('');

    const { data: colors = [], isLoading: colorsLoading, isError: colorsError } = useQuery({
        queryKey: ['catalog-colors'],
        queryFn: async () => {
            const res = await api.get<ProductColorDto[]>('/catalog/colors');
            return res.data;
        },
    });

    const { data: sizeSets = [], isLoading: sizesLoading, isError: sizesError } = useQuery({
        queryKey: ['catalog-size-sets'],
        queryFn: async () => {
            const res = await api.get<SizeSetDto[]>('/catalog/size-sets');
            return res.data;
        },
    });

    const filteredColors = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (tab !== 'colors' || !q) return colors;
        return colors.filter(
            (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
        );
    }, [colors, search, tab]);

    const sizeSetsNormalized = useMemo(
        () =>
            sizeSets.map((s) => ({
                ...s,
                sizesList: normalizeSizes(s.sizes),
            })),
        [sizeSets],
    );

    const filteredSizeSets = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (tab !== 'sizes' || !q) return sizeSetsNormalized;
        return sizeSetsNormalized.filter(
            (s) =>
                s.name.toLowerCase().includes(q) ||
                s.sizesList.some((x) => x.toLowerCase().includes(q)),
        );
    }, [sizeSetsNormalized, search, tab]);

    const parseSizes = (raw: string) =>
        raw
            .split(/[,;\n]+/)
            .map((x) => x.trim())
            .filter(Boolean);

    const createColorMut = useMutation({
        mutationFn: async (body: { name: string; code: string }) => {
            const res = await api.post<ProductColorDto>('/catalog/colors', body);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['catalog-colors'] });
            setColorDialog(false);
        },
    });

    const updateColorMut = useMutation({
        mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
            const res = await api.put<ProductColorDto>(`/catalog/colors/${id}`, body);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['catalog-colors'] });
            setColorDialog(false);
        },
    });

    const deleteColorMut = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/catalog/colors/${id}`);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-colors'] }),
    });

    const createSizeMut = useMutation({
        mutationFn: async (body: { name: string; sizes: string[] }) => {
            const res = await api.post<SizeSetDto>('/catalog/size-sets', body);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['catalog-size-sets'] });
            setSizeDialog(false);
        },
    });

    const updateSizeMut = useMutation({
        mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
            const res = await api.put<SizeSetDto>(`/catalog/size-sets/${id}`, body);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['catalog-size-sets'] });
            setSizeDialog(false);
        },
    });

    const deleteSizeMut = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/catalog/size-sets/${id}`);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-size-sets'] }),
    });

    const openColorCreate = () => {
        setEditingColor(null);
        setColorName('');
        setColorCode('');
        setColorDialog(true);
    };

    const openColorEdit = (c: ProductColorDto) => {
        setEditingColor(c);
        setColorName(c.name);
        setColorCode(c.code);
        setColorDialog(true);
    };

    const saveColor = () => {
        const name = colorName.trim();
        const code = colorCode.trim().toUpperCase();
        if (!name || !code) return;
        if (editingColor) {
            updateColorMut.mutate({ id: editingColor.id, body: { name, code } });
        } else {
            createColorMut.mutate({ name, code });
        }
    };

    const openSizeCreate = () => {
        setEditingSizeSet(null);
        setSizeSetName('');
        setSizeListRaw('XS, S, M, L, XL');
        setSizeDialog(true);
    };

    const openSizeEdit = (s: SizeSetDto & { sizesList?: string[] }) => {
        setEditingSizeSet(s);
        setSizeSetName(s.name);
        setSizeListRaw((s.sizesList ?? normalizeSizes(s.sizes)).join(', '));
        setSizeDialog(true);
    };

    const saveSizeSet = () => {
        const name = sizeSetName.trim();
        const sizes = parseSizes(sizeListRaw);
        if (!name || sizes.length === 0) return;
        if (editingSizeSet) {
            updateSizeMut.mutate({ id: editingSizeSet.id, body: { name, sizes } });
        } else {
            createSizeMut.mutate({ name, sizes });
        }
    };

    const colorMutErr = createColorMut.error ?? updateColorMut.error;
    const sizeMutErr = createSizeMut.error ?? updateSizeMut.error;

    return (
        <ProductManagementPageFrame
            title="Renk ve beden yönetimi"
            description="Varyasyon barkodlarında kullanılan renk kodları ile beden setlerini buradan yönetin. Satış ve stokta tutarlılık sağlar."
            breadcrumbs={[productManagementCrumbs.root, { label: 'Renk ve beden' }]}
            actions={
                tab === 'colors' ? (
                    <Button size="sm" className="h-9 gap-1.5" onClick={openColorCreate}>
                        <Plus className="w-4 h-4" />
                        Renk ekle
                    </Button>
                ) : (
                    <Button size="sm" className="h-9 gap-1.5" onClick={openSizeCreate}>
                        <Plus className="w-4 h-4" />
                        Beden seti
                    </Button>
                )
            }
        >
            <CatalogStatsRow
                items={[
                    { label: 'Renk tanımı', value: colors.length },
                    { label: 'Beden seti', value: sizeSets.length },
                    {
                        label: 'Sekme',
                        value: tab === 'colors' ? 'Renkler' : 'Beden',
                        hint: 'Aşağıdan geçiş yapın',
                    },
                    {
                        label: 'Servis',
                        value: colorsError || sizesError ? 'Hata' : 'Bağlı',
                    },
                ]}
            />

            <div className="flex flex-col gap-5">
                <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1 w-fit">
                    <button
                        type="button"
                        onClick={() => {
                            setTab('colors');
                            setSearch('');
                        }}
                        className={cn(
                            'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                            tab === 'colors'
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <PaletteIcon className="w-4 h-4" strokeWidth={1.5} />
                        Renkler
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setTab('sizes');
                            setSearch('');
                        }}
                        className={cn(
                            'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                            tab === 'sizes'
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <Ruler className="w-4 h-4" strokeWidth={1.5} />
                        Beden setleri
                    </button>
                </div>

                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={tab === 'colors' ? 'Renk ara…' : 'Set veya beden ara…'}
                    className="max-w-md h-10 bg-background"
                />

                {tab === 'colors' ? (
                    <CatalogPageSection
                        title="Renk paleti"
                        description="Ürün varyasyonlarında görünen isim ve kısa kod (ör. barkod üretimi)."
                    >
                        <div className="rounded-xl border border-border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[560px]">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            {['Renk', 'Kod', 'Durum', 'İşlemler'].map((h) => (
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
                                        {colorsLoading ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                                                    Yükleniyor…
                                                </td>
                                            </tr>
                                        ) : filteredColors.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-16 text-center text-sm text-muted-foreground">
                                                    Kayıt yok.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredColors.map((c) => (
                                                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                                                    <td className="px-4 py-3 text-[13px] font-medium">{c.name}</td>
                                                    <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{c.code}</td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateColorMut.mutate(
                                                                    { id: c.id, body: { isActive: !c.isActive } },
                                                                    { onError: (e) => window.alert(msgFromAxios(e)) },
                                                                )
                                                            }
                                                            className="inline-flex"
                                                        >
                                                            <Badge
                                                                variant={c.isActive ? 'default' : 'secondary'}
                                                                className="text-[10px] cursor-pointer"
                                                            >
                                                                {c.isActive ? 'Aktif' : 'Pasif'}
                                                            </Badge>
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-0.5">
                                                            <Button variant="ghost" size="icon-sm" className="h-8 w-8" onClick={() => openColorEdit(c)}>
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                                onClick={() => {
                                                                    if (!window.confirm(`“${c.name}” silinsin mi?`)) return;
                                                                    deleteColorMut.mutate(c.id, {
                                                                        onError: (e) => window.alert(msgFromAxios(e)),
                                                                    });
                                                                }}
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
                    </CatalogPageSection>
                ) : (
                    <CatalogPageSection
                        title="Beden setleri"
                        description="Örn. yetişkin üst, çocuk veya ayakkabı ölçü grupları."
                    >
                        <div className="rounded-xl border border-border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px]">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            {['Set adı', 'Bedenler', 'Durum', 'İşlemler'].map((h) => (
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
                                        {sizesLoading ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                                                    Yükleniyor…
                                                </td>
                                            </tr>
                                        ) : filteredSizeSets.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-16 text-center text-sm text-muted-foreground">
                                                    Kayıt yok.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredSizeSets.map((s) => (
                                                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                                                    <td className="px-4 py-3 text-[13px] font-medium">{s.name}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {s.sizesList.map((sz: string) => (
                                                                <Badge key={sz} variant="outline" className="text-[10px] font-mono font-normal">
                                                                    {sz}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateSizeMut.mutate(
                                                                    { id: s.id, body: { isActive: !s.isActive } },
                                                                    { onError: (e) => window.alert(msgFromAxios(e)) },
                                                                )
                                                            }
                                                            className="inline-flex"
                                                        >
                                                            <Badge
                                                                variant={s.isActive ? 'default' : 'secondary'}
                                                                className="text-[10px] cursor-pointer"
                                                            >
                                                                {s.isActive ? 'Aktif' : 'Pasif'}
                                                            </Badge>
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-0.5">
                                                            <Button variant="ghost" size="icon-sm" className="h-8 w-8" onClick={() => openSizeEdit(s)}>
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                                onClick={() => {
                                                                    if (!window.confirm(`“${s.name}” silinsin mi?`)) return;
                                                                    deleteSizeMut.mutate(s.id, {
                                                                        onError: (e) => window.alert(msgFromAxios(e)),
                                                                    });
                                                                }}
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
                    </CatalogPageSection>
                )}
            </div>

            <Dialog open={colorDialog} onOpenChange={setColorDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingColor ? 'Rengi düzenle' : 'Renk ekle'}</DialogTitle>
                        <DialogDescription>Kısa kod benzersiz olmalıdır.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="c-name">Renk adı</Label>
                            <Input id="c-name" value={colorName} onChange={(e) => setColorName(e.target.value)} className="bg-background" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="c-code">Kod</Label>
                            <Input
                                id="c-code"
                                value={colorCode}
                                onChange={(e) => setColorCode(e.target.value.toUpperCase())}
                                className="bg-background font-mono"
                                maxLength={6}
                            />
                        </div>
                    </div>
                    {colorMutErr ? <p className="text-xs text-destructive">{msgFromAxios(colorMutErr)}</p> : null}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setColorDialog(false)}>
                            Vazgeç
                        </Button>
                        <Button
                            onClick={saveColor}
                            disabled={
                                !colorName.trim() || !colorCode.trim() || createColorMut.isPending || updateColorMut.isPending
                            }
                        >
                            Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={sizeDialog} onOpenChange={setSizeDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingSizeSet ? 'Beden setini düzenle' : 'Beden seti ekle'}</DialogTitle>
                        <DialogDescription>Bedenleri virgül veya satır ile ayırın.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="s-name">Set adı</Label>
                            <Input id="s-name" value={sizeSetName} onChange={(e) => setSizeSetName(e.target.value)} className="bg-background" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="s-list">Beden listesi</Label>
                            <textarea
                                id="s-list"
                                value={sizeListRaw}
                                onChange={(e) => setSizeListRaw(e.target.value)}
                                rows={4}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                    </div>
                    {sizeMutErr ? <p className="text-xs text-destructive">{msgFromAxios(sizeMutErr)}</p> : null}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSizeDialog(false)}>
                            Vazgeç
                        </Button>
                        <Button
                            onClick={saveSizeSet}
                            disabled={
                                !sizeSetName.trim() ||
                                parseSizes(sizeListRaw).length === 0 ||
                                createSizeMut.isPending ||
                                updateSizeMut.isPending
                            }
                        >
                            Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ProductManagementPageFrame>
    );
}

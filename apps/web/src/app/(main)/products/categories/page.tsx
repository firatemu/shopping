'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, FolderInput, FolderOpen } from 'lucide-react';
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

interface ProductCategoryDto {
    id: string;
    parentId: string | null;
    name: string;
    sortOrder: number;
    isActive: boolean;
}

function msgFromAxios(err: unknown): string {
    const e = err as { response?: { data?: { message?: string | string[] } } };
    const m = e.response?.data?.message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string') return m;
    return 'İşlem başarısız';
}

export default function CategoriesManagementPage() {
    const qc = useQueryClient();
    const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<ProductCategoryDto | null>(null);
    const [formName, setFormName] = useState('');
    const [formParentId, setFormParentId] = useState<string | null>(null);

    const { data: items = [], isLoading, isError } = useQuery<ProductCategoryDto[]>({
        queryKey: ['catalog-categories'],
        queryFn: async () => {
            const res = await api.get('/catalog/categories');
            return ((res.data as { data?: ProductCategoryDto[] })?.data ?? res.data) as ProductCategoryDto[];
        },
    });

    const roots = useMemo(
        () => items.filter((c: ProductCategoryDto) => c.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
        [items],
    );

    const childrenOfSelected = useMemo(() => {
        if (selectedParentId === null) return [];
        return items
            .filter((c) => c.parentId === selectedParentId)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    }, [items, selectedParentId]);

    const descendantIds = useMemo(() => {
        const byParent = new Map<string | null, ProductCategoryDto[]>();
        for (const c of items) {
            const k = c.parentId;
            if (!byParent.has(k)) byParent.set(k, []);
            byParent.get(k)!.push(c);
        }
        const collect = (id: string): Set<string> => {
            const s = new Set<string>();
            const stack = [...(byParent.get(id) ?? [])];
            while (stack.length) {
                const n = stack.pop()!;
                s.add(n.id);
                stack.push(...(byParent.get(n.id) ?? []));
            }
            return s;
        };
        return (id: string) => collect(id);
    }, [items]);

    const createMut = useMutation({
        mutationFn: async (body: { name: string; parentId: string | null }) => {
            const res = await api.post('/catalog/categories', body);
            return (res.data as { data?: ProductCategoryDto })?.data ?? res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['catalog-categories'] });
            setDialogOpen(false);
        },
    });

    const updateMut = useMutation({
        mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
            const res = await api.put(`/catalog/categories/${id}`, body);
            return (res.data as { data?: ProductCategoryDto })?.data ?? res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['catalog-categories'] });
            setDialogOpen(false);
        },
    });

    const deleteMut = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/catalog/categories/${id}`);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['catalog-categories'] });
        },
    });

    const openCreate = (parentId: string | null) => {
        setEditing(null);
        setFormName('');
        setFormParentId(parentId);
        setDialogOpen(true);
    };

    const openEdit = (c: ProductCategoryDto) => {
        setEditing(c);
        setFormName(c.name);
        setFormParentId(c.parentId);
        setDialogOpen(true);
    };

    const handleSave = () => {
        const name = formName.trim();
        if (!name) return;
        if (editing) {
            updateMut.mutate({
                id: editing.id,
                body: {
                    name,
                    parentId: formParentId,
                },
            });
        } else {
            createMut.mutate({ name, parentId: formParentId ?? null });
        }
    };

    const handleDelete = (c: ProductCategoryDto) => {
        if (!window.confirm(`“${c.name}” silinsin mi?`)) return;
        deleteMut.mutate(c.id, {
            onError: (err) => window.alert(msgFromAxios(err)),
        });
    };

    const blockedParentIds = editing ? new Set([editing.id, ...descendantIds(editing.id)]) : new Set<string>();

    const parentOptionsForEdit = items.filter((c) => !blockedParentIds.has(c.id));

    return (
        <ProductManagementPageFrame
            title="Kategori yönetimi"
            description="Üst ve alt kategori hiyerarşisini mağaza operasyonunuza göre düzenleyin. Ürün kartlarındaki kategori metinleri ile tutarlılık için aynı isimleri kullanmanız önerilir."
            breadcrumbs={[productManagementCrumbs.root, { label: 'Kategori yönetimi' }]}
            actions={
                <Button size="sm" className="h-9 gap-1.5" onClick={() => openCreate(null)}>
                    <Plus className="w-4 h-4" />
                    Üst kategori
                </Button>
            }
        >
            <CatalogStatsRow
                items={[
                    { label: 'Toplam kategori', value: items.length, hint: 'Tüm seviyeler' },
                    { label: 'Üst kategori', value: roots.length, hint: 'Kök düzey' },
                    {
                        label: 'Yükleme',
                        value: isLoading ? '…' : isError ? 'Hata' : 'Tamam',
                        hint: isError ? 'API sorunu' : 'Katalog servisi',
                    },
                    {
                        label: 'Seçili üst',
                        value: selectedParentId
                            ? (items.find((x) => x.id === selectedParentId)?.name ?? '—')
                            : '—',
                        hint: 'Alt liste için seçim',
                    },
                ]}
            />

            <div className="grid gap-6 lg:grid-cols-2">
                <CatalogPageSection
                    title="Üst kategoriler"
                    description="Mağaza ana grupları (ör. Giyim, Aksesuar)."
                    badge={
                        <Badge variant="secondary" className="text-[10px]">
                            {roots.length} kayıt
                        </Badge>
                    }
                >
                    {isError ? (
                        <p className="text-sm text-destructive">Kategoriler yüklenemedi.</p>
                    ) : isLoading ? (
                        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
                    ) : roots.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-10">Henüz üst kategori yok.</p>
                    ) : (
                        <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                            {roots.map((c) => {
                                const childCount = items.filter((x) => x.parentId === c.id).length;
                                const selected = selectedParentId === c.id;
                                return (
                                    <li key={c.id}>
                                        <div
                                            className={cn(
                                                'flex items-center gap-2 px-3 py-3 transition-colors',
                                                selected ? 'bg-primary/8' : 'hover:bg-muted/40',
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setSelectedParentId(c.id)}
                                                className="flex flex-1 min-w-0 items-center gap-3 text-left"
                                            >
                                                <FolderOpen className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                                                <span className="font-medium text-sm truncate">{c.name}</span>
                                                <span className="text-xs text-muted-foreground tabular-nums">{childCount} alt</span>
                                            </button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                className="h-8 w-8 shrink-0"
                                                onClick={() => openEdit(c)}
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(c)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CatalogPageSection>

                <CatalogPageSection
                    title="Alt kategoriler"
                    description="Seçili üst kategoriye bağlı alt gruplar."
                    headerRight={
                        selectedParentId ? (
                            <Button size="sm" variant="secondary" className="h-8 gap-1" onClick={() => openCreate(selectedParentId)}>
                                <Plus className="w-4 h-4" />
                                Alt kategori
                            </Button>
                        ) : null
                    }
                >
                    {!selectedParentId ? (
                        <div className="flex flex-col items-center justify-center py-14 text-center text-sm text-muted-foreground gap-2">
                            <FolderInput className="w-10 h-10 opacity-25" strokeWidth={1.5} />
                            <p>Soldan bir üst kategori seçin</p>
                        </div>
                    ) : childrenOfSelected.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-10">Bu grup için alt kategori yok.</p>
                    ) : (
                        <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                            {childrenOfSelected.map((c) => (
                                <li key={c.id} className="flex items-center gap-2 px-3 py-3 hover:bg-muted/40 transition-colors">
                                    <span className="flex-1 font-medium text-sm">{c.name}</span>
                                    <Badge variant={c.isActive ? 'outline' : 'secondary'} className="text-[10px]">
                                        {c.isActive ? 'Aktif' : 'Pasif'}
                                    </Badge>
                                    <Button type="button" variant="ghost" size="icon-sm" className="h-8 w-8" onClick={() => openEdit(c)}>
                                        <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => handleDelete(c)}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </CatalogPageSection>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Kategoriyi düzenle' : 'Kategori ekle'}</DialogTitle>
                        <DialogDescription>
                            {editing
                                ? 'Adı ve isteğe bağlı olarak üst kategoriyi güncelleyin.'
                                : formParentId
                                    ? 'Seçili üst kategoriye bağlı yeni alt kategori.'
                                    : 'Kök düzey üst kategori oluşturulur.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="cat-name">Kategori adı</Label>
                            <Input
                                id="cat-name"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="Örn. Üst Giyim"
                                className="bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cat-parent">Üst kategori</Label>
                            {!editing && formParentId !== null ? (
                                <p className="text-sm rounded-md border border-border bg-muted/40 px-3 py-2.5">
                                    Üst grup:{' '}
                                    <span className="font-medium text-foreground">
                                        {items.find((i) => i.id === formParentId)?.name ?? '—'}
                                    </span>
                                </p>
                            ) : (
                                <select
                                    id="cat-parent"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={formParentId ?? ''}
                                    onChange={(e) => setFormParentId(e.target.value === '' ? null : e.target.value)}
                                >
                                    <option value="">(Kök — üst kategori)</option>
                                    {(editing ? parentOptionsForEdit : items).map((o) => (
                                        <option key={o.id} value={o.id}>
                                            {o.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                    {(createMut.error || updateMut.error) && (
                        <p className="text-xs text-destructive">
                            {msgFromAxios(createMut.error ?? updateMut.error)}
                        </p>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Vazgeç
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!formName.trim() || createMut.isPending || updateMut.isPending}
                        >
                            Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ProductManagementPageFrame>
    );
}

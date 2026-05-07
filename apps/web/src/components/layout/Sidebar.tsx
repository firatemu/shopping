'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    Wallet,
    BarChart3,
    Receipt,
    Tag,
    Settings,
    ChevronLeft,
    ChevronRight,
    Store,
    ChevronDown,
    ListOrdered,
    PlusCircle,
    Layers,
    FolderTree,
    Award,
    Palette,
    Boxes,
    Gift,
    Printer,
    Landmark,
    PieChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTabStore } from '@/stores/useTabStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const PRODUCT_STATIC_SEGMENTS = new Set(['new', 'variations', 'categories', 'brands', 'attributes', 'label-designer']);

function isProductListOrDetail(pathname: string): boolean {
    if (pathname === '/products') return true;
    const m = pathname.match(/^\/products\/([^/]+)/);
    if (!m) return false;
    const seg = m[1];
    if (PRODUCT_STATIC_SEGMENTS.has(seg)) return false;
    return true;
}

function isUnderProductManagement(pathname: string): boolean {
    return pathname === '/products' || pathname.startsWith('/products/');
}

const productManagementItems = [
    { title: 'Ürün listesi', path: '/products', icon: ListOrdered, isActive: isProductListOrDetail },
    { title: 'Ürün ekleme', path: '/products/new', icon: PlusCircle, isActive: (p: string) => p === '/products/new' },
    { title: 'Varyasyon yönetimi', path: '/products/variations', icon: Layers, isActive: (p: string) => p === '/products/variations' },
    { title: 'Kategori yönetimi', path: '/products/categories', icon: FolderTree, isActive: (p: string) => p === '/products/categories' },
    { title: 'Marka yönetimi', path: '/products/brands', icon: Award, isActive: (p: string) => p === '/products/brands' },
    { title: 'Renk ve beden', path: '/products/attributes', icon: Palette, isActive: (p: string) => p === '/products/attributes' },
    { title: 'Etiket tasarım', path: '/products/label-designer', icon: Printer, isActive: (p: string) => p === '/products/label-designer' },
] as const;

const menuSections = [
    {
        label: 'Ana Menü',
        items: [
            { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { title: 'Satış Konsolu', path: '/pos', icon: ShoppingCart },
        ],
    },
    {
        label: 'Yönetim',
        items: [
            { title: 'Müşteriler', path: '/customers', icon: Users },
            { title: 'Hediye çekleri', path: '/gift-vouchers', icon: Gift },
            { title: 'Envanter', path: '/inventory', icon: Boxes },
            { title: 'Kampanyalar', path: '/campaigns', icon: Tag },
        ],
    },
    {
        label: 'Finans',
        items: [
            { title: 'Ödeme & tahsilat', path: '/finance/operations', icon: Receipt },
            { title: 'Banka hesapları', path: '/finance/bank-accounts', icon: Landmark },
            { title: 'Kasa', path: '/cash-register', icon: Wallet },
            { title: 'Gelir & Gider', path: '/expenses', icon: PieChart },
            { title: 'Raporlar', path: '/reports', icon: BarChart3 },
        ],
    },
    {
        label: 'Sistem',
        items: [
            { title: 'Ayarlar', path: '/settings', icon: Settings },
        ],
    },
];

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const [productOpen, setProductOpen] = useState(true);
    const pathname = usePathname();
    const addTab = useTabStore((s) => s.addTab);

    const handleNav = (title: string, path: string) => {
        addTab({ title, path, closable: true });
    };

    const renderProductManagement = () => {
        const groupActive = isUnderProductManagement(pathname);

        if (collapsed) {
            const link = (
                <Link
                    href="/products"
                    onClick={() => handleNav('Ürün listesi', '/products')}
                    className={cn(
                        'flex items-center justify-center px-2 py-1.5 rounded-md text-sm transition-colors',
                        groupActive
                            ? 'bg-primary/10 text-primary border-l-4 border-primary font-medium'
                            : 'text-slate-800 dark:text-slate-200 font-medium hover:bg-primary/10 hover:text-primary hover:translate-x-1 transition-all duration-300',
                    )}
                >
                    <Package className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                </Link>
            );
            return (
                <Tooltip key="product-mgmt">
                    <TooltipTrigger>{link}</TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[220px]">
                        <p className="font-medium mb-1">Ürün yönetimi</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                            {productManagementItems.map((it) => (
                                <li key={it.path}>• {it.title}</li>
                            ))}
                        </ul>
                    </TooltipContent>
                </Tooltip>
            );
        }

        return (
            <div className="space-y-0.5">
                <button
                    type="button"
                    onClick={() => setProductOpen((o) => !o)}
                    className={cn(
                        'flex w-full items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                        groupActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-slate-800 dark:text-slate-200 font-medium hover:bg-primary/10 hover:text-primary hover:translate-x-1 transition-all duration-300',
                    )}
                >
                    <Package className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span className="flex-1 text-left truncate font-medium">Ürün yönetimi</span>
                    <ChevronDown
                        className={cn('w-4 h-4 shrink-0 transition-transform opacity-70', productOpen ? 'rotate-0' : '-rotate-90')}
                        strokeWidth={1.5}
                    />
                </button>
                {productOpen && (
                    <div className="ml-1.5 pl-2.5 border-l border-sidebar-border space-y-0.5 py-0.5">
                        {productManagementItems.map((item) => {
                            const active = item.isActive(pathname);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    onClick={() => handleNav(item.title, item.path)}
                                    className={cn(
                                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                                        active
                                            ? 'bg-primary/10 text-primary border-l-[3px] border-primary -ml-px pl-[7px] font-medium'
                                            : 'text-slate-800 dark:text-slate-300 font-medium hover:bg-primary/10 hover:text-primary hover:translate-x-1 transition-all duration-300',
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" strokeWidth={1.5} />
                                    <span className="truncate">{item.title}</span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <aside
            className={cn(
                'flex flex-col h-screen border-r border-r-primary/10 bg-sidebar/95 backdrop-blur shadow-[2px_0_8px_rgba(0,0,0,0.02)] transition-all duration-200',
                collapsed ? 'w-14' : 'w-60',
            )}
        >
            <div className="flex items-center h-12 px-3 border-b border-border">
                <Store className="w-5 h-5 text-primary shrink-0" />
                {!collapsed && (
                    <span className="ml-2 text-sm font-bold text-primary truncate tracking-tight">SoftShopping</span>
                )}
                <button
                    type="button"
                    onClick={() => setCollapsed(!collapsed)}
                    className="ml-auto p-1 rounded hover:bg-accent text-muted-foreground"
                    aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>


            <nav className="flex-1 overflow-y-auto py-2 px-2">
                <div className="mb-3">
                    {!collapsed && (
                        <p className="px-2 mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            Ana Menü
                        </p>
                    )}
                    {menuSections[0].items.map((item) => {
                        const isActive = pathname === item.path;
                        const Icon = item.icon;
                        const link = (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => handleNav(item.title, item.path)}
                                className={cn(
                                    'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                                    isActive
                                        ? 'bg-primary/10 text-primary border-l-[3px] border-primary font-medium'
                                        : 'text-slate-800 dark:text-slate-200 font-medium hover:bg-primary/10 hover:text-primary hover:translate-x-1 transition-all duration-300',
                                )}
                            >
                                <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                                {!collapsed && <span className="truncate">{item.title}</span>}
                            </Link>
                        );
                        if (collapsed) {
                            return (
                                <Tooltip key={item.path}>
                                    <TooltipTrigger>{link}</TooltipTrigger>
                                    <TooltipContent side="right">{item.title}</TooltipContent>
                                </Tooltip>
                            );
                        }
                        return link;
                    })}
                </div>


                <div className="mb-3">
                    {!collapsed && (
                        <p className="px-2 mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            Yönetim
                        </p>
                    )}
                    {renderProductManagement()}
                    {menuSections[1].items.map((item) => {
                        const isActive = pathname === item.path;
                        const Icon = item.icon;
                        const link = (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => handleNav(item.title, item.path)}
                                className={cn(
                                    'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                                    isActive
                                        ? 'bg-primary/10 text-primary border-l-[3px] border-primary font-medium'
                                        : 'text-slate-800 dark:text-slate-200 font-medium hover:bg-primary/10 hover:text-primary hover:translate-x-1 transition-all duration-300',
                                )}
                            >
                                <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                                {!collapsed && <span className="truncate">{item.title}</span>}
                            </Link>
                        );
                        if (collapsed) {
                            return (
                                <Tooltip key={item.path}>
                                    <TooltipTrigger>{link}</TooltipTrigger>
                                    <TooltipContent side="right">{item.title}</TooltipContent>
                                </Tooltip>
                            );
                        }
                        return link;
                    })}
                </div>

                {menuSections.slice(2).map((section) => (
                    <div key={section.label} className="mb-3">
                        {!collapsed && (
                            <p className="px-2 mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                {section.label}
                            </p>
                        )}
                        {section.items.map((item) => {
                            const isActive = pathname === item.path;
                            const Icon = item.icon;
                            const link = (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    onClick={() => handleNav(item.title, item.path)}
                                    className={cn(
                                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                                        isActive
                                            ? 'bg-primary/10 text-primary border-l-[3px] border-primary font-medium'
                                            : 'text-slate-800 dark:text-slate-200 font-medium hover:bg-primary/10 hover:text-primary hover:translate-x-1 transition-all duration-300',
                                    )}
                                >
                                    <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                                    {!collapsed && <span className="truncate">{item.title}</span>}
                                </Link>
                            );

                            if (collapsed) {
                                return (
                                    <Tooltip key={item.path}>
                                        <TooltipTrigger>{link}</TooltipTrigger>
                                        <TooltipContent side="right">{item.title}</TooltipContent>
                                    </Tooltip>
                                );
                            }
                            return link;
                        })}
                    </div>
                ))}
            </nav>
        </aside>
    );
}

'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProductCrumb = { label: string; href?: string };

export function ProductManagementPageFrame({
    title,
    description,
    breadcrumbs,
    children,
    actions,
    className,
}: {
    title: string;
    description?: string;
    breadcrumbs: ProductCrumb[];
    children: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('min-h-full bg-[color-mix(in_oklab,var(--muted)_35%,transparent)]', className)}>
            <div className="border-b border-border bg-card/90 backdrop-blur-sm supports-backdrop-filter:bg-card/75">
                <div className="px-6 py-5 max-w-[1600px] mx-auto w-full">
                    <nav aria-label="Sayfa konumu" className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-muted-foreground mb-3">
                        {breadcrumbs.map((c, i) => (
                            <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1">
                                {i > 0 && (
                                    <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" aria-hidden />
                                )}
                                {c.href ? (
                                    <Link
                                        href={c.href}
                                        className="hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        {c.label}
                                    </Link>
                                ) : (
                                    <span className="text-foreground font-medium">{c.label}</span>
                                )}
                            </span>
                        ))}
                    </nav>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0 space-y-1.5">
                            <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
                            {description ? (
                                <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">{description}</p>
                            ) : null}
                        </div>
                        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
                    </div>
                </div>
            </div>
            <div className="px-6 py-6 max-w-[1600px] mx-auto w-full">{children}</div>
        </div>
    );
}

export const productManagementCrumbs = {
    root: { label: 'Ürün yönetimi', href: '/products' as const },
};

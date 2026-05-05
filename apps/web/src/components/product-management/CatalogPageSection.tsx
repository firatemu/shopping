import { cn } from '@/lib/utils';

export function CatalogPageSection({
    title,
    description,
    badge,
    children,
    className,
    headerRight,
}: {
    title: string;
    description?: string;
    badge?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    headerRight?: React.ReactNode;
}) {
    return (
        <section
            className={cn(
                'rounded-2xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden',
                className,
            )}
        >
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-gradient-to-r from-muted/60 to-transparent px-5 py-4">
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
                        {badge}
                    </div>
                    {description ? (
                        <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">{description}</p>
                    ) : null}
                </div>
                {headerRight}
            </header>
            <div className="p-5">{children}</div>
        </section>
    );
}

export function CatalogStatsRow({ items }: { items: { label: string; value: string | number; hint?: string }[] }) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {items.map((it) => (
                <div
                    key={it.label}
                    className="rounded-xl border border-border bg-card/80 px-4 py-3 shadow-sm"
                >
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{it.label}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{it.value}</p>
                    {it.hint ? <p className="text-[11px] text-muted-foreground mt-0.5">{it.hint}</p> : null}
                </div>
            ))}
        </div>
    );
}

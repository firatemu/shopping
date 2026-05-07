'use client';

import { Bell, Search, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const logoutStore = useAuthStore((s) => s.logout);

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            /* revoke may fail offline or with expired token; still exit locally */
        }
        logoutStore();
        queryClient.clear();
        router.replace('/login');
    };

    const initials = user
        ? `${user.firstName[0]}${user.lastName[0]}`
        : 'TP';

    return (
        <header className="flex items-center justify-between h-12 px-4 border-b border-b-primary/20 bg-background shadow-sm">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-primary font-bold tracking-tight">SoftShopping</span>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-1">
                <ThemeToggle />

                {/* Search */}
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors">
                    <Search className="w-4 h-4" strokeWidth={1.5} />
                    <span className="hidden sm:inline">Ara...</span>
                    <kbd className="hidden sm:inline-flex h-5 items-center px-1.5 rounded border border-border text-[10px] text-muted-foreground">
                        ⌘K
                    </kbd>
                </button>

                {/* Notifications */}
                <button className="relative p-2 rounded-md text-muted-foreground hover:bg-accent transition-colors">
                    <Bell className="w-4 h-4" strokeWidth={1.5} />
                </button>

                {/* User */}
                <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-2 p-1 rounded-md hover:bg-accent transition-colors">
                        <Avatar className="w-7 h-7">
                            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        {user && (
                            <>
                                <div className="px-2 py-1.5">
                                    <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        <DropdownMenuItem>
                            <User className="w-4 h-4 mr-2" /> Profil
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => void handleLogout()}
                            className="text-destructive"
                        >
                            Çıkış Yap
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

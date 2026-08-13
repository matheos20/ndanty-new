'use client';

// components/admin/AdminNotifications.tsx
// Source unique des pastilles du back-office : la barre latérale et la cloche de
// la topbar lisent le même état, donc elles ne peuvent pas se contredire.
//
// Rafraîchissement : à chaque navigation, au retour sur l'onglet, et toutes les
// 60 secondes — mais jamais quand l'onglet est en arrière-plan (pas de requête
// inutile sur un écran que personne ne regarde).

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export interface AdminNotificationCounts {
    orders: number;
    quotes: number;
    reviews: number;
    total: number;
}

const EMPTY: AdminNotificationCounts = { orders: 0, quotes: 0, reviews: 0, total: 0 };
const POLL_INTERVAL_MS = 60_000;

interface NotificationsContextValue {
    counts: AdminNotificationCounts;
    /** À appeler après une action qui vide une file (ouverture d'une commande, réponse à un avis…). */
    refresh: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue>({ counts: EMPTY, refresh: () => {} });

export function useAdminNotifications(): NotificationsContextValue {
    return useContext(NotificationsContext);
}

export function AdminNotificationsProvider({ children }: { children: React.ReactNode }) {
    const [counts, setCounts] = useState<AdminNotificationCounts>(EMPTY);
    const pathname = usePathname();

    const load = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/notifications', { cache: 'no-store' });
            if (!response.ok) return; // session expirée ou erreur serveur : on garde l'affichage précédent
            setCounts(await response.json());
        } catch {
            // Un compteur indisponible ne doit jamais casser l'écran d'administration.
        }
    }, []);

    // Au montage et à chaque changement de page du back-office.
    useEffect(() => {
        load();
    }, [load, pathname]);

    useEffect(() => {
        const timer = setInterval(() => {
            if (!document.hidden) load();
        }, POLL_INTERVAL_MS);

        const onVisible = () => {
            if (!document.hidden) load();
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);

        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, [load]);

    return (
        <NotificationsContext.Provider value={{ counts, refresh: load }}>
            {children}
        </NotificationsContext.Provider>
    );
}

/**
 * Pastille de comptage. Au-delà de 99 on affiche « 99+ » : le nombre exact
 * n'apporte plus rien et la pastille resterait lisible.
 */
export function NotificationBadge({
    count,
    variant = 'accent',
}: {
    count: number;
    /** `accent` : vert Ndanty sur fond clair ou sombre. `inverse` : pastille blanche sur un fond déjà vert. */
    variant?: 'accent' | 'inverse';
}) {
    if (count <= 0) return null;

    return (
        <span
            aria-label={`${count} élément(s) en attente`}
            className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black tabular-nums ${
                variant === 'inverse' ? 'bg-white text-[#28a745]' : 'bg-[#28a745] text-white'
            }`}
        >
            {count > 99 ? '99+' : count}
        </span>
    );
}

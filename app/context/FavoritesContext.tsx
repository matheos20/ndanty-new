// app/context/FavoritesContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface FavoritesContextType {
    favorites: any[];
    toggleFavorite: (productId: number) => Promise<void>;
    isFavorite: (productId: number) => boolean;
    loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [favorites, setFavorites] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Charger les favoris depuis l'API dès que l'utilisateur est connecté
    const fetchFavorites = async () => {
        if (!session) {
            setFavorites([]);
            setLoading(false);
            return;
        }
        try {
            const res = await fetch('/api/favorites');
            if (res.ok) {
                const data = await res.json();
                setFavorites(data);
            }
        } catch (error) {
            console.error("Erreur chargement favoris :", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFavorites();
    }, [session]);

    // Ajouter ou Retirer un favori de manière dynamique et optimiste
    const toggleFavorite = async (productId: number) => {
        if (!session) {
            alert("🔑 Veuillez vous connecter à votre Espace Client Ndanty pour sauvegarder vos favoris !");
            return;
        }

        const exists = favorites.some(item => item.id === productId);

        if (exists) {
            // Désélection optimiste côté client (immédiat pour l'utilisateur)
            setFavorites(prev => prev.filter(item => item.id !== productId));

            try {
                await fetch('/api/favorites', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId }),
                });
            } catch (error) {
                console.error(error);
                fetchFavorites(); // En cas d'échec réseau, on remet l'état réel
            }
        } else {
            // Sélection optimiste temporaire
            setFavorites(prev => [...prev, { id: productId }]);

            try {
                const res = await fetch('/api/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId }),
                });
                if (!res.ok) throw new Error();
                fetchFavorites(); // On rafraîchit pour avoir l'objet produit complet
            } catch (error) {
                console.error(error);
                fetchFavorites(); // Annulation en cas d'erreur
            }
        }
    };

    const isFavorite = (productId: number) => {
        return favorites.some(item => item.id === productId);
    };

    return (
        <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, loading }}>
            {children}
        </FavoritesContext.Provider>
    );
}

export function useFavorites() {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error("useFavorites doit être utilisé à l'intérieur de FavoritesProvider");
    }
    return context;
}
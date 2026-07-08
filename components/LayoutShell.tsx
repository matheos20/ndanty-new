'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Providers from '@/components/Providers';
import { CartProvider } from '@/app/context/CartContext';
import { FavoritesProvider } from '@/app/context/FavoritesContext';

/**
 * Coquille cliente : gère l'affichage conditionnel de la navbar/footer selon la route.
 * Extraite du RootLayout pour que celui-ci reste un Server Component (nécessaire à l'API metadata / SEO).
 */
export default function LayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAdminRoute = pathname?.startsWith('/admin');

    return (
        <Providers>
            <CartProvider>
                <FavoritesProvider>
                    {isAdminRoute ? (
                        <div className="min-h-screen bg-gray-50 flex">
                            <div className="flex-1 flex flex-col">
                                <main className="flex-1">{children}</main>
                            </div>
                        </div>
                    ) : (
                        <>
                            <Navbar />
                            <main>{children}</main>
                            <Footer />
                        </>
                    )}
                </FavoritesProvider>
            </CartProvider>
        </Providers>
    );
}

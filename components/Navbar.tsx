// components/Navbar.tsx
'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Search, User, Heart, LogOut, Menu, ShieldCheck, Loader2, ShoppingCart } from 'lucide-react';
import { LoginModal, RegisterModal } from './auth/AuthModals';
import { useCart } from '@/app/context/CartContext';
import { useFavorites } from '@/app/context/FavoritesContext'; // 👈 Import du hook de gestion des favoris
import CartDrawer from './shop/CartDrawer';

export default function Navbar() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [userImage, setUserImage] = useState<string | null>(null);
    const [imageLoading, setImageLoading] = useState(false);

    // Lance la recherche : redirige vers le catalogue filtré côté serveur (Prisma).
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const term = searchTerm.trim();
        router.push(term ? `/shop?q=${encodeURIComponent(term)}` : '/shop');
    };

    // Récupération du compteur d'articles dans le panier global
    const { cartCount } = useCart();

    // 🌟 Récupération de la liste des favoris en temps réel
    const { favorites } = useFavorites();

    // États pour gérer l'ouverture des modales
    const [isLoginOpen, setLoginOpen] = useState(false);
    const [isRegisterOpen, setRegisterOpen] = useState(false);

    // 🛒 État pour l'ouverture du panier latéral
    const [isCartOpen, setCartOpen] = useState(false);

    // Récupération de l'image de profil via l'API pour éviter de surcharger le cookie (Erreur 431)
    useEffect(() => {
        if (session?.user?.id && session.user.id !== "admin") {
            setImageLoading(true);
            fetch(`/api/user/image?id=${session.user.id}`)
                .then(res => res.json())
                .then(data => {
                    setUserImage(data.image);
                    setImageLoading(false);
                })
                .catch(() => {
                    setUserImage(null);
                    setImageLoading(false);
                });
        } else {
            setUserImage(null);
        }
    }, [session]);

    const navLinks = [
        { name: 'Accueil', path: '/' },
        { name: 'shop', path: '/shop' },
        { name: 'Sur Mesure', path: '/sur-mesure' },
        { name: 'Atelier', path: '/atelier' },
    ];

    return (
        <>
            <nav className="w-[80%] mx-auto bg-white border-b border-gray-100 sticky top-0 z-50 font-sans antialiased text-gray-900">
                {/* 1. Barre de recherche supérieure */}
                <div className="hidden md:flex justify-center py-2 bg-gray-50 border-b border-gray-100">
                    <form onSubmit={handleSearch} className="relative w-1/3 group">
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Rechercher un meuble..."
                            className="w-full bg-white border border-gray-200 rounded-full py-1.5 px-10 text-xs focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] outline-none transition-all duration-300 group-hover:shadow-sm"
                        />
                        <button type="submit" aria-label="Rechercher" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#28a745] transition-colors">
                            <Search className="w-4 h-4" />
                        </button>
                    </form>
                </div>

                {/* 2. Menu Principal */}
                <div className="px-8 py-4 flex justify-between items-center">
                    {/* LOGO */}
                    <div className="flex-1">
                        <Link href="/" className="group flex items-center gap-2">
                            <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-110 transition-transform duration-300">
                                <path d="M50 10L90 40H10L50 10Z" fill="#28a745"/>
                                <circle cx="50" cy="70" r="15" fill="#28a745"/>
                            </svg>
                            <span className="text-2xl font-extrabold tracking-tighter text-[#1A1A1A] group-hover:text-[#28a745] transition-all duration-300">
                                Ndan<span className="text-[#28a745]">ty</span>
                            </span>
                        </Link>
                    </div>

                    {/* MENU CENTRAL */}
                    <div className="hidden md:flex items-center justify-center space-x-8 flex-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.path}
                                className="relative text-xs uppercase tracking-[0.2em] text-gray-600 font-semibold hover:text-[#28a745] transition-colors duration-300 group"
                            >
                                {link.name}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#28a745] transition-all duration-300 group-hover:w-full"></span>
                            </Link>
                        ))}
                    </div>

                    {/* MENU ACTIONS */}
                    <div className="flex-1 flex justify-end items-center space-x-6">

                        {/* 🛒 BOUTON PANIER COMPLÈTEMENT DYNAMIQUE */}
                        <button
                            onClick={() => setCartOpen(true)}
                            className="relative group p-2 hover:bg-gray-50 rounded-full transition-all active:scale-95 duration-200 cursor-pointer"
                        >
                            <ShoppingCart className="w-5 h-5 text-gray-600 group-hover:text-[#28a745] transition-colors" />
                            {cartCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 bg-[#28a745] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-sm animate-[bounce_1s_infinite_1]">
                                    {cartCount}
                                </span>
                            )}
                        </button>

                        {/* 💚 BOUTON FAVORIS COMPLÈTEMENT DYNAMIQUE (Relié à ton espace favoris) */}
                        <Link
                            href="/dashboard/favorites" // Redirige vers son dossier favoris dans l'Espace Client
                            className="relative group p-2 hover:bg-gray-50 rounded-full transition-all active:scale-95 duration-200 block cursor-pointer"
                            title="Voir mes coups de cœur"
                        >
                            <Heart className="w-5 h-5 text-gray-600 group-hover:text-[#28a745] transition-colors" />
                            {favorites.length > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 bg-[#28a745] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-sm">
                                    {favorites.length}
                                </span>
                            )}
                        </Link>

                        <div className="flex items-center border-l border-gray-200 pl-6 space-x-4">
                            {status === "authenticated" ? (
                                <>
                                    {/* Lien enveloppant le nom pour le rendre cliquable vers l'Espace Client */}
                                    <Link
                                        href={session.user?.role === 'ADMIN' ? "/admin" : "/dashboard"}
                                        className="flex flex-col items-end mr-2 group cursor-pointer"
                                    >
                                        <span className="text-[10px] font-bold text-[#28a745] uppercase tracking-widest group-hover:opacity-80 transition-opacity">
                                            {session.user?.role === 'ADMIN' ? 'Admin' : 'Client'}
                                        </span>
                                        <span className="text-xs font-bold text-gray-900 leading-none group-hover:text-[#28a745] transition-colors">
                                            {session.user?.firstName || session.user?.name?.split(' ')[0]}
                                        </span>
                                    </Link>

                                    {/* 🎯 REDIRECTION DE L'AVATAR VERS /dashboard AU LIEU DE /account */}
                                    <Link
                                        href={session.user?.role === 'ADMIN' ? "/admin" : "/dashboard"}
                                        className="relative group transition-all duration-300 transform hover:scale-110"
                                        title="Accéder à mon Espace Client"
                                    >
                                        {imageLoading ? (
                                            <div className="w-9 h-9 rounded-full border-2 border-gray-100 flex items-center justify-center bg-gray-50">
                                                <Loader2 className="w-4 h-4 text-[#28a745] animate-spin" />
                                            </div>
                                        ) : userImage ? (
                                            <div className="w-9 h-9 rounded-full border-2 border-[#28a745] p-0.5 overflow-hidden shadow-sm bg-gray-100 group-hover:border-[#218838] transition-colors">
                                                <img
                                                    src={userImage}
                                                    alt="Profil"
                                                    className="w-full h-full object-cover rounded-full"
                                                />
                                            </div>
                                        ) : (
                                            <div className={`p-2 rounded-full text-white transition-all duration-300 ${
                                                session.user?.role === 'ADMIN' ? 'bg-red-600 hover:bg-black' : 'bg-[#2c3e50] hover:bg-[#28a745]'
                                            }`}>
                                                {session.user?.role === 'ADMIN' ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                            </div>
                                        )}
                                    </Link>

                                    <button
                                        onClick={() => signOut()}
                                        className="group p-2 hover:bg-red-50 rounded-full transition-all cursor-pointer"
                                        title="Déconnexion"
                                    >
                                        <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setLoginOpen(true)}
                                        className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-[#28a745] transition-colors outline-none cursor-pointer"
                                    >
                                        Connexion
                                    </button>
                                    <button
                                        onClick={() => setRegisterOpen(true)}
                                        className="px-5 py-2.5 bg-[#2c3e50] text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-[#28a745] hover:shadow-lg hover:shadow-[#28a745]/20 transition-all duration-300 cursor-pointer"
                                    >
                                        S'inscrire
                                    </button>
                                </>
                            )}
                        </div>

                        <button className="md:hidden p-2 text-gray-600">
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Injection des Modales d'Authentification */}
            <LoginModal isOpen={isLoginOpen} onClose={() => setLoginOpen(false)} />
            <RegisterModal isOpen={isRegisterOpen} onClose={() => setRegisterOpen(false)} />

            {/* 🛒 Injection de la modale latérale du Panier */}
            <CartDrawer isOpen={isCartOpen} onClose={() => setCartOpen(false)} />
        </>
    );
}
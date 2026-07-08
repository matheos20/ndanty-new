'use client'

import Link from 'next/link';
import { ChevronUp, Mail, MapPin, Phone } from 'lucide-react';

export default function Footer() {

    // Fonction pour remonter en haut de page en douceur
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const lucidaStyle = { fontFamily: '"Lucida Handwriting", cursive' };

    return (
        <footer className="relative w-[80%] mx-auto bg-[#FCFCFC] border-t border-gray-100 pt-16 pb-8 px-12 mt-12">

            {/* BOUTON TOPBAR (Remonter en haut) */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                <button
                    onClick={scrollToTop}
                    className="bg-[#28a745] text-white p-3 rounded-full shadow-lg hover:bg-[#2c3e50] hover:-translate-y-1 transition-all duration-300 group"
                    title="Retour en haut"
                >
                    <ChevronUp className="w-6 h-6 group-hover:scale-110" />
                </button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">

                {/* LOGO (Gauche) */}
                {/* LOGO (Gauche) - Remplacer dans Footer.tsx */}
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                        {/* Symbole SVG Ndanty */}
                        <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M50 10L90 40H10L50 10Z" fill="#28a745"/>
                            <circle cx="50" cy="70" r="15" fill="#28a745"/>
                        </svg>
                        {/* Texte Ndanty */}
                        <span className="text-3xl font-sans font-extrabold tracking-tighter text-[#1A1A1A]">
      Ndan<span className="text-[#28a745]">ty</span><span className="text-[#28a745] text-xs font-medium ml-1">shop</span>
    </span>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed max-w-xs uppercase tracking-widest font-semibold">
                        Votre partenaire pour des intérieurs d'exception à Madagascar.
                    </p>
                </div>

                {/* NAVIGATION (Milieu) */}
                <div className="flex-1 flex flex-col items-center">
                    <h4 className="text-[#2c3e50] text-xs font-bold uppercase tracking-[0.3em] mb-6">Navigation</h4>
                    <ul className="flex flex-col items-center gap-3 text-sm text-gray-500">
                        <li><Link href="/" className="hover:text-[#28a745] transition-colors">Accueil</Link></li>
                        <li><Link href="#catalogue" className="hover:text-[#28a745] transition-colors">Catalogue</Link></li>
                        <li><Link href="#services" className="hover:text-[#28a745] transition-colors">Services</Link></li>
                        <li><Link href="#devis" className="hover:text-[#28a745] transition-colors">Sur Mesure</Link></li>
                    </ul>
                </div>

                {/* TEXTE & PAIEMENT (Droite) */}
                <div className="flex-1 flex flex-col items-end">
                    <div className="text-right mb-6">
                        <h4 className="text-[#2c3e50] text-xs font-bold uppercase tracking-[0.3em] mb-3">Nous Contacter</h4>
                        <p className="text-gray-400 text-xs mb-1">Antananarivo, Madagascar</p>
                        <p className="text-[#28a745] text-xs font-bold">herbin10@Ndanty.mg</p>
                    </div>

                    {/* LOGOS DE PAIEMENT */}
                    {/* TEXTE & PAIEMENT (Droite) */}
                    <div className="flex-1 flex flex-col items-end">
                        <div className="text-right mb-6">
                            <h4 className="text-[#2c3e50] text-xs font-bold uppercase tracking-[0.3em] mb-3">Nous Contacter</h4>
                            <p className="text-gray-400 text-xs mb-1">Antananarivo, Madagascar</p>
                            <p className="text-[#28a745] text-xs font-bold">herbin10@Ndanty.mg</p>
                        </div>

                        {/* LOGOS DE PAIEMENT (Images réelles) */}
                        <div className="flex items-center gap-4 transition-all duration-500">
                            {/* PayPal */}
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg"
                                alt="PayPal"
                                className="h-5 w-auto object-contain hover:scale-110 transition-transform"
                            />
                            {/* MasterCard */}
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
                                alt="Mastercard"
                                className="h-6 w-auto object-contain hover:scale-110 transition-transform"
                            />
                            {/* Visa */}
                            <img
                                src="/images/payments/visa.png"
                                alt="Visa"
                                className="h-4 w-auto object-contain hover:scale-110 transition-transform"
                            />
                            {/* M-Vola (On utilise un placeholder pro si vous n'avez pas le logo local) */}
                            <img
                                src="/images/payments/monegasy.png"
                                alt="Mvola"
                                className="h-6 w-auto object-contain hover:scale-110 transition-transform"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* LIENS LÉGAUX + COPYRIGHT (Bas de tout) */}
            <div className="border-t border-gray-50 pt-8 text-center space-y-4">
                <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-semibold text-gray-500">
                    <li><Link href="/mentions-legales" className="hover:text-[#28a745] transition-colors">Mentions légales</Link></li>
                    <li><Link href="/cgv" className="hover:text-[#28a745] transition-colors">CGV</Link></li>
                    <li><Link href="/confidentialite" className="hover:text-[#28a745] transition-colors">Politique de confidentialité</Link></li>
                    <li><Link href="/sur-mesure" className="hover:text-[#28a745] transition-colors">Sur mesure</Link></li>
                </ul>
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.5em] font-medium">
                    © 2026 <span className="text-[#28a745]">Ndanty shop</span>
                </p>
            </div>
        </footer>
    );
}
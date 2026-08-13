'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProviders, signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

interface Props {
    /** Où rediriger après une connexion Google réussie (défaut : /dashboard). */
    callbackUrl?: string;
}

/**
 * Connexion sociale (style professionnel type "Alibaba") : un libellé
 * "Ou, continuez avec" suivi d'une icône ronde Google, puis une mention légale.
 * - Se masque automatiquement si le provider Google n'est pas configuré côté
 *   serveur (identifiants OAuth absents du .env) : jamais de bouton cassé.
 */
export default function GoogleButton({ callbackUrl = '/dashboard' }: Props) {
    const [available, setAvailable] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        getProviders()
            .then((providers) => {
                if (mounted && providers?.google) setAvailable(true);
            })
            .catch(() => {
                /* provider indisponible : on laisse masqué */
            });
        return () => {
            mounted = false;
        };
    }, []);

    if (!available) return null;

    return (
        <div className="pt-4 mt-2 space-y-5">
            {/* Séparateur "Ou, continuez avec" */}
            <div className="flex items-center gap-4">
                <div className="h-px flex-grow bg-gradient-to-r from-transparent to-gray-200" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Ou, continuez avec</span>
                <div className="h-px flex-grow bg-gradient-to-l from-transparent to-gray-200" />
            </div>

            {/* Icône ronde Google */}
            <div className="flex justify-center">
                <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                        setLoading(true);
                        signIn('google', { callbackUrl });
                    }}
                    title="Continuer avec Google"
                    aria-label="Continuer avec Google"
                    className="group relative w-14 h-14 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)] hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-300 active:scale-95 disabled:opacity-70"
                >
                    {loading ? (
                        <Loader2 className="animate-spin text-gray-400" size={22} />
                    ) : (
                        <GoogleLogo />
                    )}
                    {/* Anneau vert Ndanty au survol */}
                    <span className="absolute inset-0 rounded-full ring-2 ring-[#28a745]/0 group-hover:ring-[#28a745]/15 transition-all duration-300" />
                </button>
            </div>

            {/* Mention légale (adaptée à Ndanty) */}
            <p className="text-[10px] leading-relaxed text-gray-400 text-center px-1">
                En vous connectant via un réseau social, vous acceptez les{' '}
                <Link href="/cgv" className="text-[#28a745] font-semibold hover:underline">
                    Conditions Générales de Vente
                </Link>{' '}
                et la{' '}
                <Link href="/confidentialite" className="text-[#28a745] font-semibold hover:underline">
                    Politique de confidentialité
                </Link>{' '}
                de Ndanty, et à recevoir des e-mails concernant nos produits et services.
            </p>
        </div>
    );
}

/** Logo Google officiel (SVG multicolore). */
function GoogleLogo() {
    return (
        <svg width="24" height="24" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
    );
}

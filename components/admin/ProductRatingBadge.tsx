// components/admin/ProductRatingBadge.tsx
// Note réelle d'un produit, en LECTURE SEULE.
//
// Remplace l'ancienne « note éditoriale » que l'administrateur réglait à la main :
// une note saisie indépendamment des avis finit toujours par les contredire, et
// c'est exactement ce qui fait perdre confiance à un visiteur. La note affichée
// en boutique est désormais la moyenne des avis publiés — elle se modifie donc
// depuis la file de modération, pas depuis la fiche produit.
import Link from 'next/link';
import { Star, StarHalf, MessageSquare } from 'lucide-react';

interface Props {
    /** Moyenne des avis approuvés, ou `null` si aucun avis publié. */
    average: number | null;
    /** Nombre d'avis approuvés. */
    count: number;
    /** Nom du produit, utilisé pour pré-filtrer la file de modération. */
    productName: string;
}

function Stars({ value }: { value: number }) {
    return (
        <span className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => {
                if (star <= value) {
                    return <Star key={star} size={13} className="fill-[#f39c12] text-[#f39c12]" />;
                }
                if (star - 0.5 <= value) {
                    return <StarHalf key={star} size={13} className="fill-[#f39c12] text-[#f39c12]" />;
                }
                return <Star key={star} size={13} className="text-gray-200 fill-gray-100" />;
            })}
        </span>
    );
}

export default function ProductRatingBadge({ average, count, productName }: Props) {
    const href = `/admin/reviews?q=${encodeURIComponent(productName)}`;

    if (count === 0 || average === null) {
        return (
            <span className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-4 py-2 rounded-2xl w-max">
                <MessageSquare size={12} className="text-gray-300" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    Aucun avis publié
                </span>
            </span>
        );
    }

    return (
        <Link
            href={href}
            title={`Voir les ${count} avis publiés sur « ${productName} »`}
            className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 hover:border-[#28a745]/40 px-4 py-2 rounded-2xl w-max transition-colors group"
        >
            <Stars value={average} />
            <span className="text-[11px] font-black text-[#2c3e50] tabular-nums">
                {average.toFixed(1)}
            </span>
            <span className="text-[10px] font-bold text-gray-400 border-l border-gray-200 pl-2.5 group-hover:text-[#28a745] transition-colors">
                {count} avis
            </span>
        </Link>
    );
}

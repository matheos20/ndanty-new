'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteReview } from './actions';

export default function ReviewDeleteButton({ reviewId }: { reviewId: number }) {
    const router = useRouter();
    const [pending, setPending] = useState(false);

    const handleDelete = async () => {
        if (!confirm('⚠️ Supprimer définitivement cet avis client ?')) return;
        setPending(true);
        const res = await deleteReview(reviewId);
        setPending(false);
        if (res.success) router.refresh();
        else alert(res.error);
    };

    return (
        <button
            onClick={handleDelete}
            disabled={pending}
            title="Supprimer cet avis"
            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
    );
}

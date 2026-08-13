'use client'
import { useState } from 'react';
// ON IMPORTE LA FONCTION DEPUIS ACTIONS, ON NE LA RÉÉCRIT PAS ICI
import { updateQuoteStatus } from '@/app/actions';
import { Loader2, ChevronDown } from 'lucide-react';

const options = [
    { value: 'EN_ATTENTE', label: 'En attente', color: 'text-yellow-600 bg-yellow-50' },
    { value: 'DEVIS_ENVOYE', label: 'Devis envoyé', color: 'text-blue-600 bg-blue-50' },
    { value: 'VALIDE', label: 'Validé', color: 'text-green-600 bg-green-50' },
    { value: 'REFUSE', label: 'Refusé', color: 'text-red-600 bg-red-50' },
];

export default function StatusSelect({ quoteId, currentStatus }: { quoteId: number, currentStatus: string }) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(currentStatus);

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        setLoading(true);

        try {
            const result = await updateQuoteStatus(quoteId, newStatus);
            if (result.success) {
                setStatus(newStatus);
            }
        } catch (error) {
            alert("Erreur de mise à jour");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex items-center group">
            {loading && <Loader2 size={12} className="absolute -left-5 animate-spin text-gray-400" />}

            <select
                value={status}
                onChange={handleChange}
                disabled={loading}
                className={`
          appearance-none cursor-pointer pl-3 pr-8 py-1.5 rounded-lg border border-transparent
          text-[10px] font-bold uppercase tracking-wider outline-none transition-all
          ${options.find(opt => opt.value === status)?.color || 'bg-gray-50 text-gray-600'}
        `}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-white text-gray-700">
                        {opt.label}
                    </option>
                ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 pointer-events-none opacity-50" />
        </div>
    );
}
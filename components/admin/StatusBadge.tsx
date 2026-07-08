'use client'
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

// Configuration des styles par statut
const statusConfig = {
    EN_ATTENTE: {
        color: 'bg-yellow-50 text-yellow-600 border-yellow-100',
        icon: <Clock size={12} />,
        label: 'En attente'
    },
    VALIDE: {
        color: 'bg-green-50 text-green-600 border-green-100',
        icon: <CheckCircle2 size={12} />,
        label: 'Validé'
    },
    REFUSE: {
        color: 'bg-red-50 text-red-600 border-red-100',
        icon: <AlertCircle size={12} />,
        label: 'Refusé'
    },
};

export default function StatusBadge({ status }: { status: string }) {
    // On récupère la config selon le statut, sinon on met "EN_ATTENTE" par défaut
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.EN_ATTENTE;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${config.color} transition-all shadow-sm`}>
      {config.icon}
            {config.label.toUpperCase()}
    </span>
    );
}
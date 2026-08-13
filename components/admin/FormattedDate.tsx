'use client'
import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'

export default function FormattedDate({ date }: { date: Date | string }) {
    const [mounted, setMounted] = useState(false)

    // On attend que le composant soit chargé côté client pour afficher la date
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="flex items-center gap-1 text-[10px] text-gray-200">
                <Calendar size={10} /> --/--/----
            </div>
        )
    }

    return (
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Calendar size={10} />
            {new Date(date).toLocaleDateString('fr-FR')}
        </div>
    )
}
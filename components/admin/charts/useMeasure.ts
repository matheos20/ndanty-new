'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Mesure la largeur réelle du conteneur pour dessiner un SVG en pixels natifs.
 * (Un viewBox étiré déformerait le texte des axes : on préfère redessiner.)
 */
export function useMeasure<T extends HTMLElement>() {
    const ref = useRef<T | null>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        setWidth(el.clientWidth);
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) setWidth(entry.contentRect.width);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return { ref, width };
}

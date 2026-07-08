'use client';

import { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';

// Palette d'emojis soignée et pertinente pour une boutique de mobilier.
const EMOJIS = [
    '😍', '😊', '👍', '🙏', '❤️', '🔥', '✨', '👏',
    '✅', '🎉', '😁', '🤩', '💚', '👌', '🛋️', '🪑',
    '🏡', '⭐', '💯', '😉', '🙌', '💐', '😄', '🥰',
];

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    className?: string;
}

export default function EmojiPicker({ onSelect, className = '' }: EmojiPickerProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative inline-block ${className}`} ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                title="Ajouter un emoji"
                className="p-1.5 text-gray-400 hover:text-[#28a745] hover:bg-[#28a745]/10 rounded-lg transition-colors"
            >
                <Smile size={18} />
            </button>

            {open && (
                <div className="absolute z-50 bottom-full mb-2 right-0 bg-white border border-gray-100 rounded-2xl shadow-xl p-2 w-56 grid grid-cols-8 gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    {EMOJIS.map((emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => { onSelect(emoji); setOpen(false); }}
                            className="text-lg p-1 rounded-lg hover:bg-gray-100 transition-colors active:scale-90"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

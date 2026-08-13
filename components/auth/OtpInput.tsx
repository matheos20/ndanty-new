'use client';

import { useEffect, useRef } from 'react';

// Longueur d'un code TOTP. Valeur miroir de TOTP_DIGITS (lib/totp.ts), redéclarée
// ici pour éviter d'entraîner `node:crypto` dans le bundle client.
const TOTP_DIGITS = 6;

interface Props {
    value: string;
    onChange: (value: string) => void;
    /** Appelé dès que les 6 chiffres sont saisis (validation automatique). */
    onComplete?: (value: string) => void;
    disabled?: boolean;
    autoFocus?: boolean;
    /** `dark` pour un fond sombre (écran de connexion admin). */
    tone?: 'light' | 'dark';
}

/**
 * Saisie segmentée d'un code à 6 chiffres : une case par chiffre, avance
 * automatique, retour arrière intelligent, et collage d'un code entier.
 * Utilisée à l'activation (back-office) comme à la connexion.
 */
export default function OtpInput({
    value,
    onChange,
    onComplete,
    disabled = false,
    autoFocus = false,
    tone = 'light',
}: Props) {
    const refs = useRef<(HTMLInputElement | null)[]>([]);
    const completedFor = useRef<string | null>(null);

    useEffect(() => {
        if (autoFocus) refs.current[0]?.focus();
    }, [autoFocus]);

    // Déclenche la validation automatique une seule fois par code complet.
    useEffect(() => {
        if (value.length === TOTP_DIGITS && completedFor.current !== value) {
            completedFor.current = value;
            onComplete?.(value);
        }
        if (value.length < TOTP_DIGITS) completedFor.current = null;
    }, [value, onComplete]);

    const setDigit = (index: number, digit: string) => {
        const next = value.padEnd(TOTP_DIGITS, ' ').split('');
        next[index] = digit || ' ';
        onChange(next.join('').replace(/\s+$/, '').replace(/\s/g, ''));
    };

    const handleChange = (index: number, raw: string) => {
        const digits = raw.replace(/\D/g, '');
        if (!digits) {
            setDigit(index, '');
            return;
        }
        // Saisie ou collage : on remplit à partir de la case courante.
        const merged = (value.slice(0, index) + digits).slice(0, TOTP_DIGITS);
        onChange(merged);
        const focusAt = Math.min(merged.length, TOTP_DIGITS - 1);
        refs.current[focusAt]?.focus();
    };

    const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Backspace' && !value[index] && index > 0) {
            event.preventDefault();
            onChange(value.slice(0, index - 1));
            refs.current[index - 1]?.focus();
        }
        if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
        if (event.key === 'ArrowRight' && index < TOTP_DIGITS - 1) refs.current[index + 1]?.focus();
    };

    const base =
        tone === 'dark'
            ? 'bg-white/5 border-white/10 text-white placeholder-white/20 focus:bg-white/10'
            : 'bg-gray-50 border-gray-100 text-[#2c3e50] focus:bg-white';

    return (
        <div className="flex items-center justify-center gap-2 sm:gap-3" dir="ltr">
            {Array.from({ length: TOTP_DIGITS }).map((_, index) => (
                <input
                    key={index}
                    ref={(el) => { refs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={TOTP_DIGITS}
                    disabled={disabled}
                    aria-label={`Chiffre ${index + 1} sur ${TOTP_DIGITS}`}
                    value={value[index] ?? ''}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onFocus={(e) => e.target.select()}
                    className={`w-11 h-14 sm:w-12 sm:h-16 border rounded-2xl text-center text-xl sm:text-2xl font-black tabular-nums outline-none transition-all focus:border-[#28a745] focus:ring-4 focus:ring-[#28a745]/10 disabled:opacity-50 ${base}`}
                />
            ))}
        </div>
    );
}

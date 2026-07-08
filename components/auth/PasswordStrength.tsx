'use client';

import { getPasswordStrength, validatePassword } from '@/lib/password';

/** Indicateur visuel de force du mot de passe + rappel de la règle si non conforme. */
export default function PasswordStrength({ password }: { password: string }) {
    if (!password) return null;
    const s = getPasswordStrength(password);
    const check = validatePassword(password);

    return (
        <div className="mt-2">
            <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-colors"
                        style={{ backgroundColor: i < s.score ? s.color : '#e5e7eb' }}
                    />
                ))}
            </div>
            <p className="text-[9px] font-bold mt-1" style={{ color: check.ok ? s.color : '#dc2626' }}>
                {check.ok ? `Sécurité : ${s.label}` : check.error}
            </p>
        </div>
    );
}

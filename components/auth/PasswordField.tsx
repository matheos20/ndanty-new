'use client';

import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
    withIcon?: boolean;
    containerClassName?: string;
}

/**
 * Champ mot de passe avec bouton afficher/masquer. Compatible contrôlé et non contrôlé
 * (transmet toutes les props natives à l'<input>).
 */
export default function PasswordField({ withIcon = true, containerClassName = '', className = '', ...props }: Props) {
    const [show, setShow] = useState(false);
    return (
        <div className={`relative ${containerClassName}`}>
            {withIcon && <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />}
            <input {...props} type={show ? 'text' : 'password'} className={className} />
            <button
                type="button"
                tabIndex={-1}
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#28a745] transition-colors"
            >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    );
}

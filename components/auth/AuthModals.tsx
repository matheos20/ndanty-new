'use client';

import { X } from 'lucide-react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// --- MODALE DE CONNEXION (réutilise LoginForm, identique à la page /auth-client) ---
export function LoginModal({ isOpen, onClose }: ModalProps) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="p-8">
                    <div className="relative flex items-center justify-center mb-8">
                        <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">Connexion</h2>
                        <button onClick={onClose} className="absolute right-0 p-2 hover:bg-gray-100 rounded-full transition-all duration-200">
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>
                    <LoginForm onSuccess={() => window.location.reload()} onNavigateAway={onClose} />
                </div>
            </div>
        </div>
    );
}

// --- MODALE D'INSCRIPTION (réutilise RegisterForm, identique à la page /auth-client) ---
export function RegisterModal({ isOpen, onClose }: ModalProps) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[95vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
                <div className="p-8">
                    <div className="relative flex flex-col items-center justify-center mb-6">
                        <div className="text-center">
                            <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">S'inscrire</h2>
                            <p className="text-gray-400 text-sm mt-1 font-medium">Rejoignez l'univers Ndanty</p>
                        </div>
                        <button onClick={onClose} className="absolute right-0 top-0 p-2 hover:bg-gray-100 rounded-full transition-all duration-200">
                            <X size={24} className="text-gray-400 hover:text-red-500" />
                        </button>
                    </div>
                    <RegisterForm onSuccess={() => { onClose(); window.location.reload(); }} />
                </div>
            </div>
        </div>
    );
}

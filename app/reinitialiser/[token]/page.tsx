// app/reinitialiser/[token]/page.tsx
import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { verifyResetToken } from '@/app/actions/auth';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const { valid } = await verifyResetToken(token);

    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-50 p-10">
                <div className="text-2xl font-black tracking-tighter text-[#2c3e50] mb-1">Ndanty.</div>
                <h1 className="text-xl font-extrabold text-[#2c3e50] mb-6">Nouveau mot de passe</h1>

                {valid ? (
                    <ResetPasswordForm token={token} />
                ) : (
                    <div className="space-y-5">
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex items-start gap-2">
                            <XCircle size={18} className="shrink-0 mt-0.5" />
                            <span>Ce lien de réinitialisation est invalide ou a expiré (valable 1 heure).</span>
                        </div>
                        <Link
                            href="/mot-de-passe-oublie"
                            className="block w-full text-center bg-[#28a745] text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-[#218838] transition-all"
                        >
                            Refaire une demande
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

// app/admin/securite/page.tsx
import { redirect } from "next/navigation";
import { ShieldCheck, ShieldAlert, Users, Smartphone, KeyRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { countRecoveryCodes } from "@/lib/two-factor";
import { getTwoFactorStatusAction } from "./actions";
import TwoFactorPanel from "./TwoFactorPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
    title: "Sécurité du compte | Ndanty Admin",
};

/** Panorama des comptes administrateurs : qui est protégé, qui ne l'est pas. */
async function getAdminCoverage() {
    const admins = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            twoFactorEnabled: true,
            twoFactorEnabledAt: true,
            twoFactorRecoveryCodes: true,
        },
        orderBy: { email: "asc" },
    });

    return admins.map((admin) => ({
        id: admin.id,
        email: admin.email,
        name: `${admin.firstName ?? ""} ${admin.lastName ?? ""}`.trim() || admin.email,
        enabled: admin.twoFactorEnabled,
        enabledAt: admin.twoFactorEnabledAt,
        recovery: countRecoveryCodes(admin.twoFactorRecoveryCodes),
    }));
}

export default async function SecurityPage() {
    const status = await getTwoFactorStatusAction();
    if (!status) redirect("/login"); // guard côté action : non-admin ou session expirée

    const admins = await getAdminCoverage();
    const covered = admins.filter((a) => a.enabled).length;

    return (
        <div className="space-y-6 p-5 sm:p-8 max-w-5xl mx-auto animate-in fade-in duration-300">
            {/* EN-TÊTE */}
            <div>
                <h2 className="text-2xl font-bold text-[#2c3e50]">Sécurité du compte</h2>
                <p className="text-sm text-gray-500">
                    Renforcez l'accès au back-office Ndanty avec un second facteur d'authentification.
                    Le mot de passe seul ne protège plus la boutique une fois qu'il a fuité.
                </p>
            </div>

            {/* PANNEAU 2FA (interactif) */}
            <TwoFactorPanel status={status} />

            {/* MODE D'EMPLOI */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-8">
                <h3 className="text-sm font-black text-[#2c3e50] uppercase tracking-wider mb-5">
                    Comment ça fonctionne
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                        {
                            icon: <Smartphone size={20} />,
                            title: "Une application, un appairage",
                            text: "Le QR code transmet une clé secrète à votre téléphone. Elle n'est échangée qu'une seule fois, à l'appairage.",
                        },
                        {
                            icon: <ShieldCheck size={20} />,
                            title: "Un code de 6 chiffres",
                            text: "Votre téléphone calcule un code valable 30 secondes. Il est demandé après le mot de passe, à chaque connexion.",
                        },
                        {
                            icon: <KeyRound size={20} />,
                            title: "8 codes de secours",
                            text: "En cas de perte du téléphone, chacun de ces codes ouvre une session — une seule fois.",
                        },
                    ].map((item) => (
                        <div key={item.title} className="space-y-2.5">
                            <div className="p-2.5 rounded-2xl bg-[#28a745]/10 text-[#28a745] w-fit">{item.icon}</div>
                            <h4 className="text-sm font-black text-[#2c3e50]">{item.title}</h4>
                            <p className="text-xs text-gray-500 font-medium leading-relaxed">{item.text}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* COUVERTURE DES COMPTES ADMINISTRATEURS */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 sm:px-8 py-5 border-b border-gray-50 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600"><Users size={20} /></div>
                        <div>
                            <h3 className="text-base font-black text-[#2c3e50]">Comptes administrateurs</h3>
                            <p className="text-xs font-semibold text-gray-400">
                                Chaque compte active sa protection depuis sa propre session.
                            </p>
                        </div>
                    </div>
                    <span
                        className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border ${
                            covered === admins.length
                                ? "bg-[#28a745]/10 text-[#28a745] border-[#28a745]/20"
                                : "bg-amber-50 text-amber-600 border-amber-100"
                        }`}
                    >
                        {covered} / {admins.length} protégé(s)
                    </span>
                </div>

                <ul className="divide-y divide-gray-50">
                    {admins.map((admin) => (
                        <li key={admin.id} className="px-6 sm:px-8 py-4 flex items-center gap-4">
                            <div
                                className={`p-2 rounded-xl shrink-0 ${
                                    admin.enabled ? "bg-[#28a745]/10 text-[#28a745]" : "bg-amber-50 text-amber-500"
                                }`}
                            >
                                {admin.enabled ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-black text-[#2c3e50] truncate">{admin.name}</p>
                                <p className="text-[11px] font-semibold text-gray-400 truncate">{admin.email}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p
                                    className={`text-[10px] font-black uppercase tracking-wider ${
                                        admin.enabled ? "text-[#28a745]" : "text-amber-600"
                                    }`}
                                >
                                    {admin.enabled ? "2FA active" : "Non protégé"}
                                </p>
                                {admin.enabled && (
                                    <p className="text-[10px] font-bold text-gray-300 tabular-nums">
                                        {admin.recovery.remaining}/{admin.recovery.total} codes restants
                                    </p>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

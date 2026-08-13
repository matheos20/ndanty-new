'use client';

// app/admin/orders/CancelOrderModal.tsx
// Annulation d'une commande : motif obligatoire, puis décision explicite sur le
// stock, le remboursement et la notification du client. Rien n'est implicite —
// l'administrateur voit exactement ce que la confirmation va déclencher.

import { useState } from 'react';
import { AlertTriangle, Ban, Loader2, Mail, PackagePlus, Undo2 } from 'lucide-react';
import DetailModal, { DetailSection } from '@/components/admin/DetailModal';
import { cancelOrderAction } from './actions';

export interface CancellableOrder {
    id: number;
    customerName: string;
    email: string;
    totalAmount: number;
    stockDeducted: boolean;
    /** Statut de la TRANSACTION (table payment), seul déclencheur possible d'un remboursement. */
    paymentState: string | null;
    itemCount: number;
}

/** Case à cocher d'action, avec son explication — jamais de coche sans conséquence énoncée. */
function ActionCheckbox({
    checked, onChange, disabled, icon, label, help,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
    icon: React.ReactNode;
    label: string;
    help: string;
}) {
    return (
        <label
            className={`flex items-start gap-3 rounded-2xl border p-4 transition-all ${
                disabled
                    ? 'border-gray-100 bg-gray-50/60 cursor-not-allowed'
                    : checked
                        ? 'border-[#28a745]/40 bg-green-50/40 cursor-pointer'
                        : 'border-gray-100 bg-white hover:border-gray-200 cursor-pointer'
            }`}
        >
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#28a745] shrink-0 disabled:opacity-40"
            />
            <span className="min-w-0">
                <span className={`flex items-center gap-2 text-xs font-black ${disabled ? 'text-gray-400' : 'text-[#2c3e50]'}`}>
                    {icon}
                    {label}
                </span>
                <span className="block text-[11px] font-medium text-gray-400 mt-1 leading-relaxed">{help}</span>
            </span>
        </label>
    );
}

export default function CancelOrderModal({
    order,
    onClose,
    onDone,
}: {
    order: CancellableOrder;
    onClose: () => void;
    onDone: (message: string) => void;
}) {
    const refundable = order.paymentState === 'PAID';

    const [reason, setReason] = useState('');
    const [restock, setRestock] = useState(order.stockDeducted);
    const [refund, setRefund] = useState(refundable);
    const [notify, setNotify] = useState(true);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        if (reason.trim().length < 5) {
            setError("Merci d'indiquer un motif d'annulation (5 caractères minimum).");
            return;
        }

        setPending(true);
        setError(null);
        const result = await cancelOrderAction(order.id, { reason, refund, restock, notify });
        setPending(false);

        if (!result.success) {
            setError(result.error || "La commande n'a pas pu être annulée.");
            return;
        }
        onDone(result.message || 'Commande annulée.');
    };

    return (
        <DetailModal
            open
            onClose={pending ? () => {} : onClose}
            maxWidth="max-w-xl"
            eyebrow="Annulation de commande"
            title={`CMD #${order.id}`}
            subtitle={`${order.customerName} — ${order.totalAmount.toLocaleString('fr-FR')} Ar`}
            footer={
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={pending}
                        className="px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-[#2c3e50] hover:bg-gray-100 transition-colors disabled:opacity-40"
                    >
                        Revenir
                    </button>
                    <button
                        onClick={submit}
                        disabled={pending}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60"
                    >
                        {pending ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                        {pending ? 'Traitement…' : 'Confirmer l’annulation'}
                    </button>
                </div>
            }
        >
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3">
                <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-semibold text-red-700 leading-relaxed">
                    Cette opération est définitive : la commande sortira du tunnel de suivi et ne pourra plus
                    changer d'étape. Elle sera exclue du chiffre d'affaires du tableau de bord.
                </p>
            </div>

            <DetailSection title="Motif de l'annulation">
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    autoFocus
                    placeholder="Ex. : rupture de stock sur le canapé, client injoignable depuis 5 jours…"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-xs font-medium text-[#2c3e50] placeholder:text-gray-300 focus:bg-white focus:border-[#28a745] focus:ring-1 focus:ring-[#28a745] outline-none transition-all resize-none"
                />
                <p className="text-[10px] font-semibold text-gray-400 mt-2">
                    Conservé dans la fiche de la commande et repris tel quel dans l'email au client.
                </p>
            </DetailSection>

            <DetailSection title="Opérations à déclencher">
                <div className="space-y-2.5">
                    <ActionCheckbox
                        checked={restock}
                        onChange={setRestock}
                        disabled={!order.stockDeducted}
                        icon={<PackagePlus size={13} className="text-[#28a745]" />}
                        label="Remettre les articles en stock"
                        help={
                            order.stockDeducted
                                ? `${order.itemCount} ligne(s) seront recréditées au catalogue. Décochez si la marchandise est perdue ou abîmée.`
                                : "Le stock n'a jamais été décrémenté pour cette commande : rien à restituer."
                        }
                    />

                    <ActionCheckbox
                        checked={refund}
                        onChange={setRefund}
                        disabled={!refundable}
                        icon={<Undo2 size={13} className="text-[#28a745]" />}
                        label="Rembourser le paiement encaissé"
                        help={
                            refundable
                                ? "La transaction passe en « Remboursée » et l'opération est tracée dans le journal des transactions."
                                : "Aucun encaissement à rembourser (paiement en attente, à la livraison, refusé ou déjà remboursé)."
                        }
                    />

                    <ActionCheckbox
                        checked={notify}
                        onChange={setNotify}
                        icon={<Mail size={13} className="text-[#28a745]" />}
                        label="Prévenir le client par email"
                        help={`Un email d'annulation est adressé à ${order.email}, avec le motif et le détail du remboursement.`}
                    />
                </div>
            </DetailSection>

            {error && (
                <p className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    {error}
                </p>
            )}
        </DetailModal>
    );
}

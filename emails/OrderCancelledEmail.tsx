import * as React from 'react';

interface OrderCancelledEmailProps {
    customerName: string;
    orderId: number;
    reason: string;
    /** Un remboursement a été enregistré pour cette commande. */
    refunded: boolean;
    refundAmount: number;
    methodLabel?: string | null;
    paymentRef?: string | null;
    appUrl: string;
}

const fmt = (n: number) => n.toLocaleString('fr-FR');

/**
 * Email d'annulation de commande — envoyé quand l'administrateur annule,
 * avec ou sans remboursement de la transaction encaissée.
 */
export const OrderCancelledEmail: React.FC<Readonly<OrderCancelledEmailProps>> = ({
    customerName, orderId, reason, refunded, refundAmount, methodLabel, paymentRef, appUrl,
}) => (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', padding: '40px 20px', color: '#333' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>

            <div style={{ backgroundColor: '#2c3e50', padding: '30px', textAlign: 'center' as const }}>
                <h1 style={{ color: '#fff', margin: 0, fontSize: '24px' }}>Ndanty.</h1>
                <p style={{ color: '#f5b7b1', margin: '6px 0 0', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' as const }}>
                    Commande annulée
                </p>
            </div>

            <div style={{ padding: '40px' }}>
                <h2 style={{ color: '#2c3e50', marginTop: 0 }}>Votre commande a été annulée</h2>
                <p style={{ lineHeight: 1.6, fontSize: '16px' }}>
                    Bonjour {customerName}, nous vous informons que votre commande <strong>#CMD-{orderId}</strong> a été annulée.
                </p>

                <div style={{ backgroundColor: '#fdf6f6', border: '1px solid #f7e0e0', borderRadius: '14px', padding: '20px', marginTop: '20px', fontSize: '14px' }}>
                    <p style={{ margin: 0, color: '#888', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '1px', fontWeight: 'bold' as const }}>
                        Motif de l'annulation
                    </p>
                    <p style={{ margin: '8px 0 0', color: '#333', lineHeight: 1.6 }}>{reason}</p>
                </div>

                {refunded ? (
                    <div style={{ backgroundColor: '#f8faf9', border: '1px solid #e6f2ea', borderRadius: '14px', padding: '20px', marginTop: '20px', fontSize: '14px' }}>
                        <p style={{ margin: 0, color: '#2c3e50', fontWeight: 'bold' as const }}>Remboursement enregistré ✅</p>
                        <p style={{ margin: '10px 0 0', color: '#888' }}>
                            Montant remboursé : <span style={{ float: 'right' as const, color: '#28a745', fontWeight: 'bold' as const }}>{fmt(refundAmount)} Ar</span>
                        </p>
                        {methodLabel && (
                            <p style={{ margin: '6px 0', color: '#888' }}>
                                Moyen de paiement : <span style={{ float: 'right' as const, color: '#333' }}>{methodLabel}</span>
                            </p>
                        )}
                        {paymentRef && (
                            <p style={{ margin: '6px 0', color: '#888' }}>
                                Référence : <span style={{ float: 'right' as const, color: '#333', fontFamily: 'monospace' }}>{paymentRef}</span>
                            </p>
                        )}
                        <p style={{ margin: '14px 0 0', borderTop: '1px solid #e6f2ea', paddingTop: '12px', color: '#777', fontSize: '13px', lineHeight: 1.6 }}>
                            Selon votre moyen de paiement, le crédit peut mettre quelques jours ouvrés à apparaître sur votre compte.
                        </p>
                    </div>
                ) : (
                    <p style={{ lineHeight: 1.6, fontSize: '15px', color: '#555', marginTop: '20px' }}>
                        Aucun montant n'a été prélevé pour cette commande. Si vous constatez un débit, répondez à cet email : nous le régularisons immédiatement.
                    </p>
                )}

                <div style={{ textAlign: 'center' as const, marginTop: '30px' }}>
                    <a
                        href={`${appUrl}/shop`}
                        style={{
                            backgroundColor: '#28a745', color: '#ffffff', textDecoration: 'none',
                            padding: '14px 28px', borderRadius: '999px', fontSize: '13px',
                            fontWeight: 'bold' as const, letterSpacing: '0.5px', display: 'inline-block',
                        }}
                    >
                        Retourner à la boutique
                    </a>
                </div>

                <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                    <p style={{ fontSize: '14px', color: '#888' }}>
                        Toutes nos excuses pour la gêne occasionnée,<br />
                        <strong>L'équipe Ndanty</strong>
                    </p>
                </div>
            </div>
        </div>
    </div>
);

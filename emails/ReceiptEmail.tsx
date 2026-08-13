import * as React from 'react';

interface ReceiptEmailProps {
    customerName: string;
    orderId: number;
    total: number;
    method: string;
    paymentRef: string;
    date: string;
}

const fmt = (n: number) => n.toLocaleString('fr-FR');

/**
 * Email de reçu de paiement — envoyé après un règlement validé.
 * Prêt à brancher sur le service d'envoi en production.
 */
export const ReceiptEmail: React.FC<Readonly<ReceiptEmailProps>> = ({
    customerName, orderId, total, method, paymentRef, date,
}) => (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', padding: '40px 20px', color: '#333' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ backgroundColor: '#2c3e50', padding: '30px', textAlign: 'center' as const }}>
                <h1 style={{ color: '#fff', margin: 0, fontSize: '24px' }}>Ndanty.</h1>
                <p style={{ color: '#9fe0b0', margin: '6px 0 0', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' as const }}>Reçu de paiement</p>
            </div>
            <div style={{ padding: '40px' }}>
                <h2 style={{ color: '#2c3e50' }}>Paiement confirmé ✅</h2>
                <p style={{ lineHeight: 1.6, fontSize: '16px' }}>
                    Bonjour {customerName}, nous confirmons la réception de votre paiement pour la commande
                    {' '}<strong>#CMD-{orderId}</strong>.
                </p>

                <div style={{ backgroundColor: '#f8faf9', border: '1px solid #e6f2ea', borderRadius: '14px', padding: '20px', marginTop: '20px', fontSize: '14px' }}>
                    <p style={{ margin: '6px 0', color: '#888' }}>Référence : <span style={{ float: 'right' as const, color: '#333', fontFamily: 'monospace' }}>{paymentRef}</span></p>
                    <p style={{ margin: '6px 0', color: '#888' }}>Moyen de paiement : <span style={{ float: 'right' as const, color: '#333' }}>{method}</span></p>
                    <p style={{ margin: '6px 0', color: '#888' }}>Date : <span style={{ float: 'right' as const, color: '#333' }}>{date}</span></p>
                    <p style={{ margin: '12px 0 0', borderTop: '1px solid #e6f2ea', paddingTop: '12px', fontWeight: 'bold' as const, color: '#2c3e50' }}>
                        Montant réglé : <span style={{ float: 'right' as const, color: '#28a745' }}>{fmt(total)} Ar</span>
                    </p>
                </div>

                <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                    <p style={{ fontSize: '14px', color: '#888' }}>
                        Merci de votre confiance,<br />
                        <strong>L'équipe Ndanty</strong>
                    </p>
                </div>
            </div>
        </div>
    </div>
);

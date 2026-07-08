import * as React from 'react';

interface OrderItem { name: string; price: number; quantity: number; }
interface OrderConfirmationEmailProps {
    customerName: string;
    orderId: number;
    items: OrderItem[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    deliveryZoneLabel?: string;
}

const fmt = (n: number) => n.toLocaleString('fr-FR');

/**
 * Email de confirmation de commande — prêt à être branché sur un service d'envoi
 * (Resend/SMTP) dès qu'un domaine de production sera configuré.
 */
export const OrderConfirmationEmail: React.FC<Readonly<OrderConfirmationEmailProps>> = ({
    customerName, orderId, items, subtotal, deliveryFee, total, deliveryZoneLabel,
}) => (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', padding: '40px 20px', color: '#333' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ backgroundColor: '#28a745', padding: '30px', textAlign: 'center' as const }}>
                <h1 style={{ color: '#fff', margin: 0, fontSize: '24px' }}>Ndanty.</h1>
            </div>
            <div style={{ padding: '40px' }}>
                <h2 style={{ color: '#2c3e50' }}>Merci pour votre commande, {customerName} !</h2>
                <p style={{ lineHeight: 1.6, fontSize: '16px' }}>
                    Votre commande <strong>#CMD-{orderId}</strong> a bien été enregistrée. Voici le récapitulatif :
                </p>

                <table style={{ width: '100%', borderCollapse: 'collapse' as const, marginTop: '20px', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' as const, color: '#888' }}>
                            <th style={{ padding: '8px 0' }}>Article</th>
                            <th style={{ padding: '8px 0', textAlign: 'center' as const }}>Qté</th>
                            <th style={{ padding: '8px 0', textAlign: 'right' as const }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((it, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f4f4f4' }}>
                                <td style={{ padding: '8px 0', color: '#2c3e50' }}>{it.name}</td>
                                <td style={{ padding: '8px 0', textAlign: 'center' as const }}>{it.quantity}</td>
                                <td style={{ padding: '8px 0', textAlign: 'right' as const }}>{fmt(it.price * it.quantity)} Ar</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{ marginTop: '20px', fontSize: '14px' }}>
                    <p style={{ margin: '4px 0', color: '#888' }}>Sous-total : <span style={{ float: 'right' as const, color: '#333' }}>{fmt(subtotal)} Ar</span></p>
                    <p style={{ margin: '4px 0', color: '#888' }}>Livraison{deliveryZoneLabel ? ` (${deliveryZoneLabel})` : ''} : <span style={{ float: 'right' as const, color: '#333' }}>{fmt(deliveryFee)} Ar</span></p>
                    <p style={{ margin: '12px 0 0', borderTop: '2px solid #28a745', paddingTop: '12px', fontWeight: 'bold' as const, color: '#2c3e50' }}>
                        Total : <span style={{ float: 'right' as const, color: '#28a745' }}>{fmt(total)} Ar</span>
                    </p>
                </div>

                <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                    <p style={{ fontSize: '14px', color: '#888' }}>
                        Nous préparons votre commande avec soin.<br />
                        <strong>L'équipe Ndanty</strong>
                    </p>
                </div>
            </div>
        </div>
    </div>
);

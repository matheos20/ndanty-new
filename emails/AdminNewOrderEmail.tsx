import * as React from 'react';

interface OrderItem { name: string; price: number; quantity: number; }

interface AdminNewOrderEmailProps {
    orderId: number;
    customerName: string;
    email: string;
    phone: string;
    address: string;
    items: OrderItem[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    deliveryZoneLabel?: string;
    /** Libellé du moyen de paiement (Monegasy, Visa, …). */
    methodLabel: string;
    /** PAID | A_LA_LIVRAISON | … — pilote la couleur du bandeau. */
    paymentStatus: string;
    paymentRef?: string | null;
    /** Base URL du back-office, pour un lien cliquable depuis la boîte mail. */
    appUrl: string;
}

const fmt = (n: number) => n.toLocaleString('fr-FR');

const STATUS_STYLES: Record<string, { label: string; bg: string }> = {
    PAID: { label: 'Payée en ligne', bg: '#28a745' },
    A_LA_LIVRAISON: { label: 'À encaisser à la livraison', bg: '#f0ad4e' },
};

/**
 * Alerte back-office : une nouvelle commande vient d'être réglée.
 * Destinée à l'administrateur Ndanty (ADMIN_EMAIL), pas au client.
 */
export const AdminNewOrderEmail: React.FC<Readonly<AdminNewOrderEmailProps>> = ({
    orderId, customerName, email, phone, address, items, subtotal, deliveryFee,
    total, deliveryZoneLabel, methodLabel, paymentStatus, paymentRef, appUrl,
}) => {
    const badge = STATUS_STYLES[paymentStatus] || { label: paymentStatus, bg: '#6c757d' };

    return (
        <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', padding: '40px 20px', color: '#333' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>

                <div style={{ backgroundColor: '#2c3e50', padding: '24px 30px' }}>
                    <h1 style={{ color: '#fff', margin: 0, fontSize: '20px' }}>
                        Ndanty<span style={{ color: '#28a745' }}>Admin</span>
                    </h1>
                    <p style={{ color: '#aab6c2', margin: '6px 0 0', fontSize: '13px' }}>
                        Nouvelle commande à traiter
                    </p>
                </div>

                <div style={{ padding: '30px 40px 40px' }}>
                    <div style={{ display: 'block', marginBottom: '20px' }}>
                        <span style={{ display: 'inline-block', backgroundColor: badge.bg, color: '#fff', fontSize: '11px', fontWeight: 'bold' as const, textTransform: 'uppercase' as const, letterSpacing: '1px', padding: '6px 12px', borderRadius: '20px' }}>
                            {badge.label}
                        </span>
                    </div>

                    <h2 style={{ color: '#2c3e50', margin: '0 0 6px', fontSize: '22px' }}>
                        Commande #CMD-{orderId}
                    </h2>
                    <p style={{ color: '#28a745', fontSize: '26px', fontWeight: 'bold' as const, margin: '0 0 24px' }}>
                        {fmt(total)} Ar
                    </p>

                    {/* Coordonnées client */}
                    <div style={{ backgroundColor: '#f7f9fa', borderRadius: '12px', padding: '16px 18px', fontSize: '14px', lineHeight: 1.7 }}>
                        <p style={{ margin: 0, color: '#2c3e50', fontWeight: 'bold' as const }}>{customerName}</p>
                        <p style={{ margin: 0, color: '#666' }}>{email} · {phone}</p>
                        <p style={{ margin: '6px 0 0', color: '#666' }}>
                            📍 {address}{deliveryZoneLabel ? ` — ${deliveryZoneLabel}` : ''}
                        </p>
                    </div>

                    {/* Articles */}
                    <table style={{ width: '100%', borderCollapse: 'collapse' as const, marginTop: '24px', fontSize: '14px' }}>
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

                    <div style={{ marginTop: '18px', fontSize: '14px' }}>
                        <p style={{ margin: '4px 0', color: '#888' }}>
                            Sous-total : <span style={{ float: 'right' as const, color: '#333' }}>{fmt(subtotal)} Ar</span>
                        </p>
                        <p style={{ margin: '4px 0', color: '#888' }}>
                            Livraison : <span style={{ float: 'right' as const, color: '#333' }}>{fmt(deliveryFee)} Ar</span>
                        </p>
                        <p style={{ margin: '4px 0', color: '#888' }}>
                            Paiement : <span style={{ float: 'right' as const, color: '#333' }}>{methodLabel}</span>
                        </p>
                        {paymentRef && (
                            <p style={{ margin: '4px 0', color: '#888' }}>
                                Référence : <span style={{ float: 'right' as const, color: '#333' }}>{paymentRef}</span>
                            </p>
                        )}
                    </div>

                    <a
                        href={`${appUrl}/admin/orders`}
                        style={{ display: 'inline-block', marginTop: '28px', padding: '14px 24px', backgroundColor: '#28a745', color: '#fff', textDecoration: 'none', borderRadius: '30px', fontSize: '14px', fontWeight: 'bold' as const }}
                    >
                        Ouvrir dans le back-office
                    </a>

                    <p style={{ marginTop: '28px', paddingTop: '18px', borderTop: '1px solid #eee', fontSize: '12px', color: '#aaa' }}>
                        Message automatique du système Ndanty — ne pas répondre.
                    </p>
                </div>
            </div>
        </div>
    );
};

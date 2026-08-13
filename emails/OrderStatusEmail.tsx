import * as React from 'react';

type TrackedStatus = 'EN_PREPARATION' | 'EXPEDIEE' | 'LIVREE';

interface OrderStatusEmailProps {
    customerName: string;
    orderId: number;
    status: TrackedStatus;
    items: { name: string; price: number; quantity: number }[];
    total: number;
    deliveryZoneLabel?: string | null;
    appUrl: string;
}

const fmt = (n: number) => n.toLocaleString('fr-FR');

/** Étapes du tunnel de suivi, dans l'ordre — mêmes libellés que l'espace client. */
const STEPS: { key: TrackedStatus; label: string }[] = [
    { key: 'EN_PREPARATION', label: 'En préparation' },
    { key: 'EXPEDIEE', label: 'Expédiée' },
    { key: 'LIVREE', label: 'Livrée' },
];

const COPY: Record<TrackedStatus, { badge: string; title: string; message: string }> = {
    EN_PREPARATION: {
        badge: 'Commande en préparation',
        title: 'Votre commande est en préparation 🛠️',
        message: "Nos artisans préparent vos articles avec soin. Nous vous préviendrons dès leur départ de l'atelier.",
    },
    EXPEDIEE: {
        badge: 'Commande expédiée',
        title: 'Votre commande est en route 🚚',
        message: "Vos articles ont quitté notre atelier et sont en chemin. Notre livreur vous contactera au numéro indiqué lors de la commande.",
    },
    LIVREE: {
        badge: 'Commande livrée',
        title: 'Votre commande a été livrée ✅',
        message: "Votre commande a bien été remise. Nous espérons que vos nouveaux meubles vous plaisent — votre avis sur les articles reçus nous aide beaucoup.",
    },
};

/**
 * Email de suivi envoyé au client à chaque changement d'étape de sa commande.
 * Reprend la frise « Préparation ➔ Expédiée ➔ Livrée » de l'espace client.
 */
export const OrderStatusEmail: React.FC<Readonly<OrderStatusEmailProps>> = ({
    customerName, orderId, status, items, total, deliveryZoneLabel, appUrl,
}) => {
    const copy = COPY[status];
    const currentIndex = STEPS.findIndex((s) => s.key === status);

    return (
        <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', padding: '40px 20px', color: '#333' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>

                <div style={{ backgroundColor: '#2c3e50', padding: '30px', textAlign: 'center' as const }}>
                    <h1 style={{ color: '#fff', margin: 0, fontSize: '24px' }}>Ndanty.</h1>
                    <p style={{ color: '#9fe0b0', margin: '6px 0 0', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' as const }}>
                        {copy.badge}
                    </p>
                </div>

                <div style={{ padding: '40px' }}>
                    <h2 style={{ color: '#2c3e50', marginTop: 0 }}>{copy.title}</h2>
                    <p style={{ lineHeight: 1.6, fontSize: '16px' }}>
                        Bonjour {customerName}, votre commande <strong>#CMD-{orderId}</strong> vient de changer d'étape.
                    </p>
                    <p style={{ lineHeight: 1.6, fontSize: '15px', color: '#555' }}>{copy.message}</p>

                    {/* Frise de suivi */}
                    <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: '28px', borderCollapse: 'collapse' as const }}>
                        <tbody>
                        <tr>
                            {STEPS.map((step, index) => {
                                const reached = index <= currentIndex;
                                return (
                                    <td key={step.key} width="33%" style={{ textAlign: 'center' as const, verticalAlign: 'top' as const }}>
                                        <div style={{ height: '4px', backgroundColor: reached ? '#28a745' : '#eceff1', borderRadius: '4px' }} />
                                        <p style={{
                                            margin: '10px 0 0',
                                            fontSize: '11px',
                                            fontWeight: 'bold' as const,
                                            textTransform: 'uppercase' as const,
                                            letterSpacing: '0.5px',
                                            color: reached ? '#2c3e50' : '#b0bec5',
                                        }}>
                                            {step.label}
                                        </p>
                                    </td>
                                );
                            })}
                        </tr>
                        </tbody>
                    </table>

                    {/* Rappel du contenu */}
                    <div style={{ backgroundColor: '#f8faf9', border: '1px solid #e6f2ea', borderRadius: '14px', padding: '20px', marginTop: '28px', fontSize: '14px' }}>
                        {items.map((item, index) => (
                            <p key={index} style={{ margin: '6px 0', color: '#555' }}>
                                {item.name} <span style={{ color: '#999' }}>× {item.quantity}</span>
                                <span style={{ float: 'right' as const, color: '#333' }}>{fmt(item.price * item.quantity)} Ar</span>
                            </p>
                        ))}
                        {deliveryZoneLabel && (
                            <p style={{ margin: '12px 0 0', borderTop: '1px solid #e6f2ea', paddingTop: '12px', color: '#888' }}>
                                Livraison : <span style={{ float: 'right' as const, color: '#333' }}>{deliveryZoneLabel}</span>
                            </p>
                        )}
                        <p style={{ margin: '12px 0 0', borderTop: '1px solid #e6f2ea', paddingTop: '12px', fontWeight: 'bold' as const, color: '#2c3e50' }}>
                            Total : <span style={{ float: 'right' as const, color: '#28a745' }}>{fmt(total)} Ar</span>
                        </p>
                    </div>

                    <div style={{ textAlign: 'center' as const, marginTop: '30px' }}>
                        <a
                            href={`${appUrl}/dashboard`}
                            style={{
                                backgroundColor: '#28a745', color: '#ffffff', textDecoration: 'none',
                                padding: '14px 28px', borderRadius: '999px', fontSize: '13px',
                                fontWeight: 'bold' as const, letterSpacing: '0.5px', display: 'inline-block',
                            }}
                        >
                            Suivre ma commande
                        </a>
                    </div>

                    <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                        <p style={{ fontSize: '14px', color: '#888' }}>
                            À très bientôt,<br />
                            <strong>L'équipe Ndanty</strong>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

import * as React from 'react';

interface AdminEmailProps {
    customerName: string;
    email: string;
    details: string;
    phone?: string | null;
    dimensions?: string | null;
    quoteId?: number;
    /** Base URL du back-office : évite un lien localhost figé dans le template. */
    appUrl?: string;
}

/**
 * Alerte back-office : une nouvelle demande de devis « sur mesure » est arrivée.
 * Harmonisé avec l'alerte commande (même en-tête, même bouton d'action).
 */
export const AdminEmail: React.FC<Readonly<AdminEmailProps>> = ({
    customerName, email, details, phone, dimensions, quoteId, appUrl,
}) => {
    const base = (appUrl || 'http://localhost:3000').replace(/\/$/, '');

    return (
        <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', padding: '40px 20px', color: '#333' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>

                <div style={{ backgroundColor: '#2c3e50', padding: '24px 30px' }}>
                    <h1 style={{ color: '#fff', margin: 0, fontSize: '20px' }}>
                        Ndanty<span style={{ color: '#28a745' }}>Admin</span>
                    </h1>
                    <p style={{ color: '#aab6c2', margin: '6px 0 0', fontSize: '13px' }}>
                        Nouvelle demande sur mesure
                    </p>
                </div>

                <div style={{ padding: '30px 40px 40px' }}>
                    <span style={{ display: 'inline-block', backgroundColor: '#28a745', color: '#fff', fontSize: '11px', fontWeight: 'bold' as const, textTransform: 'uppercase' as const, letterSpacing: '1px', padding: '6px 12px', borderRadius: '20px' }}>
                        Devis à chiffrer
                    </span>

                    <h2 style={{ color: '#2c3e50', margin: '18px 0 6px', fontSize: '22px' }}>
                        {quoteId ? `Devis #DEV-${quoteId}` : 'Nouvelle demande de devis'}
                    </h2>

                    <div style={{ backgroundColor: '#f7f9fa', borderRadius: '12px', padding: '16px 18px', fontSize: '14px', lineHeight: 1.7, marginTop: '16px' }}>
                        <p style={{ margin: 0, color: '#2c3e50', fontWeight: 'bold' as const }}>{customerName}</p>
                        <p style={{ margin: 0, color: '#666' }}>{email}{phone ? ` · ${phone}` : ''}</p>
                        {dimensions && (
                            <p style={{ margin: '6px 0 0', color: '#666' }}>📐 Dimensions souhaitées : {dimensions}</p>
                        )}
                    </div>

                    <p style={{ margin: '24px 0 8px', fontSize: '12px', fontWeight: 'bold' as const, textTransform: 'uppercase' as const, letterSpacing: '1px', color: '#888' }}>
                        Description du projet
                    </p>
                    <div style={{ backgroundColor: '#fff', border: '1px solid #eee', borderLeft: '3px solid #28a745', padding: '16px 18px', borderRadius: '8px', fontSize: '14px', lineHeight: 1.7, color: '#444', whiteSpace: 'pre-wrap' as const }}>
                        {details}
                    </div>

                    <a
                        href={`${base}/admin/quotes`}
                        style={{ display: 'inline-block', marginTop: '28px', padding: '14px 24px', backgroundColor: '#28a745', color: '#fff', textDecoration: 'none', borderRadius: '30px', fontSize: '14px', fontWeight: 'bold' as const }}
                    >
                        Chiffrer dans le back-office
                    </a>

                    <p style={{ marginTop: '28px', paddingTop: '18px', borderTop: '1px solid #eee', fontSize: '12px', color: '#aaa' }}>
                        Message automatique du système Ndanty — ne pas répondre.
                    </p>
                </div>
            </div>
        </div>
    );
};

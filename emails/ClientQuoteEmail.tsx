import * as React from 'react';

interface EmailTemplateProps {
    customerName: string;
}

export const ClientQuoteEmail: React.FC<Readonly<EmailTemplateProps>> = ({
                                                                             customerName,
                                                                         }) => (
    <div style={{
        fontFamily: 'sans-serif',
        backgroundColor: '#f9f9f9',
        padding: '40px 20px',
        color: '#333'
    }}>
        <div style={{
            maxWidth: '600px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
        }}>
            <div style={{ backgroundColor: '#28a745', padding: '30px', textAlign: 'center' as const }}>
                <h1 style={{ color: '#fff', margin: 0, fontSize: '24px' }}>Ndanty.</h1>
            </div>
            <div style={{ padding: '40px' }}>
                <h2 style={{ color: '#2c3e50' }}>Bonjour {customerName},</h2>
                <p style={{ lineHeight: '1.6', fontSize: '16px' }}>
                    Nous avons bien reçu votre demande de devis. Notre équipe est déjà en train de l'étudier avec la plus grande attention.
                </p>
                <p style={{ lineHeight: '1.6', fontSize: '16px' }}>
                    Vous recevrez une réponse de notre part dans les plus brefs délais.
                </p>
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
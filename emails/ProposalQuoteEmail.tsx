import * as React from 'react';

interface ProposalEmailProps {
    customerName: string;
    proposedPrice: number;
    adminResponse?: string | null;
    details?: string | null;
    acceptUrl?: string;
    refuseUrl?: string;
}

/**
 * Email envoyé au client lorsque l'atelier Ndanty lui transmet sa proposition
 * de prix pour une demande "sur mesure".
 */
export const ProposalQuoteEmail: React.FC<Readonly<ProposalEmailProps>> = ({
    customerName,
    proposedPrice,
    adminResponse,
    details,
    acceptUrl,
    refuseUrl,
}) => (
    <div style={{
        fontFamily: 'sans-serif',
        backgroundColor: '#f9f9f9',
        padding: '40px 20px',
        color: '#333',
    }}>
        <div style={{
            maxWidth: '600px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
        }}>
            <div style={{ backgroundColor: '#28a745', padding: '30px', textAlign: 'center' as const }}>
                <h1 style={{ color: '#fff', margin: 0, fontSize: '24px' }}>Ndanty.</h1>
                <p style={{ color: '#e8f7ec', margin: '6px 0 0', fontSize: '13px', letterSpacing: '1px' }}>
                    VOTRE PROPOSITION SUR MESURE
                </p>
            </div>

            <div style={{ padding: '40px' }}>
                <h2 style={{ color: '#2c3e50', marginTop: 0, fontSize: '18px' }}>Bonjour {customerName},</h2>
                <p style={{ lineHeight: '1.7', fontSize: '15px', color: '#444' }}>
                    Nous vous remercions de la confiance que vous accordez à l'atelier Ndanty.
                    Après une étude attentive de votre demande, nous avons le plaisir de vous
                    adresser notre proposition tarifaire pour la réalisation de votre projet sur mesure.
                </p>

                {details && (
                    <div style={{
                        backgroundColor: '#f9f9f9',
                        borderRadius: '12px',
                        padding: '14px 18px',
                        margin: '20px 0',
                        fontSize: '14px',
                        color: '#555',
                        borderLeft: '3px solid #28a745',
                    }}>
                        <strong style={{ color: '#2c3e50' }}>Votre projet :</strong>
                        <br />
                        {details}
                    </div>
                )}

                {/* Bloc prix — taille sobre et professionnelle */}
                <div style={{
                    backgroundColor: '#f4fbf6',
                    border: '1px solid #d6efdd',
                    borderRadius: '12px',
                    padding: '18px 22px',
                    margin: '24px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <span style={{ fontSize: '13px', color: '#666', fontWeight: 'bold' }}>
                        Montant proposé
                    </span>
                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
                        {proposedPrice.toLocaleString('fr-FR')} Ar
                    </span>
                </div>

                {adminResponse && (
                    <div style={{ margin: '20px 0' }}>
                        <p style={{ fontSize: '13px', color: '#2c3e50', fontWeight: 'bold', marginBottom: '6px' }}>
                            Message de notre équipe :
                        </p>
                        <p style={{ lineHeight: '1.6', fontSize: '14px', color: '#555', whiteSpace: 'pre-line' as const }}>
                            {adminResponse}
                        </p>
                    </div>
                )}

                {/* Boutons de réponse en un clic */}
                {(acceptUrl || refuseUrl) && (
                    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: '8px auto 4px' }}>
                        <tbody>
                            <tr>
                                {acceptUrl && (
                                    <td style={{ padding: '6px' }}>
                                        <a
                                            href={acceptUrl}
                                            style={{
                                                display: 'inline-block',
                                                backgroundColor: '#28a745',
                                                color: '#ffffff',
                                                textDecoration: 'none',
                                                fontSize: '15px',
                                                fontWeight: 'bold',
                                                padding: '13px 28px',
                                                borderRadius: '10px',
                                            }}
                                        >
                                            ✓ Accepter le devis
                                        </a>
                                    </td>
                                )}
                                {refuseUrl && (
                                    <td style={{ padding: '6px' }}>
                                        <a
                                            href={refuseUrl}
                                            style={{
                                                display: 'inline-block',
                                                backgroundColor: '#ffffff',
                                                color: '#666666',
                                                textDecoration: 'none',
                                                fontSize: '15px',
                                                fontWeight: 'bold',
                                                padding: '13px 28px',
                                                borderRadius: '10px',
                                                border: '1px solid #dddddd',
                                            }}
                                        >
                                            Décliner
                                        </a>
                                    </td>
                                )}
                            </tr>
                        </tbody>
                    </table>
                )}

                <p style={{ lineHeight: '1.7', fontSize: '14px', color: '#666', textAlign: 'center' as const, marginTop: '4px' }}>
                    Un simple clic suffit pour nous donner votre réponse.<br />
                    Vous pouvez aussi répondre à cet email ou nous appeler — nous restons à votre disposition.
                </p>

                <div style={{ marginTop: '28px', paddingTop: '18px', borderTop: '1px solid #eee' }}>
                    <p style={{ fontSize: '14px', color: '#888', lineHeight: '1.5' }}>
                        Bien cordialement,<br />
                        <strong style={{ color: '#2c3e50' }}>L'équipe Ndanty</strong>
                    </p>
                </div>
            </div>
        </div>
    </div>
);

import * as React from 'react';

interface PasswordResetEmailProps {
    customerName?: string;
    resetUrl: string;
    /** Durée de validité du lien, en minutes (affichage). */
    expiresInMinutes?: number;
}

/**
 * Email de réinitialisation de mot de passe — template PRÊT à brancher.
 * Le flux complet (génération de jeton + page /reinitialiser) sera activé
 * dès qu'un service d'envoi avec domaine vérifié sera configuré.
 */
export const PasswordResetEmail: React.FC<Readonly<PasswordResetEmailProps>> = ({
    customerName, resetUrl, expiresInMinutes = 30,
}) => (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', padding: '40px 20px', color: '#333' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ backgroundColor: '#28a745', padding: '30px', textAlign: 'center' as const }}>
                <h1 style={{ color: '#fff', margin: 0, fontSize: '24px' }}>Ndanty.</h1>
            </div>
            <div style={{ padding: '40px' }}>
                <h2 style={{ color: '#2c3e50' }}>Réinitialisation de votre mot de passe</h2>
                <p style={{ lineHeight: 1.6, fontSize: '16px' }}>
                    Bonjour{customerName ? ` ${customerName}` : ''}, vous avez demandé à réinitialiser votre mot de passe.
                    Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
                </p>

                <div style={{ textAlign: 'center' as const, margin: '30px 0' }}>
                    <a
                        href={resetUrl}
                        style={{ backgroundColor: '#28a745', color: '#fff', textDecoration: 'none', padding: '14px 28px', borderRadius: '999px', fontWeight: 'bold' as const, fontSize: '14px', display: 'inline-block' }}
                    >
                        Réinitialiser mon mot de passe
                    </a>
                </div>

                <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.6 }}>
                    Ce lien expire dans {expiresInMinutes} minutes. Si vous n'êtes pas à l'origine de cette demande,
                    ignorez simplement cet email : votre mot de passe restera inchangé.
                </p>
                <p style={{ fontSize: '12px', color: '#aaa', wordBreak: 'break-all' as const }}>
                    Si le bouton ne fonctionne pas, copiez ce lien : {resetUrl}
                </p>

                <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                    <p style={{ fontSize: '14px', color: '#888' }}><strong>L'équipe Ndanty</strong></p>
                </div>
            </div>
        </div>
    </div>
);

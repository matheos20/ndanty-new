import * as React from 'react';

interface AdminEmailProps {
    customerName: string;
    email: string;
    details: string;
}

export const AdminEmail: React.FC<Readonly<AdminEmailProps>> = ({
                                                                    customerName, email, details
                                                                }) => (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', color: '#333' }}>
        <h2 style={{ borderBottom: '2px solid #28a745', paddingBottom: '10px' }}>Nouveau Devis Reçu !</h2>
        <p><strong>Client :</strong> {customerName}</p>
        <p><strong>Contact :</strong> {email}</p>
        <p><strong>Projet :</strong></p>
        <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
            {details}
        </div>
        <a href="http://localhost:3000/admin/quotes" style={{
            display: 'inline-block',
            marginTop: '20px',
            padding: '12px 20px',
            backgroundColor: '#2c3e50',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '5px'
        }}>Voir dans l'administration</a>
    </div>
);
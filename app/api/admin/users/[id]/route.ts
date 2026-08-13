// app/api/admin/users/[id]/route.ts
// Fiche client 360° : lecture réservée au back-office. La modale l'appelle à
// l'ouverture — on ne charge jamais l'historique complet de tous les clients
// dans la liste paginée.
import { NextResponse } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/guards';
import { getCustomerProfile } from '@/lib/admin/customer';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin();

        const { id } = await params;
        const userId = Number.parseInt(id, 10);
        if (Number.isNaN(userId)) {
            return NextResponse.json({ message: 'Identifiant client invalide.' }, { status: 400 });
        }

        const profile = await getCustomerProfile(userId);
        if (!profile) {
            return NextResponse.json({ message: 'Ce compte client n’existe plus.' }, { status: 404 });
        }

        return NextResponse.json(profile, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        console.error('Erreur fiche client :', error);
        return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
    }
}

// app/api/admin/notifications/route.ts
// Compteurs du back-office, interrogés périodiquement par la coquille d'administration.
import { NextResponse } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/guards';
import { getAdminNotifications } from '@/lib/admin/notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await requireAdmin();
        const counts = await getAdminNotifications();
        return NextResponse.json(counts, {
            // Ces compteurs ne doivent jamais être servis depuis un cache.
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch (error: any) {
        if (error instanceof AuthError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        console.error('Erreur des compteurs back-office :', error);
        return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
    }
}

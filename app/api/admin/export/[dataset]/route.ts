// app/api/admin/export/[dataset]/route.ts
// Téléchargement des exports CSV du back-office.
// L'export d'un fichier clients ou d'un journal de ventes est une extraction de
// données sensibles : la route est strictement réservée aux administrateurs, et
// chaque téléchargement laisse lui-même une trace dans le journal d'audit.

import { NextResponse } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/guards';
import { buildExport, exportFilename, isExportDataset, type ExportFilters } from '@/lib/admin/export';
import { recordAudit } from '@/lib/admin/audit';

export const dynamic = 'force-dynamic';

/** Borne de date issue d'un `<input type="date">` ; `null` si la saisie est invalide. */
function parseDate(raw: string | null, endOfDay: boolean): Date | null {
    if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    const [year, month, day] = raw.split('-').map(Number);
    const date = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ dataset: string }> }
) {
    try {
        const session = await requireAdmin();

        const { dataset } = await params;
        if (!isExportDataset(dataset)) {
            return NextResponse.json({ message: `Export inconnu : ${dataset}.` }, { status: 400 });
        }

        const url = new URL(request.url);
        const filters: ExportFilters = {
            from: parseDate(url.searchParams.get('du'), false),
            to: parseDate(url.searchParams.get('au'), true),
            scope: url.searchParams.get('perimetre') === 'TOUTES' ? 'TOUTES' : 'REGLEES',
            entity: url.searchParams.get('objet') || undefined,
            actor: url.searchParams.get('auteur') || undefined,
            search: url.searchParams.get('q') || undefined,
        };

        const csv = await buildExport(dataset, filters);
        const filename = exportFilename(dataset, filters.from, filters.to);

        // Le nombre de lignes exportées est la première chose qu'on veut vérifier
        // en cas de contestation : on le trace.
        await recordAudit({
            action: 'export.download',
            entity: 'order',
            entityId: dataset,
            label: filename,
            summary: `Export « ${dataset} » téléchargé (${Math.max(0, csv.split('\r\n').length - 2)} ligne(s), périmètre ${filters.scope})`,
            metadata: {
                dataset,
                from: filters.from?.toISOString() || null,
                to: filters.to?.toISOString() || null,
                scope: filters.scope,
            },
            actorEmail: session?.user?.email,
        });

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }
        console.error('Erreur export CSV :', error);
        return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
    }
}

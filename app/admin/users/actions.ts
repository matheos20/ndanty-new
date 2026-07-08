// app/admin/users/actions.ts
'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ensureAdmin } from "@/lib/guards";

// Action pour supprimer un utilisateur
export async function deleteUserAction(id: number) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        await prisma.user.delete({
            where: { id }
        });

        // Rafraîchit les données du tableau instantanément sans recharger la page
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Impossible de supprimer cet utilisateur." };
    }
}

// Action pour suspendre ou réactiver un utilisateur (Bascule du statut)
export async function toggleSuspendUserAction(id: number, currentRole: string) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        // Optionnel : Si tu as un champ `status` ou `isSuspended` dans ton schéma Prisma, utilise-le.
        // Sinon, on bascule temporairement le rôle en "SUSPENDED"
        const newRole = currentRole === 'SUSPENDED' ? 'USER' : 'SUSPENDED';

        await prisma.user.update({
            where: { id },
            data: { role: newRole }
        });

        revalidatePath('/admin/users');
        return { success: true, newRole };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Erreur lors du changement de statut." };
    }
}

// Action pour modifier les informations de l'utilisateur
export async function updateUserAction(id: number, data: { firstName: string; lastName: string; email: string; role: string }) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        await prisma.user.update({
            where: { id },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                role: data.role
            }
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Erreur lors de la mise à jour de l'utilisateur." };
    }
}
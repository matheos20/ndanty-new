// app/admin/users/actions.ts
'use server';

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ensureAdmin } from "@/lib/guards";
import { validatePassword } from "@/lib/password";
import { recordAudit, describeChange } from "@/lib/admin/audit";

/** Rôles pilotables depuis le back-office. */
const ASSIGNABLE_ROLES = ['USER', 'ADMIN', 'SUSPENDED'] as const;
type AssignableRole = typeof ASSIGNABLE_ROLES[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Vérifie qu'un administrateur n'agit pas sur son PROPRE compte.
 * Se retirer les droits, se suspendre ou se supprimer soi-même ferme la porte
 * du back-office de l'intérieur — on l'interdit avant d'écrire en base.
 */
async function ensureNotSelf(targetId: number, sessionEmail: string | null | undefined, verb: string) {
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { email: true } });
    if (!target) return { ok: false as const, error: "Ce compte n'existe plus." };
    if (sessionEmail && target.email.toLowerCase() === sessionEmail.toLowerCase()) {
        return { ok: false as const, error: `Vous ne pouvez pas ${verb} votre propre compte administrateur.` };
    }
    return { ok: true as const, email: target.email };
}

/** Garde-fou : la boutique doit toujours conserver au moins un administrateur actif. */
async function wouldRemoveLastAdmin(targetId: number, nextRole: string): Promise<boolean> {
    if (nextRole === 'ADMIN') return false;
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true } });
    if (target?.role !== 'ADMIN') return false;
    const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
    return admins <= 1;
}

// Action pour supprimer un utilisateur
export async function deleteUserAction(id: number) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        const self = await ensureNotSelf(id, guard.session.user?.email, 'supprimer');
        if (!self.ok) return { success: false, error: self.error };

        if (await wouldRemoveLastAdmin(id, 'USER')) {
            return { success: false, error: "Impossible : ce compte est le dernier administrateur de la boutique." };
        }

        const deleted = await prisma.user.delete({
            where: { id }
        });

        await recordAudit({
            action: "user.delete",
            entity: "user",
            entityId: id,
            label: deleted.email,
            summary: `Compte ${deleted.role} supprimé définitivement (${deleted.firstName || ''} ${deleted.lastName || ''})`.trim(),
            metadata: { role: deleted.role, createdAt: deleted.createdAt },
            actorEmail: guard.session.user?.email,
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

        const self = await ensureNotSelf(id, guard.session.user?.email, 'suspendre');
        if (!self.ok) return { success: false, error: self.error };

        // Optionnel : Si tu as un champ `status` ou `isSuspended` dans ton schéma Prisma, utilise-le.
        // Sinon, on bascule temporairement le rôle en "SUSPENDED"
        const newRole = currentRole === 'SUSPENDED' ? 'USER' : 'SUSPENDED';

        if (await wouldRemoveLastAdmin(id, newRole)) {
            return { success: false, error: "Impossible : ce compte est le dernier administrateur de la boutique." };
        }

        await prisma.user.update({
            where: { id },
            data: { role: newRole }
        });

        await recordAudit({
            action: newRole === 'SUSPENDED' ? "user.suspend" : "user.restore",
            entity: "user",
            entityId: id,
            label: self.email,
            summary: newRole === 'SUSPENDED'
                ? "Compte suspendu : connexion bloquée"
                : "Compte réactivé : connexion rétablie",
            metadata: { from: currentRole, to: newRole },
            actorEmail: guard.session.user?.email,
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

        const email = (data.email || '').trim().toLowerCase();
        if (!EMAIL_RE.test(email)) {
            return { success: false, error: "L'adresse e-mail saisie n'est pas valide." };
        }
        if (!ASSIGNABLE_ROLES.includes(data.role as AssignableRole)) {
            return { success: false, error: "Rôle inconnu." };
        }

        // Un administrateur peut corriger ses propres coordonnées, mais pas se retirer ses droits.
        const isSelf = guard.session.user?.email?.toLowerCase() === (
            await prisma.user.findUnique({ where: { id }, select: { email: true } })
        )?.email.toLowerCase();
        if (isSelf && data.role !== 'ADMIN') {
            return { success: false, error: "Vous ne pouvez pas retirer vos propres droits d'administrateur." };
        }
        if (await wouldRemoveLastAdmin(id, data.role)) {
            return { success: false, error: "Impossible : ce compte est le dernier administrateur de la boutique." };
        }

        // L'e-mail sert d'identifiant de connexion : il doit rester unique.
        const duplicate = await prisma.user.findFirst({
            where: { email, NOT: { id } },
            select: { id: true },
        });
        if (duplicate) {
            return { success: false, error: "Un autre compte utilise déjà cette adresse e-mail." };
        }

        const before = await prisma.user.findUnique({
            where: { id },
            select: { firstName: true, lastName: true, email: true, role: true },
        });

        await prisma.user.update({
            where: { id },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email,
                role: data.role
            }
        });

        const changes = [
            describeChange("Prénom", before?.firstName, data.firstName),
            describeChange("Nom", before?.lastName, data.lastName),
            describeChange("E-mail", before?.email, email),
            describeChange("Rôle", before?.role, data.role),
        ].filter(Boolean) as string[];

        await recordAudit({
            action: before?.role !== data.role ? "user.role" : "user.update",
            entity: "user",
            entityId: id,
            label: email,
            summary: changes.length ? changes.join(" · ") : "Fiche enregistrée sans modification de valeur",
            metadata: { before, after: { ...data, email } },
            actorEmail: guard.session.user?.email,
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Erreur lors de la mise à jour de l'utilisateur." };
    }
}

export interface CreateUserInput {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: string;
    address?: string;
    country?: string;
}

/**
 * ACTION : Créer un compte depuis le back-office — client ou administrateur.
 * Remplace le recours obligatoire à `npm run seed` pour ouvrir un accès gestionnaire.
 * Le mot de passe suit la politique Ndanty et n'est JAMAIS stocké en clair.
 */
export async function createUserAction(input: CreateUserInput) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        const firstName = (input.firstName || '').trim();
        const lastName = (input.lastName || '').trim();
        const email = (input.email || '').trim().toLowerCase();
        const role = input.role;

        if (!firstName || !lastName) {
            return { success: false, error: "Le prénom et le nom sont obligatoires." };
        }
        if (!EMAIL_RE.test(email)) {
            return { success: false, error: "L'adresse e-mail saisie n'est pas valide." };
        }
        // Un compte suspendu à la création n'a aucun sens : on ne propose que USER et ADMIN.
        if (role !== 'USER' && role !== 'ADMIN') {
            return { success: false, error: "Rôle invalide pour une création de compte." };
        }

        const pwCheck = validatePassword(input.password || '');
        if (!pwCheck.ok) {
            return { success: false, error: pwCheck.error };
        }

        const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (existing) {
            return { success: false, error: "Un compte utilise déjà cette adresse e-mail." };
        }

        const created = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                password: await bcrypt.hash(input.password, 12),
                role,
                provider: 'credentials',
                address: (input.address || '').trim() || null,
                country: (input.country || '').trim() || null,
            },
            select: { id: true, email: true, role: true },
        });

        await recordAudit({
            action: "user.create",
            entity: "user",
            entityId: created.id,
            label: created.email,
            summary: created.role === 'ADMIN'
                ? `Ouverture d'un ACCÈS GESTIONNAIRE pour ${firstName} ${lastName}`
                : `Compte client créé pour ${firstName} ${lastName}`,
            metadata: { role: created.role, provider: 'credentials' },
            actorEmail: guard.session.user?.email,
        });

        revalidatePath('/admin/users');
        return { success: true, user: created };
    } catch (error) {
        console.error("Erreur création de compte :", error);
        return { success: false, error: "Impossible de créer ce compte." };
    }
}

/**
 * ACTION : Réinitialiser le mot de passe d'un compte depuis le back-office.
 * Utile quand un gestionnaire perd son accès : l'administrateur lui en fixe un
 * nouveau, à changer ensuite depuis son espace personnel.
 */
export async function resetUserPasswordAction(id: number, newPassword: string) {
    try {
        const guard = await ensureAdmin();
        if (!guard.ok) return { success: false, error: guard.error };

        const pwCheck = validatePassword(newPassword || '');
        if (!pwCheck.ok) return { success: false, error: pwCheck.error };

        const target = await prisma.user.findUnique({ where: { id }, select: { email: true, provider: true } });
        if (!target) return { success: false, error: "Ce compte n'existe plus." };
        if (target.provider === 'google') {
            return { success: false, error: "Ce compte se connecte via Google : il n'a pas de mot de passe local." };
        }

        await prisma.user.update({
            where: { id },
            data: {
                password: await bcrypt.hash(newPassword, 12),
                // Un mot de passe fixé par l'administrateur invalide toute demande
                // de réinitialisation encore en circulation.
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        await recordAudit({
            action: "user.password",
            entity: "user",
            entityId: id,
            label: target.email,
            summary: "Mot de passe réinitialisé par un administrateur",
            actorEmail: guard.session.user?.email,
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error("Erreur réinitialisation mot de passe :", error);
        return { success: false, error: "Impossible de réinitialiser ce mot de passe." };
    }
}

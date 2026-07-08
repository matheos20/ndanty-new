// types/next-auth.d.ts
// Augmentation des types NextAuth pour exposer les champs personnalisés Ndanty
// (rôle, id, prénom, adresse) sur session.user et le JWT.
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id?: string;
            role?: string;
            firstName?: string | null;
            lastName?: string | null;
            address?: string | null;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
    }

    interface User {
        id: string;
        role?: string;
        firstName?: string | null;
        lastName?: string | null;
        address?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string;
        role?: string;
        firstName?: string | null;
    }
}

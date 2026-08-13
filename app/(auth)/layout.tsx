// app/(auth)/layout.tsx
import React from "react";

export default function AuthLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
            {/* On peut ajouter ici un décor de fond discret si on veut */}
            <div className="w-full">
                {children}
            </div>
        </div>
    );
}
// app/api/auth/[[...nextauth]]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// La configuration vit dans lib/auth.ts (source unique, partagée par getServerSession).
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

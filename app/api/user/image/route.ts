import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) return NextResponse.json({ image: null });

    const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: { image: true }
    });

    return NextResponse.json({ image: user?.image || null });
}
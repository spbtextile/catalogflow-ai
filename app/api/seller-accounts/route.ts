import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.sellerAccount.findMany({
    orderBy: { created_at: "desc" },
    include: { users: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });

  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, marketplace, status } = await req.json();
  if (!name || !marketplace) {
    return NextResponse.json({ error: "name and marketplace are required" }, { status: 400 });
  }

  const account = await prisma.sellerAccount.create({
    data: { name, marketplace, status: status ?? "active" },
  });

  return NextResponse.json(account, { status: 201 });
}

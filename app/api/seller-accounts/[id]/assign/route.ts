import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: seller_account_id } = await params;
  const { user_id, permission_level } = await req.json();

  if (!user_id) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  const assignment = await prisma.userSellerAccount.upsert({
    where: { user_id_seller_account_id: { user_id, seller_account_id } },
    create: { user_id, seller_account_id, permission_level: permission_level ?? "read" },
    update: { permission_level: permission_level ?? "read" },
  });

  return NextResponse.json(assignment);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: seller_account_id } = await params;
  const { user_id } = await req.json();

  await prisma.userSellerAccount.delete({
    where: { user_id_seller_account_id: { user_id, seller_account_id } },
  });

  return NextResponse.json({ success: true });
}

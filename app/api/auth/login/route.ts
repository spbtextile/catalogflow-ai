import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { SESSION_COOKIE, signSession } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ message: "Enter a valid email and password." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: {
      email: parsed.data.email.toLowerCase(),
    },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);

  if (!passwordMatches) {
    return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
  }

  const token = await signSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}


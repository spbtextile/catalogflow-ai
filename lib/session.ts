import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

export const getSession = cache(async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  return verifySessionToken(token);
});

export const requireSession = cache(async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
});

export const getCurrentUser = cache(async function getCurrentUser() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      assignedSellerAccounts: {
        include: {
          sellerAccount: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!user || !user.isActive) {
    redirect("/login");
  }

  return user;
});

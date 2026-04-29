"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function logout() {
    setIsLoading(true);
    await fetch("/api/auth/logout", {
      method: "POST",
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      className="flex h-10 w-full items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink transition hover:border-moss hover:text-moss disabled:opacity-60"
      type="button"
      onClick={logout}
      disabled={isLoading}
    >
      <LogOut aria-hidden className="h-4 w-4" />
      {isLoading ? "Signing out..." : "Sign out"}
    </button>
  );
}


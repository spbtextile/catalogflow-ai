import { Sidebar } from "@/components/dashboard/sidebar";
import { getCurrentUser } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
      <Sidebar user={user} />
      <main className="min-w-0 px-5 py-6 sm:px-8 lg:px-10">{children}</main>
    </div>
  );
}


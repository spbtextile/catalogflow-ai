import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [userCount, accountCount, profileCount] = await Promise.all([
    prisma.user.count(),
    prisma.sellerAccount.count(),
    prisma.categoryProfile.count(),
  ]);

  const stats = [
    { label: "Team Members", value: userCount, color: "indigo" },
    { label: "Seller Accounts", value: accountCount, color: "emerald" },
    { label: "Category Profiles", value: profileCount, color: "violet" },
    { label: "Active Jobs", value: 0, color: "amber" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Welcome back — here&apos;s an overview of your workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5"
          >
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
              {stat.label}
            </p>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: "Add seller account", href: "/seller-accounts" },
              { label: "Assign staff member", href: "/staff" },
              { label: "Create category profile", href: "/category-profiles" },
            ].map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition group"
              >
                <span className="text-sm text-slate-300 group-hover:text-white transition">
                  {action.label}
                </span>
                <svg className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">System Status</h2>
          <div className="space-y-3">
            {[
              { label: "Database", status: "Connected" },
              { label: "Job Queue (Redis)", status: "Pending setup" },
              { label: "AI Agents", status: "Ready" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{item.label}</span>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { ClipboardList, Store, Users } from "lucide-react";

import { DataPanel, EmptyState, SectionHeader, StatCard } from "@/components/dashboard/ui";
import { formatDate, titleCase } from "@/lib/format";
import { canManageWorkspace, formatRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const canManage = canManageWorkspace(user.role);

  const [staffCount, sellerCount, categoryCount, recentAssignments, categoryProfiles] = await Promise.all([
    canManage ? prisma.user.count() : Promise.resolve(1),
    canManage
      ? prisma.sellerAccount.count()
      : Promise.resolve(user.assignedSellerAccounts.filter((assignment) => assignment.sellerAccount.isActive).length),
    prisma.categoryProfile.count({
      where: {
        isActive: true,
      },
    }),
    prisma.userSellerAccount.findMany({
      where: canManage
        ? undefined
        : {
            userId: user.id,
          },
      include: {
        user: true,
        sellerAccount: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 6,
    }),
    prisma.categoryProfile.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        categoryName: "asc",
      },
      take: 6,
    }),
  ]);

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Dashboard"
        description="Phase 1 workspace for staff access, seller account assignment, category rules, and catalog operations readiness."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Staff users" value={staffCount} hint={canManage ? "Active workspace users" : formatRole(user.role)} />
        <StatCard label="Seller accounts" value={sellerCount} hint={canManage ? "Marketplace seller profiles" : "Assigned to you"} />
        <StatCard label="Category profiles" value={categoryCount} hint="SKU, image, and listing rules" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.6fr)]">
        <DataPanel>
          <div className="mb-4 flex items-center gap-2">
            <Store aria-hidden className="h-5 w-5 text-moss" />
            <h2 className="text-lg font-semibold text-ink">Recent seller access</h2>
          </div>

          {recentAssignments.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[660px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
                    <th className="py-3 font-semibold">User</th>
                    <th className="py-3 font-semibold">Seller account</th>
                    <th className="py-3 font-semibold">Marketplace</th>
                    <th className="py-3 font-semibold">Permission</th>
                    <th className="py-3 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recentAssignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td className="py-3 text-ink">{assignment.user.name}</td>
                      <td className="py-3 text-ink">{assignment.sellerAccount.name}</td>
                      <td className="py-3 text-muted">{assignment.sellerAccount.marketplace}</td>
                      <td className="py-3 text-muted">{titleCase(assignment.permissionLevel)}</td>
                      <td className="py-3 text-muted">{formatDate(assignment.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No seller account assignments yet." />
          )}
        </DataPanel>

        <DataPanel>
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList aria-hidden className="h-5 w-5 text-amber" />
            <h2 className="text-lg font-semibold text-ink">Category profiles</h2>
          </div>

          {categoryProfiles.length ? (
            <div className="space-y-3">
              {categoryProfiles.map((profile) => (
                <div className="rounded-md border border-line p-3" key={profile.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{profile.categoryName}</p>
                      <p className="mt-1 text-sm text-muted">
                        {titleCase(profile.imageStyle)} images, {titleCase(profile.listingStyle)} listing
                      </p>
                    </div>
                    <span className="rounded-md bg-paper px-2 py-1 text-xs font-medium text-muted">
                      {profile.requiresPrint ? "Print" : "No print"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No category profiles configured." />
          )}
        </DataPanel>
      </div>

      <DataPanel>
        <div className="flex items-center gap-2">
          <Users aria-hidden className="h-5 w-5 text-berry" />
          <h2 className="text-lg font-semibold text-ink">Phase 1 scope</h2>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-muted md:grid-cols-4">
          <p className="rounded-md bg-paper p-3">JWT login with HTTP-only session cookie</p>
          <p className="rounded-md bg-paper p-3">Roles: super admin, admin, staff, viewer</p>
          <p className="rounded-md bg-paper p-3">Seller-account permissions per staff user</p>
          <p className="rounded-md bg-paper p-3">Category profile rules for later catalog phases</p>
        </div>
      </DataPanel>
    </div>
  );
}


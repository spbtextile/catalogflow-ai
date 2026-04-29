import { saveAssignment } from "@/app/dashboard/actions";
import { DataPanel, EmptyState, Field, SectionHeader, buttonClass, selectClass } from "@/components/dashboard/ui";
import { titleCase } from "@/lib/format";
import { canManageWorkspace, formatRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const permissions = ["owner", "manager", "editor", "viewer"] as const;

export default async function AssignmentsPage() {
  const user = await getCurrentUser();
  const canManage = canManageWorkspace(user.role);

  const [users, sellerAccounts, assignments] = canManage
    ? await Promise.all([
        prisma.user.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
        }),
        prisma.sellerAccount.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
        }),
        prisma.userSellerAccount.findMany({
          include: {
            user: true,
            sellerAccount: true,
          },
          orderBy: {
            updatedAt: "desc",
          },
        }),
      ])
    : [[], [], user.assignedSellerAccounts.map((assignment) => ({ ...assignment, user, sellerAccount: assignment.sellerAccount }))];

  return (
    <div className="space-y-6">
      <SectionHeader title="Assignments" description="Map staff to seller accounts with an explicit permission level for marketplace work." />

      <div className="grid gap-5 xl:grid-cols-[minmax(340px,0.42fr)_minmax(0,1fr)]">
        {canManage ? (
          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Assign seller account</h2>
            <form action={saveAssignment} className="mt-5 space-y-4">
              <Field label="User">
                <select className={selectClass} name="userId" required>
                  {users.map((workspaceUser) => (
                    <option key={workspaceUser.id} value={workspaceUser.id}>
                      {workspaceUser.name} - {formatRole(workspaceUser.role)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Seller account">
                <select className={selectClass} name="sellerAccountId" required>
                  {sellerAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {account.marketplace}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Permission">
                <select className={selectClass} defaultValue="editor" name="permissionLevel">
                  {permissions.map((permission) => (
                    <option key={permission} value={permission}>
                      {titleCase(permission)}
                    </option>
                  ))}
                </select>
              </Field>
              <button className={buttonClass} type="submit">
                Save assignment
              </button>
            </form>
          </DataPanel>
        ) : null}

        <DataPanel>
          <h2 className="text-lg font-semibold text-ink">{canManage ? "Seller access matrix" : "Your seller access"}</h2>
          {assignments.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[660px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
                    <th className="py-3 font-semibold">User</th>
                    <th className="py-3 font-semibold">Role</th>
                    <th className="py-3 font-semibold">Seller account</th>
                    <th className="py-3 font-semibold">Permission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td className="py-3 font-medium text-ink">{assignment.user.name}</td>
                      <td className="py-3 text-muted">{formatRole(assignment.user.role)}</td>
                      <td className="py-3 text-muted">
                        {assignment.sellerAccount.name} ({assignment.sellerAccount.marketplace})
                      </td>
                      <td className="py-3 text-muted">{titleCase(assignment.permissionLevel)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No seller account assignments yet." />
          )}
        </DataPanel>
      </div>
    </div>
  );
}


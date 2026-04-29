import { saveUser } from "@/app/dashboard/actions";
import { DataPanel, EmptyState, Field, SectionHeader, buttonClass, inputClass, selectClass } from "@/components/dashboard/ui";
import { formatDate } from "@/lib/format";
import { canManageWorkspace, formatRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const roles = ["super_admin", "admin", "staff", "viewer"] as const;

export default async function StaffPage() {
  const user = await getCurrentUser();
  const canManage = canManageWorkspace(user.role);

  const users = canManage
    ? await prisma.user.findMany({
        orderBy: {
          createdAt: "desc",
        },
      })
    : [];

  return (
    <div className="space-y-6">
      <SectionHeader title="Staff" description="Create and manage internal users with role-based access." />

      {!canManage ? (
        <DataPanel>
          <EmptyState message="Your role can view assigned catalog work but cannot manage staff accounts." />
        </DataPanel>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(340px,0.42fr)_minmax(0,1fr)]">
          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Add or update staff</h2>
            <form action={saveUser} className="mt-5 space-y-4">
              <Field label="Name">
                <input className={inputClass} name="name" placeholder="Catalog Staff" required />
              </Field>
              <Field label="Email">
                <input className={inputClass} name="email" placeholder="staff@spbtextile.com" required type="email" />
              </Field>
              <Field label="Temporary password">
                <input className={inputClass} minLength={8} name="password" required type="password" />
              </Field>
              <Field label="Role">
                <select className={selectClass} defaultValue="staff" name="role">
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {formatRole(role)}
                    </option>
                  ))}
                </select>
              </Field>
              <button className={buttonClass} type="submit">
                Save staff
              </button>
            </form>
          </DataPanel>

          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Workspace users</h2>
            {users.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
                      <th className="py-3 font-semibold">Name</th>
                      <th className="py-3 font-semibold">Email</th>
                      <th className="py-3 font-semibold">Role</th>
                      <th className="py-3 font-semibold">Status</th>
                      <th className="py-3 font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {users.map((workspaceUser) => (
                      <tr key={workspaceUser.id}>
                        <td className="py-3 font-medium text-ink">{workspaceUser.name}</td>
                        <td className="py-3 text-muted">{workspaceUser.email}</td>
                        <td className="py-3 text-muted">{formatRole(workspaceUser.role)}</td>
                        <td className="py-3 text-muted">{workspaceUser.isActive ? "Active" : "Inactive"}</td>
                        <td className="py-3 text-muted">{formatDate(workspaceUser.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No users have been created yet." />
            )}
          </DataPanel>
        </div>
      )}
    </div>
  );
}


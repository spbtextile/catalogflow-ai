import { saveSellerAccount } from "@/app/dashboard/actions";
import { DataPanel, EmptyState, Field, SectionHeader, buttonClass, inputClass, selectClass } from "@/components/dashboard/ui";
import { formatDate } from "@/lib/format";
import { canManageWorkspace } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const marketplaces = ["Amazon", "Flipkart", "Myntra", "Meesho", "Shopify", "JioMart"] as const;

export default async function SellerAccountsPage() {
  const user = await getCurrentUser();
  const canManage = canManageWorkspace(user.role);

  const accounts = canManage
    ? await prisma.sellerAccount.findMany({
        include: {
          _count: {
            select: {
              assignments: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      })
    : user.assignedSellerAccounts.map((assignment) => ({
        ...assignment.sellerAccount,
        _count: { assignments: 1 },
      }));

  return (
    <div className="space-y-6">
      <SectionHeader title="Seller accounts" description="Register marketplace seller profiles and keep account codes consistent for later catalog exports." />

      <div className="grid gap-5 xl:grid-cols-[minmax(340px,0.42fr)_minmax(0,1fr)]">
        {canManage ? (
          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Add or update account</h2>
            <form action={saveSellerAccount} className="mt-5 space-y-4">
              <Field label="Account name">
                <input className={inputClass} name="name" placeholder="SPB Textile Amazon" required />
              </Field>
              <Field label="Account code">
                <input className={inputClass} name="accountCode" placeholder="AMZ-SPB-01" required />
              </Field>
              <Field label="Marketplace">
                <select className={selectClass} defaultValue="Amazon" name="marketplace">
                  {marketplaces.map((marketplace) => (
                    <option key={marketplace} value={marketplace}>
                      {marketplace}
                    </option>
                  ))}
                </select>
              </Field>
              <button className={buttonClass} type="submit">
                Save account
              </button>
            </form>
          </DataPanel>
        ) : null}

        <DataPanel>
          <h2 className="text-lg font-semibold text-ink">{canManage ? "All seller accounts" : "Assigned seller accounts"}</h2>
          {accounts.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[660px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
                    <th className="py-3 font-semibold">Name</th>
                    <th className="py-3 font-semibold">Code</th>
                    <th className="py-3 font-semibold">Marketplace</th>
                    <th className="py-3 font-semibold">Staff</th>
                    <th className="py-3 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {accounts.map((account) => (
                    <tr key={account.id}>
                      <td className="py-3 font-medium text-ink">{account.name}</td>
                      <td className="py-3 text-muted">{account.accountCode}</td>
                      <td className="py-3 text-muted">{account.marketplace}</td>
                      <td className="py-3 text-muted">{account._count.assignments}</td>
                      <td className="py-3 text-muted">{formatDate(account.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No seller accounts are available yet." />
          )}
        </DataPanel>
      </div>
    </div>
  );
}


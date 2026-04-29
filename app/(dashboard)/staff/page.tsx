"use client";

import { useEffect, useState } from "react";

type PermissionLevel = "read" | "write" | "admin";
type Marketplace = "amazon" | "ebay" | "walmart" | "etsy" | "shopify" | "other";
type Status = "active" | "inactive" | "suspended";
type Role = "admin" | "manager" | "staff";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface SellerAccount {
  id: string;
  name: string;
  marketplace: Marketplace;
  status: Status;
  users: {
    user: { id: string; name: string; email: string };
    permission_level: PermissionLevel;
  }[];
}

const ROLE_COLORS: Record<Role, string> = {
  admin: "text-purple-400 bg-purple-950/50 border-purple-800/50",
  manager: "text-blue-400 bg-blue-950/50 border-blue-800/50",
  staff: "text-slate-400 bg-slate-800 border-slate-700",
};

const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  read: "Read",
  write: "Write",
  admin: "Admin",
};

const MARKETPLACE_LABELS: Record<Marketplace, string> = {
  amazon: "Amazon",
  ebay: "eBay",
  walmart: "Walmart",
  etsy: "Etsy",
  shopify: "Shopify",
  other: "Other",
};

export default function StaffPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<SellerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    seller_account_id: "",
    permission_level: "read" as PermissionLevel,
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchUser, setSearchUser] = useState("");

  async function loadData() {
    setLoading(true);
    const [usersRes, accountsRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/seller-accounts"),
    ]);
    if (usersRes.ok) setUsers(await usersRes.json());
    if (accountsRes.ok) setAccounts(await accountsRes.json());
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function getUserAssignments(userId: string) {
    return accounts.flatMap((a) =>
      a.users
        .filter((u) => u.user.id === userId)
        .map((u) => ({ account: a, permission_level: u.permission_level }))
    );
  }

  function getUnassignedAccounts(userId: string) {
    const assignedIds = new Set(
      accounts
        .filter((a) => a.users.some((u) => u.user.id === userId))
        .map((a) => a.id)
    );
    return accounts.filter((a) => !assignedIds.has(a.id));
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    await fetch(`/api/seller-accounts/${assignForm.seller_account_id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: selectedUser.id,
        permission_level: assignForm.permission_level,
      }),
    });
    setShowAssignModal(false);
    setAssignForm({ seller_account_id: "", permission_level: "read" });
    await loadData();
    setSubmitting(false);
  }

  async function handleRevoke(userId: string, accountId: string) {
    if (!confirm("Remove this assignment?")) return;
    await fetch(`/api/seller-accounts/${accountId}/assign`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    await loadData();
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Staff Assignment</h1>
        <p className="text-slate-400 text-sm mt-1">
          Assign team members to seller accounts and manage their permissions
        </p>
      </div>

      <div className="mb-5">
        <input
          type="text"
          placeholder="Search staff by name or email…"
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
          className="w-full max-w-sm bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Assign Modal */}
      {showAssignModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-white font-semibold text-lg mb-1">Assign to Account</h2>
            <p className="text-slate-400 text-sm mb-5">
              Assigning <span className="text-indigo-400 font-medium">{selectedUser.name}</span>
            </p>
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Seller Account</label>
                <select
                  required
                  value={assignForm.seller_account_id}
                  onChange={(e) => setAssignForm({ ...assignForm, seller_account_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select an account…</option>
                  {getUnassignedAccounts(selectedUser.id).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({MARKETPLACE_LABELS[a.marketplace]})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Permission Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["read", "write", "admin"] as PermissionLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setAssignForm({ ...assignForm, permission_level: level })}
                      className={`py-2 rounded-lg text-sm font-medium border transition ${
                        assignForm.permission_level === level
                          ? "bg-indigo-600/30 border-indigo-500 text-indigo-300"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {PERMISSION_LABELS[level]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAssignModal(false); }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-4 py-2.5 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !assignForm.seller_account_id}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
                >
                  {submitting ? "Assigning…" : "Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-20 text-slate-500 text-sm">No staff members found</div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => {
            const assignments = getUserAssignments(user.id);
            const unassigned = getUnassignedAccounts(user.id);
            return (
              <div key={user.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-semibold text-sm shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{user.name}</p>
                      <p className="text-slate-500 text-xs">{user.email}</p>
                    </div>
                    <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>
                      {user.role}
                    </span>
                  </div>
                  {unassigned.length > 0 && (
                    <button
                      onClick={() => { setSelectedUser(user); setShowAssignModal(true); }}
                      className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-950/60 border border-indigo-800/50 px-3 py-1.5 rounded-lg transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Assign Account
                    </button>
                  )}
                </div>

                {assignments.length === 0 ? (
                  <div className="px-5 py-4 text-slate-600 text-xs">
                    No accounts assigned — click &quot;Assign Account&quot; to get started
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {assignments.map(({ account, permission_level }) => (
                      <div key={account.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                          <span className="text-sm text-slate-300">{account.name}</span>
                          <span className="text-xs text-slate-500">{MARKETPLACE_LABELS[account.marketplace]}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
                            {PERMISSION_LABELS[permission_level]}
                          </span>
                          <button
                            onClick={() => handleRevoke(user.id, account.id)}
                            className="text-slate-600 hover:text-red-400 transition p-1 rounded"
                            title="Remove assignment"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

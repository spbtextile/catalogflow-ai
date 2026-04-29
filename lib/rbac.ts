import type { UserRole } from "@prisma/client";

const roleLabels: Record<UserRole, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  staff: "Staff",
  viewer: "Viewer",
};

export function formatRole(role: UserRole) {
  return roleLabels[role];
}

export function canManageWorkspace(role: UserRole) {
  return role === "super_admin" || role === "admin";
}

export function canEditCatalog(role: UserRole) {
  return role === "super_admin" || role === "admin" || role === "staff";
}


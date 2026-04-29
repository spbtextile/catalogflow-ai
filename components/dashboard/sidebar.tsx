import {
  Boxes,
  BrainCircuit,
  BriefcaseBusiness,
  ClipboardList,
  FileSpreadsheet,
  Image,
  LayoutDashboard,
  PackagePlus,
  Palette,
  Rocket,
  ShieldCheck,
  Store,
  Users,
  Workflow,
} from "lucide-react";
import Link from "next/link";

import { LogoutButton } from "@/components/dashboard/logout-button";
import { formatRole } from "@/lib/rbac";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "Products", icon: PackagePlus },
  { href: "/dashboard/images", label: "Images", icon: Image },
  { href: "/dashboard/listings", label: "Listings", icon: FileSpreadsheet },
  { href: "/dashboard/prints", label: "Prints", icon: Palette },
  { href: "/dashboard/bulk-jobs", label: "Bulk jobs", icon: Workflow },
  { href: "/dashboard/agents", label: "Agents", icon: BrainCircuit },
  { href: "/dashboard/memory", label: "Memory", icon: BriefcaseBusiness },
  { href: "/dashboard/marketplace-push", label: "Marketplace push", icon: Rocket },
  { href: "/dashboard/staff", label: "Staff", icon: Users },
  { href: "/dashboard/seller-accounts", label: "Seller accounts", icon: Store },
  { href: "/dashboard/assignments", label: "Assignments", icon: ShieldCheck },
  { href: "/dashboard/category-profiles", label: "Category profiles", icon: ClipboardList },
];

type SidebarProps = {
  user: {
    name: string;
    email: string;
    role: Parameters<typeof formatRole>[0];
  };
};

export function Sidebar({ user }: SidebarProps) {
  return (
    <aside className="flex min-h-screen w-full flex-col border-r border-line bg-white px-4 py-5 lg:w-72">
      <div className="mb-8 flex items-center gap-3 px-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white">
          <Boxes aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-semibold text-ink">CatalogFlow AI</p>
          <p className="text-xs text-muted">SPB Textile</p>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted transition hover:bg-paper hover:text-ink"
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4 rounded-lg border border-line bg-paper p-3">
        <div>
          <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
          <p className="mt-2 inline-flex rounded-md bg-white px-2 py-1 text-xs font-medium text-moss">
            {formatRole(user.role)}
          </p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}

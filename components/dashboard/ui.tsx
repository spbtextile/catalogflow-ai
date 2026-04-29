import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string | number;
  hint: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-sm text-muted">{hint}</p>
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2 text-sm font-medium text-ink">
      <span>{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10";

export const selectClass =
  "h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10";

export const buttonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-moss";

export function DataPanel({ children }: { children: ReactNode }) {
  return <section className="rounded-lg border border-line bg-white p-5 shadow-sm">{children}</section>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-line bg-paper px-4 py-8 text-center text-sm text-muted">
      {message}
    </div>
  );
}


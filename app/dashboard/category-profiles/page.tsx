import { saveCategoryProfile } from "@/app/dashboard/actions";
import { DataPanel, EmptyState, Field, SectionHeader, buttonClass, inputClass, selectClass } from "@/components/dashboard/ui";
import { titleCase } from "@/lib/format";
import { canManageWorkspace } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const imageStyles = ["white_bg", "lifestyle", "studio"] as const;
const listingStyles = ["short", "detailed", "premium"] as const;
const agents = [
  { value: "sku", label: "SKU Agent" },
  { value: "listing", label: "Listing Agent" },
  { value: "image_audit", label: "Image Audit Agent" },
  { value: "excel_export", label: "Excel Export Agent" },
  { value: "quality_check", label: "Quality Check Agent" },
  { value: "variant", label: "Variant Agent" },
] as const;

function readSkuRules(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { prefix: "-", numberingFormat: "-", example: "-" };
  }

  const rules = value as Record<string, unknown>;

  return {
    prefix: typeof rules.prefix === "string" ? rules.prefix : "-",
    numberingFormat: typeof rules.numberingFormat === "string" ? rules.numberingFormat : "-",
    example: typeof rules.example === "string" ? rules.example : "-",
  };
}

export default async function CategoryProfilesPage() {
  const user = await getCurrentUser();
  const canManage = canManageWorkspace(user.role);

  const categoryProfiles = await prisma.categoryProfile.findMany({
    orderBy: {
      categoryName: "asc",
    },
  });

  return (
    <div className="space-y-6">
      <SectionHeader title="Category profiles" description="Configure category-level SKU rules, image requirements, listing style, and enabled agents." />

      <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.44fr)_minmax(0,1fr)]">
        {canManage ? (
          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Add or update profile</h2>
            <form action={saveCategoryProfile} className="mt-5 space-y-4">
              <Field label="Category name">
                <input className={inputClass} name="categoryName" placeholder="Kids T-shirt" required />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Image style">
                  <select className={selectClass} defaultValue="white_bg" name="imageStyle">
                    {imageStyles.map((style) => (
                      <option key={style} value={style}>
                        {titleCase(style)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Listing style">
                  <select className={selectClass} defaultValue="detailed" name="listingStyle">
                    {listingStyles.map((style) => (
                      <option key={style} value={style}>
                        {titleCase(style)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="SKU prefix">
                  <input className={inputClass} name="skuPrefix" placeholder="KTS" required />
                </Field>
                <Field label="Numbering format">
                  <input className={inputClass} name="numberingFormat" placeholder="0000" required />
                </Field>
              </div>

              <label className="flex items-center gap-3 rounded-md border border-line bg-paper px-3 py-3 text-sm font-medium text-ink">
                <input className="h-4 w-4 accent-moss" name="requiresPrint" type="checkbox" />
                Requires print generation
              </label>

              <div className="space-y-3">
                <p className="text-sm font-medium text-ink">Enabled agents</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {agents.map((agent) => (
                    <label className="flex items-center gap-3 rounded-md border border-line px-3 py-2 text-sm text-muted" key={agent.value}>
                      <input
                        className="h-4 w-4 accent-moss"
                        defaultChecked={agent.value === "sku" || agent.value === "listing"}
                        name="enabledAgents"
                        type="checkbox"
                        value={agent.value}
                      />
                      {agent.label}
                    </label>
                  ))}
                </div>
              </div>

              <button className={buttonClass} type="submit">
                Save profile
              </button>
            </form>
          </DataPanel>
        ) : null}

        <DataPanel>
          <h2 className="text-lg font-semibold text-ink">Configured profiles</h2>
          {categoryProfiles.length ? (
            <div className="mt-4 space-y-3">
              {categoryProfiles.map((profile) => {
                const skuRules = readSkuRules(profile.skuRules);

                return (
                  <article className="rounded-lg border border-line p-4" key={profile.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-ink">{profile.categoryName}</h3>
                        <p className="mt-1 text-sm text-muted">Example SKU: {skuRules.example}</p>
                      </div>
                      <span className="w-fit rounded-md bg-paper px-2 py-1 text-xs font-medium text-muted">
                        {profile.requiresPrint ? "Print required" : "No print"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <div className="rounded-md bg-paper p-3">
                        <p className="text-muted">Image</p>
                        <p className="mt-1 font-medium text-ink">{titleCase(profile.imageStyle)}</p>
                      </div>
                      <div className="rounded-md bg-paper p-3">
                        <p className="text-muted">Listing</p>
                        <p className="mt-1 font-medium text-ink">{titleCase(profile.listingStyle)}</p>
                      </div>
                      <div className="rounded-md bg-paper p-3">
                        <p className="text-muted">SKU prefix</p>
                        <p className="mt-1 font-medium text-ink">{skuRules.prefix}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {profile.enabledAgents.map((agent) => (
                        <span className="rounded-md bg-moss/10 px-2 py-1 text-xs font-medium text-moss" key={agent}>
                          {titleCase(agent)}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState message="No category profiles configured yet." />
          )}
        </DataPanel>
      </div>
    </div>
  );
}


import { FileSpreadsheet } from "lucide-react";
import { Field, SectionHeader } from "@/components/dashboard/ui";
import { importGoogleSheet } from "./actions";

export default function ImportsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <SectionHeader
        title="Import SKUs"
        description="Paste a Google Sheets URL to import SKUs and generate product designs."
      />

      <div className="mt-8 rounded-xl border border-line bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">Google Sheets Import</h2>
            <p className="text-sm text-muted">Provide a public link to your sheet</p>
          </div>
        </div>

        <form action={importGoogleSheet} className="space-y-4">
          <Field label="Google Sheets URL">
            <input
              type="url"
              name="sheetUrl"
              required
              placeholder="https://docs.google.com/spreadsheets/d/1U0QqOCIBzaYSB1wM4E8x-UtOsKc2E-A6-L6I8XR3Y0g/edit"
              className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </Field>

          <p className="text-xs text-muted">
            Must be accessible to anyone with the link. E.g. https://docs.google.com/spreadsheets/d/...<br />
            The sheet should have columns like <strong>SKU</strong>, <strong>FSN</strong>, and <strong>Main Image URL</strong>.
            Products will be automatically grouped into Designs based on the SKU prefix (e.g. FK_TEAM-INDIA_MENS_001).
          </p>

          <div className="pt-2 text-right">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              Import designs
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

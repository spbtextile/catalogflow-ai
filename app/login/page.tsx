import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-paper lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.55fr)]">
      <section className="flex min-h-[38vh] items-end bg-ink px-6 py-10 text-white lg:min-h-screen lg:px-12">
        <div className="max-w-3xl">
          <div className="mb-7 inline-flex items-center gap-3 rounded-md border border-white/20 px-3 py-2 text-sm text-white/80">
            <span className="h-2.5 w-2.5 rounded-full bg-moss" />
            SPB Textile internal workspace
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-normal md:text-6xl">
            CatalogFlow AI
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/72">
            Manage seller accounts, category rules, staff access, and the catalog workflow from one controlled dashboard.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-lg border border-line bg-panel p-7 shadow-soft">
          <div className="mb-7">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Secure login</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Sign in to continue</h2>
            <p className="mt-2 text-sm text-muted">Use your assigned SPB Textile staff account.</p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}


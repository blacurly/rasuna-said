import SwaggerDocs from "@/components/docs/SwaggerDocs";

export const metadata = { title: "Dokumentasi API | AIRA" };

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-aira-bg px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header>
          <h1 className="text-2xl font-bold text-aira-primary">Dokumentasi API AIRA</h1>
          <p className="mt-2 text-sm text-aira-text/70">Spesifikasi OpenAPI diambil dari endpoint aktual. Endpoint privat memerlukan sesi Supabase.</p>
          <a className="mt-2 inline-flex text-sm font-semibold text-aira-primary underline" href="/api/openapi" target="_blank" rel="noreferrer">Buka spesifikasi OpenAPI JSON</a>
        </header>
        <SwaggerDocs />
      </div>
    </main>
  );
}

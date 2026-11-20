import AdminSidebar from "@/components/admin/AdminSidebar";

// Kerangka layout bersama untuk seluruh halaman admin AIRA.
export default function AdminShell({ admin, children }) {
  return (
    <main className="min-h-screen w-full bg-aira-bg">
      <div
        className="
          mx-auto grid w-full max-w-[1280px]
          grid-cols-1 items-start
          gap-6
          px-4 py-8
          sm:px-6 sm:py-9
          lg:grid-cols-[230px_minmax(0,1fr)]
          lg:gap-8
          lg:px-8 lg:py-10
          xl:gap-9 xl:px-10
        "
      >
        {/* Sidebar */}
        <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start lg:pt-4">
          <AdminSidebar admin={admin} />
        </aside>

        {/* Konten halaman */}
        <section className="min-w-0 space-y-7 sm:space-y-8">
          {children}
        </section>
      </div>
    </main>
  );
}
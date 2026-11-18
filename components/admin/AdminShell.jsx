import AdminSidebar from "@/components/admin/AdminSidebar";

// Kerangka tunggal untuk semua halaman admin: lebar, sidebar, dan jarak antar-blok sama.
export default function AdminShell({ admin, children }) {
  return (
    <main className="min-h-screen w-full bg-aira-bg">
      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-start gap-6 px-4 py-6 sm:px-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        <AdminSidebar admin={admin} />
        <div className="min-w-0 space-y-5">{children}</div>
      </div>
    </main>
  );
} 
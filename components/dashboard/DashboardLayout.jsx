import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardProfile from "@/components/dashboard/DashboardProfile";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { inisialDari } from "@/lib/inisial";

// Kerangka Dashboard User mengikuti Figma Make: header, kartu profil + menu samping, dan area isi.
// Footer ditampilkan oleh ConditionalFooter pada app/layout.js.
export default function DashboardLayout({ profile, anggotaKeluarga, children }) {
  const inisial = inisialDari(profile?.full_name);

  // text-base + tracking-normal: meniadakan aturan tipografi global agar sama dengan Figma Make.
  return (
    <div className="min-h-[calc(100dvh-72px)] bg-aira-bg text-base [&_h1]:tracking-normal [&_h2]:tracking-normal [&_h3]:tracking-normal">
      <DashboardHeader inisial={inisial} />

      <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-5 lg:grid lg:grid-cols-[250px_1fr] lg:gap-10 lg:py-10">
        <aside className="lg:sticky lg:top-[96px] lg:self-start">
          <DashboardProfile
            nama={profile?.full_name}
            inisial={inisial}
            anggotaKeluarga={anggotaKeluarga}
          />
          <DashboardSidebar />
        </aside>

        <div className="fade-up mt-6 min-w-0 lg:mt-0">{children}</div>
      </div>
    </div>
  );
}

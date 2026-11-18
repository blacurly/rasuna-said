import KontribusiClient from "@/components/dashboard/kontribusi/KontribusiClient";
import { ambilProfilDashboard } from "@/lib/dashboardProfile";
import { ambilKontribusiSaya } from "@/services/kontribusiUserService";

export const metadata = {
  title: "Kontribusi Titik Air - AIRA",
};

// B04 - Kontribusi Titik Air.
// Dua versi: User Baru (belum pernah berkontribusi) dan User Lama (sudah ada kontribusi).
export default async function KontribusiTitikAirPage() {
  await ambilProfilDashboard();
  const { items } = await ambilKontribusiSaya();

  return <KontribusiClient items={items} />;
}

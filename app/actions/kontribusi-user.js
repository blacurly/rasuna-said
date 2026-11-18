"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { formKePayload } from "@/lib/kontribusiUser";
import { submitWaterPointContribution } from "@/services/contributionService";

// Kirim kontribusi dari formulir Kontribusi Titik Air (B04).
// Wilayah (provinsi/kabupaten/kecamatan) diambil dari rumah tangga pengguna; admin
// dapat mengoreksinya saat verifikasi. `perbaikiId` diisi saat "Perbaiki dan Kirim Ulang".
export async function kirimKontribusiUserAction(form, perbaikiId = null) {
  try {
    if (!String(form?.name ?? "").trim() || !String(form?.address ?? "").trim()) {
      return { success: false, message: "Nama titik air dan alamat lengkap wajib diisi." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Silakan masuk terlebih dahulu." };

    const { data: rumah } = await supabase
      .from("households")
      .select("province_id, city_regency_id, district_id")
      .eq("owner_user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!rumah?.province_id || !rumah?.city_regency_id) {
      return {
        success: false,
        message:
          "Lokasi rumah tangga Anda belum diisi. Lengkapi dulu lewat Kalkulator Air agar titik air dapat dikaitkan ke wilayah yang tepat.",
      };
    }

    const id = Number(perbaikiId);
    const data = await submitWaterPointContribution(
      formKePayload(form, rumah, Number.isSafeInteger(id) && id > 0 ? id : null),
    );

    revalidatePath("/dashboard/kontribusi");
    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error?.message || "Kontribusi gagal dikirim." };
  }
}

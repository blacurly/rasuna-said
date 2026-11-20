"use server";

import { revalidatePath } from "next/cache";
import { requireApiAdmin } from "@/lib/auth/authorization";
import { normalizeIndonesianPhone } from "@/lib/phone";

const AVAILABILITY_TO_DB = {
  Tersedia: "available",
  Terbatas: "limited",
  "Tidak Tersedia": "unavailable",
  "Belum Diketahui": "unknown",
};

const SOURCES = new Set([
  "Pantauan langsung admin",
  "Pengelola setempat",
  "Laporan warga",
  "Lainnya",
]);

export async function simpanTitikAirAction({ pointId, perubahan, sumber }) {
  try {
    const { supabase, user } = await requireApiAdmin();
    const id = Number(pointId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return { success: false, message: "ID titik air tidak valid." };
    }
    if (!perubahan || typeof perubahan !== "object") {
      return { success: false, message: "Data perubahan tidak valid." };
    }

    const name = String(perubahan.name || "").trim();
    const address = String(perubahan.address || "").trim();
    const hours = String(perubahan.hours || "").trim();
    const note = String(perubahan.note || "").trim();
    const contact = String(perubahan.contact || "").trim();
    const rawPhone = String(perubahan.phone || "").trim();
    const phone = rawPhone ? normalizeIndonesianPhone(rawPhone) : null;
    const availability = AVAILABILITY_TO_DB[perubahan.availability];

    if (!name || name.length > 200) {
      return { success: false, message: "Nama titik air wajib diisi dan maksimal 200 karakter." };
    }
    if (!address || address.length > 500) {
      return { success: false, message: "Alamat wajib diisi dan maksimal 500 karakter." };
    }
    if (!availability) {
      return { success: false, message: "Status ketersediaan tidak valid." };
    }
    if (hours.length > 150 || note.length > 1000 || contact.length > 150) {
      return { success: false, message: "Jam operasional, nama pengelola, atau catatan melebihi batas karakter." };
    }
    if (rawPhone && !phone) {
      return { success: false, message: "Nomor telepon pengelola tidak valid." };
    }
    if (!SOURCES.has(sumber)) {
      return { success: false, message: "Sumber pembaruan wajib dipilih." };
    }

    const { data: existing, error: lookupError } = await supabase
      .from("water_points")
      .select("water_point_id, point_name, address_detail, availability_status, opening_hours, description, information_source")
      .eq("water_point_id", id)
      .eq("verification_status", "verified")
      .eq("is_active", true)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!existing) {
      return { success: false, message: "Titik air tidak ditemukan atau tidak aktif." };
    }

    const { data, error: updateError } = await supabase
      .from("water_points")
      .update({
        point_name: name,
        address_detail: address,
        availability_status: availability,
        opening_hours: hours || null,
        contact_person: contact || null,
        phone_number: phone,
        description: note || null,
        information_source: sumber,
        last_status_checked_at: new Date().toISOString(),
      })
      .eq("water_point_id", id)
      .eq("verification_status", "verified")
      .eq("is_active", true)
      .select("water_point_id")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!data) throw new Error("Perubahan titik air tidak tersimpan.");

    // Identitas admin disertakan pada metadata respons/log aplikasi; audit log
    // persisten belum ditulis sebelum constraint action_type diverifikasi dari SQL.
    console.info("[AIRA Admin] Titik air diperbarui", {
      waterPointId: id,
      adminUserId: user.id,
      source: sumber,
      previousAvailability: existing.availability_status,
      newAvailability: availability,
    });

    revalidatePath("/admin/kelola-titik-air");
    revalidatePath("/navigasi-air");
    revalidatePath(`/navigasi-air/${id}`);

    return { success: true, message: "Informasi titik air berhasil diperbarui." };
  } catch (error) {
    console.error("[AIRA Admin] Gagal memperbarui titik air:", error);
    return {
      success: false,
      message: error?.message || "Gagal memperbarui informasi titik air.",
    };
  }
}

// Soft-delete: nonaktifkan titik air terverifikasi tanpa menghapus histori/relasi.
export async function nonaktifkanTitikAirAction(pointId) {
  try {
    const { supabase, user } = await requireApiAdmin();
    const id = Number(pointId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return { success: false, message: "ID titik air tidak valid." };
    }

    const { data, error } = await supabase
      .from("water_points")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("water_point_id", id)
      .eq("verification_status", "verified")
      .eq("is_active", true)
      .select("water_point_id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return { success: false, message: "Titik air tidak ditemukan, sudah nonaktif, atau tidak dapat diakses." };

    console.info("[AIRA Admin] Titik air dinonaktifkan", { waterPointId: id, adminUserId: user.id });
    revalidatePath("/admin/kelola-titik-air");
    revalidatePath("/navigasi-air");
    revalidatePath(`/navigasi-air/${id}`);
    return { success: true, message: "Titik air berhasil dinonaktifkan dan dihapus dari daftar aktif." };
  } catch (error) {
    console.error("[AIRA Admin] Gagal menonaktifkan titik air:", error);
    return { success: false, message: error?.message || "Gagal menonaktifkan titik air." };
  }
}

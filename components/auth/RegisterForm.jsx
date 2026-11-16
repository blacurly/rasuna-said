"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { UserRound, Mail, Phone } from "lucide-react";

import FormField from "@/components/auth/FormField";
import FormMessage from "@/components/auth/FormMessage";
import PasswordField from "@/components/auth/PasswordField";
import TermsPrivacyDialog from "@/components/auth/TermsPrivacyDialog";

import { Button } from "@/components/ui/button";
import { register } from "@/app/actions/auth";

const initialForm = {
  nama: "",
  email: "",
  whatsapp: "",
  password: "",
  konfirmasiPassword: "",
  persetujuan: false,
};

export default function RegisterForm() {
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [isPending, startTransition] = useTransition();

  // STATE MODAL KETENTUAN DAN PRIVASI
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeDocument, setActiveDocument] = useState("terms");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setNotice(null);
  };

  // MEMBUKA DOKUMEN SESUAI PILIHAN PENGGUNA
  const openDocument = (document) => {
    setActiveDocument(document);
    setDialogOpen(true);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nama.trim()) {
      newErrors.nama = "Nama lengkap wajib diisi.";
    } else if (formData.nama.trim().length < 3) {
      newErrors.nama = "Nama minimal 3 karakter.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email.trim()) {
      newErrors.email = "Email wajib diisi.";
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = "Format email tidak valid.";
    }

    const phone = formData.whatsapp.replace(/[\s-]/g, "");
    const phoneRegex = /^(\+62|62|0)[0-9]{8,13}$/;

    if (!formData.whatsapp.trim()) {
      newErrors.whatsapp = "Nomor WhatsApp wajib diisi.";
    } else if (!phoneRegex.test(phone)) {
      newErrors.whatsapp = "Masukkan nomor WhatsApp yang valid.";
    }

    if (!formData.password) {
      newErrors.password = "Kata sandi wajib diisi.";
    } else if (formData.password.length < 8) {
      newErrors.password = "Kata sandi minimal 8 karakter.";
    }

    if (!formData.konfirmasiPassword) {
      newErrors.konfirmasiPassword =
        "Konfirmasi kata sandi wajib diisi.";
    } else if (
      formData.password !== formData.konfirmasiPassword
    ) {
      newErrors.konfirmasiPassword =
        "Konfirmasi kata sandi tidak sama.";
    }

    if (!formData.persetujuan) {
      newErrors.persetujuan =
        "Kamu harus menyetujui Ketentuan Layanan dan Kebijakan Privasi AIRA.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setNotice(null);

    // VALIDASI FRONTEND
    if (!validateForm()) {
      setNotice({
        type: "error",
        text: "Periksa kembali data yang kamu masukkan.",
      });

      return;
    }

    // FORMAT DATA UNTUK SERVER ACTION
    const payload = new FormData();

    payload.append("full_name", formData.nama);
    payload.append("email", formData.email);
    payload.append("password", formData.password);
    payload.append(
      "confirm_password",
      formData.konfirmasiPassword
    );

    if (formData.persetujuan) {
      payload.append("agreement", "on");
    }

    // PROSES REGISTRASI SUPABASE
    startTransition(async () => {
      try {
        const res = await register(payload);

        if (res?.error) {
          setNotice({
            type: "error",
            text: res.error,
          });
        } else if (res?.success) {
          setNotice({
            type: "success",
            text: res.success,
          });
        }
      } catch (error) {
        console.error("REGISTER FORM ERROR:", error);

        setNotice({
          type: "error",
          text: "Terjadi kesalahan saat mendaftarkan akun. Silakan coba kembali.",
        });
      }
    });
  };

  return (
    <>
      <form
        noValidate
        onSubmit={handleSubmit}
        className="mt-7 space-y-5"
      >
        {/* NAMA LENGKAP */}
        <FormField
          icon={UserRound}
          label="Nama lengkap"
          name="nama"
          type="text"
          placeholder="Contoh: Siti Rahma"
          autoComplete="name"
          value={formData.nama}
          onChange={handleChange}
          error={errors.nama}
        />

        {/* EMAIL */}
        <FormField
          icon={Mail}
          label="Email"
          name="email"
          type="email"
          placeholder="nama@email.com"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
        />

        {/* WHATSAPP */}
        <FormField
          icon={Phone}
          label="Nomor WhatsApp"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          placeholder="0812-3456-7890"
          autoComplete="tel"
          value={formData.whatsapp}
          onChange={handleChange}
          error={errors.whatsapp}
        />

        {/* PASSWORD */}
        <PasswordField
          autoComplete="new-password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
        />

        {/* KONFIRMASI PASSWORD */}
        <PasswordField
          label="Konfirmasi kata sandi"
          name="konfirmasiPassword"
          autoComplete="new-password"
          value={formData.konfirmasiPassword}
          onChange={handleChange}
          error={errors.konfirmasiPassword}
        />

        {/* PERSETUJUAN */}
        <div>
          <label className="flex min-h-11 items-start gap-2 text-sm text-aira-text">
            <input
              type="checkbox"
              name="persetujuan"
              checked={formData.persetujuan}
              onChange={handleChange}
              aria-invalid={!!errors.persetujuan}
              className="
                mt-1 size-4 shrink-0
                accent-aira-primary
              "
            />

            <span className="leading-relaxed">
              Saya setuju dengan{" "}
              <button
                type="button"
                onClick={() => openDocument("terms")}
                className="
                  font-semibold text-aira-primary
                  underline underline-offset-2
                  hover:text-aira-primary-dark
                "
              >
                Ketentuan Layanan
              </button>
              {" "}dan{" "}
              <button
                type="button"
                onClick={() => openDocument("privacy")}
                className="
                  font-semibold text-aira-primary
                  underline underline-offset-2
                  hover:text-aira-primary-dark
                "
              >
                Kebijakan Privasi AIRA
              </button>
              .
            </span>
          </label>

          {errors.persetujuan && (
            <p
              role="alert"
              className="
                mt-1.5 text-sm font-medium
                text-aira-danger-dark
              "
            >
              {errors.persetujuan}
            </p>
          )}
        </div>

        {/* PESAN VALIDASI */}
        {notice && (
          <FormMessage type={notice.type}>
            {notice.text}
          </FormMessage>
        )}

        {/* TOMBOL REGISTRASI */}
        <Button
          type="submit"
          disabled={isPending}
          className="
            h-14 w-full rounded-full
            bg-aira-primary px-8
            text-lg font-semibold text-white
            shadow-soft
            hover:bg-aira-primary-dark
            disabled:opacity-50
          "
        >
          {isPending ? "Mendaftarkan..." : "Daftar Sekarang"}
        </Button>
      </form>

      {/* LINK LOGIN */}
      <p className="mt-6 text-center text-[15px]">
        Sudah punya akun?{" "}
        <Link
          href="/masuk"
          className="font-semibold text-aira-primary underline"
        >
          Masuk
        </Link>
      </p>

      {/* MODAL KETENTUAN DAN PRIVASI */}
      <TermsPrivacyDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialTab={activeDocument}
      />
    </>
  );
} 
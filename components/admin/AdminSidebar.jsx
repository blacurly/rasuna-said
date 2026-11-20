"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  Droplets,
  LogOut,
} from "lucide-react";

import LogoutDialog from "@/components/LogoutDialog";

const menuItems = [
  {
    label: "Ringkasan & Riwayat",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Verifikasi Kontribusi",
    href: "/admin/verifikasi",
    icon: ClipboardCheck,
  },
  {
    label: "Kelola Titik Air",
    href: "/admin/kelola-titik-air",
    icon: Droplets,
  },
];

// Kartu sidebar sesuai Figma Make (AdminShell): sudut 16px, garis tipis, bayangan lembut.
// Radius ditulis rounded-[16px] karena rounded-2xl di repo ini = 18px (lihat globals.css).
const kartu =
  "rounded-[16px] border border-aira-primary/10 bg-white shadow-[0_5px_20px_rgba(23,107,120,0.08)]";

export default function AdminSidebar({ admin }) {
  const pathname = usePathname();

  const [konfirmasiLogout, setKonfirmasiLogout] = useState(false);

  const tutupKonfirmasi = useCallback(() => {
    setKonfirmasiLogout(false);
  }, []);

  return (
    <>
      <aside className="w-full min-w-0 space-y-3 lg:sticky lg:top-6 lg:self-start">
        {/* Profil Admin */}
        <div className={`${kartu} flex items-center gap-3 p-4`}>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-aira-primary text-sm font-bold text-white">
            {admin?.initials || "AA"}
          </div>

          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">Admin AIRA</p>

            <p className="text-[11px] text-aira-text/60">
              Peninjau & pengelola data
            </p>
          </div>
        </div>

        {/* Navigasi Admin */}
        <nav
          aria-label="Navigasi admin"
          className={`${kartu} flex gap-1 overflow-x-auto overscroll-x-contain p-2 lg:flex-col lg:overflow-visible`}
        >
          {menuItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-[44px] shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-2.5 text-[13px] font-semibold transition-colors lg:rounded-[12px] ${
                  isActive
                    ? "bg-aira-primary text-white"
                    : "text-aira-primary hover:bg-aira-sage/40"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout Admin */}
        <div className={`${kartu} p-2`}>
          <button
            type="button"
            onClick={() => setKonfirmasiLogout(true)}
            className="flex min-h-[44px] w-full items-center gap-2.5 rounded-[12px] px-4 py-2.5 text-[13px] font-semibold text-[#b4472c] transition-colors hover:bg-aira-peach/20"
          >
            <LogOut className="size-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Dialog Konfirmasi Logout */}
      <LogoutDialog open={konfirmasiLogout} onClose={tutupKonfirmasi} />
    </>
  );
}

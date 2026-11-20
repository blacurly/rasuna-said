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

export default function AdminSidebar({ admin }) {
  const pathname = usePathname();

  const [konfirmasiLogout, setKonfirmasiLogout] = useState(false);

  const tutupKonfirmasi = useCallback(() => {
    setKonfirmasiLogout(false);
  }, []);

  return (
    <>
      <aside className="w-full min-w-0 space-y-3">

        {/* Profil Admin */}
        <div className="flex items-center gap-2.5 rounded-[16px] bg-white px-3 py-3 shadow-soft">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-aira-primary text-xs font-bold text-white">
            {admin?.initials || "AA"}
          </div>

          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight text-aira-text">
              Admin AIRA
            </p>

            <p className="mt-0.5 text-[11px] leading-tight text-aira-text/55">
              Peninjau & pengelola data
            </p>
          </div>
        </div>

        {/* Navigasi Admin */}
        <nav
          aria-label="Navigasi admin"
          className="flex flex-row gap-1 overflow-x-auto rounded-[16px] bg-white p-2 shadow-soft lg:flex-col lg:overflow-visible"
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
                className={`flex items-center gap-2.5 whitespace-nowrap rounded-[12px] px-3 py-2.5 text-[13px] font-semibold leading-tight transition-colors ${
                  isActive
                    ? "bg-aira-primary text-white"
                    : "text-aira-primary hover:bg-aira-sage/20"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Admin */}
        <div className="rounded-[16px] bg-white p-2 shadow-soft">
          <button
            type="button"
            onClick={() => setKonfirmasiLogout(true)}
            className="flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[13px] font-semibold text-aira-coral-dark transition-colors hover:bg-aira-coral-dark/10"
          >
            <LogOut className="size-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>

      </aside>

      {/* Dialog Konfirmasi Logout */}
      <LogoutDialog
        open={konfirmasiLogout}
        onClose={tutupKonfirmasi}
      />
    </>
  );
} 
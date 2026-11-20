// Header halaman admin.
//
// Mode biasa (default): tampilan lama, tidak berubah, jadi halaman admin lain aman.
// Mode `large`: judul besar seperti di Figma Make untuk C03 (judul 36px, deskripsi 18px).
//   Di mode ini tombol aksi ditaruh oleh halaman pemanggil (lihat KelolaTitikAir),
//   sehingga prop `action` tidak dipakai.

// Header halaman admin dengan jarak yang konsisten.
// components/admin/AdminPageHeader.jsx

export default function AdminPageHeader({
  title,
  description,
  action,
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-aira-primary/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-bold text-aira-primary sm:text-[28px]">
          {title}
        </h1>

        {description && (
          <p className="text-sm leading-relaxed text-aira-text-secondary">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
    </header>
  );
}
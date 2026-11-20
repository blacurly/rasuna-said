// Header halaman admin.
//
// Mode biasa (default): tampilan lama, tidak berubah, jadi halaman admin lain aman.
// Mode `large`: judul besar seperti di Figma Make untuk C03 (judul 36px, deskripsi 18px).
//   Di mode ini tombol aksi ditaruh oleh halaman pemanggil (lihat KelolaTitikAir),
//   sehingga prop `action` tidak dipakai.
export default function AdminPageHeader({
  title,
  description,
  action,
  large = false,
}) {
  if (large) {
    return (
      <header>
        <p className="text-xs text-aira-primary/70">Panel Admin / {title}</p>
        <h1 className="mt-1 text-4xl font-bold leading-tight text-aira-primary">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-[672px] text-lg text-aira-text/70">
            {description}
          </p>
        )}
      </header>
    );
  }

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-aira-primary/65">
          Panel Admin / {title}
        </p>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-aira-primary">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-aira-text/60">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}

import { Info } from "lucide-react";

// Disclaimer langkah yang disarankan. Langkah berasal dari katalog tindakan AIRA yang
// diadaptasi dari dokumen rujukan AIRA (regulasi Indonesia, Sphere Handbook, serta panduan
// WHO dan UNICEF). Ditempatkan di bawah card "Langkah yang Disarankan" dengan lebar yang
// sama. Netral (sand), bukan kuning, agar tidak terbaca sebagai status Waspada.
// `className` mengatur kapan ditampilkan (desktop di kolom kiri, mobile di bagian akhir).
export default function DisclaimerLangkah({ className = "flex" }) {
  return (
    <div
      className={`gap-3 rounded-2xl bg-aira-sand p-4 text-[15px] leading-relaxed text-aira-text/80 ${className}`}
    >
      <Info className="mt-0.5 size-5 shrink-0 text-aira-primary" aria-hidden="true" />
      <p>
        Disclaimer: Langkah yang disarankan di atas disusun dari katalog tindakan AIRA yang diadaptasi dari dokumen
        rujukan AIRA, antara lain Permenkes No. 32 Tahun 2017, PP No. 122 Tahun 2015, Panduan Praktis EHRA (2021),
        Sphere Handbook 2018, serta panduan WHO dan UNICEF tentang air, sanitasi, higiene, ketahanan iklim, dan
        kebersihan menstruasi. Langkah ini bersifat umum, bukan pengganti arahan otoritas atau tenaga ahli setempat,
        dan tidak menentukan kualitas atau keamanan air untuk diminum. Untuk keluhan kesehatan yang serius, segera
        hubungi puskesmas atau tenaga kesehatan.
      </p>
    </div>
  );
}

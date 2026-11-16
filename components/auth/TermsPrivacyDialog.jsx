"use client";

import { useEffect, useState } from "react";
import { X, FileText, ShieldCheck } from "lucide-react";

const DOCUMENTS = {
  terms: {
    title: "Ketentuan Layanan AIRA",
    description: "Ketentuan penggunaan platform AIRA.",
    sections: [
      {
        title: "1. Pendahuluan",
        content: [
          "Selamat datang di AIRA (Access, Intelligence, Resilience, Action), sebuah platform digital yang dikembangkan untuk membantu perempuan dan keluarga dalam memahami ketahanan air rumah tangga, memperoleh informasi sanitasi, serta menemukan sumber air alternatif.",
          "Dengan menggunakan layanan yang memerlukan akun, pengguna menyatakan telah membaca dan memahami ketentuan penggunaan AIRA."
        ],
      },
      {
        title: "2. Ruang Lingkup Layanan",
        content: [
          "AIRA menyediakan beberapa fitur utama, yaitu Kalkulator Ketahanan Air, AIRA Assistant, dan Navigasi Air.",
          "Fitur tambahan bagi pengguna terdaftar meliputi Dashboard User, penyimpanan riwayat kalkulator, monitoring kondisi air rumah tangga, pengelolaan data keluarga, serta kontribusi informasi titik air.",
          "Fitur publik seperti kalkulator, AIRA Assistant, dan Navigasi Air dapat digunakan tanpa membuat akun."
        ],
      },
      {
        title: "3. Ketentuan Akun Pengguna",
        content: [
          "Pengguna wajib memberikan informasi pendaftaran yang benar dan dapat dipertanggungjawabkan.",
          "Pengguna bertanggung jawab menjaga kerahasiaan kata sandi dan keamanan akses akun masing-masing.",
          "Satu akun digunakan untuk mengakses fitur personal sesuai hak akses yang diberikan sistem.",
          "Akun pengguna biasa tidak memiliki kewenangan untuk mengakses atau mengelola Dashboard Admin.",
          "Pengguna hanya diperbolehkan mengakses data pribadi miliknya sendiri."
        ],
      },
      {
        title: "4. Penggunaan Informasi dan Hasil Kalkulator",
        content: [
          "Hasil Kalkulator Ketahanan Air merupakan estimasi berdasarkan data yang dimasukkan pengguna dan asumsi perhitungan yang digunakan oleh sistem.",
          "Hasil perhitungan bukan pengukuran langsung terhadap kondisi air di lapangan dan tidak dapat dijadikan satu-satunya dasar dalam mengambil keputusan penting.",
          "Pengguna bertanggung jawab untuk memeriksa kembali kondisi aktual dan mempertimbangkan informasi resmi atau pendapat tenaga ahli apabila diperlukan."
        ],
      },
      {
        title: "5. Ketentuan Navigasi Air",
        content: [
          "Informasi titik air ditampilkan berdasarkan data yang tersedia dan hasil pemeriksaan sesuai mekanisme AIRA.",
          "Status Terverifikasi menunjukkan bahwa informasi telah melalui proses pemeriksaan, tetapi tidak menjamin ketersediaan air ketika pengguna tiba di lokasi.",
          "AIRA tidak menjamin bahwa air pada suatu titik aman untuk diminum tanpa didukung informasi atau hasil pengujian kualitas air yang valid.",
          "Pengguna disarankan mengonfirmasi ketersediaan, jam operasional, dan ketentuan penggunaan kepada pengelola sumber air terkait."
        ],
      },
      {
        title: "6. Penggunaan AIRA Assistant",
        content: [
          "AIRA Assistant memberikan informasi, rekomendasi, dan panduan edukatif mengenai pengelolaan air, sanitasi, kebersihan menstruasi, serta ketahanan air rumah tangga.",
          "Jawaban yang dihasilkan AI dapat mengandung ketidakakuratan atau keterbatasan informasi. Pengguna perlu melakukan verifikasi melalui sumber resmi atau tenaga ahli terkait.",
          "AIRA Assistant bukan pengganti tenaga kesehatan, pengujian kualitas air, maupun layanan darurat."
        ],
      },
      {
        title: "7. Kontribusi Informasi Titik Air",
        content: [
          "Pengguna terdaftar dapat mengirimkan kontribusi atau laporan perubahan informasi titik air sesuai fitur yang tersedia.",
          "Informasi yang disampaikan harus relevan, benar sejauh pengetahuan pengguna, dan tidak memuat data pribadi orang lain yang tidak diperlukan.",
          "Setiap kontribusi dapat melalui proses pemeriksaan admin sebelum disetujui dan ditampilkan sebagai informasi terverifikasi."
        ],
      },
      {
        title: "8. Penggunaan yang Tidak Diperbolehkan",
        content: [
          "Pengguna dilarang memberikan informasi palsu secara sengaja, menyalahgunakan akun, mencoba mengakses data milik pengguna lain, atau melakukan tindakan yang mengganggu keamanan dan operasional AIRA.",
          "Pengguna juga tidak diperbolehkan menggunakan layanan untuk tujuan yang melanggar hukum atau merugikan pihak lain."
        ],
      },
      {
        title: "9. Ketersediaan dan Perubahan Layanan",
        content: [
          "Ketersediaan fitur bergantung pada kondisi sistem, sumber data, dan layanan pendukung yang digunakan AIRA.",
          "Beberapa fitur dapat mengalami gangguan, pemeliharaan, atau perubahan sesuai kebutuhan pengembangan produk.",
          "AIRA akan berupaya menyampaikan informasi keterbatasan layanan secara jelas kepada pengguna."
        ],
      },
      {
        title: "10. Perubahan Ketentuan",
        content: [
          "Ketentuan Layanan dapat diperbarui apabila terdapat perubahan fitur, kebijakan pengelolaan, atau kebutuhan pengembangan AIRA.",
          "Pengguna disarankan membaca kembali dokumen ini secara berkala untuk mengetahui ketentuan yang berlaku."
        ],
      },
    ],
  },

  privacy: {
    title: "Kebijakan Privasi AIRA",
    description: "Penjelasan mengenai pengumpulan dan pengelolaan data pengguna.",
    sections: [
      {
        title: "1. Pendahuluan",
        content: [
          "AIRA menghargai privasi pengguna dan berupaya mengelola informasi secara bertanggung jawab.",
          "Kebijakan ini menjelaskan jenis informasi yang dapat dikumpulkan, tujuan penggunaannya, pengelolaan akses, serta prinsip perlindungan data dalam penggunaan AIRA."
        ],
      },
      {
        title: "2. Informasi yang Dikumpulkan",
        content: [
          "Informasi akun: nama lengkap, alamat email, dan informasi autentikasi yang diperlukan untuk membuat serta mengelola akun.",
          "Informasi keluarga: data yang dimasukkan pengguna untuk mendukung perhitungan kebutuhan dan ketahanan air rumah tangga.",
          "Data kalkulator dan monitoring: masukan perhitungan serta catatan kondisi air yang disimpan melalui fitur akun.",
          "Data kontribusi: informasi titik air atau laporan perubahan yang dikirimkan pengguna.",
          "Aktivitas pengelolaan: informasi perubahan status dan aktivitas admin yang diperlukan untuk mendukung proses verifikasi dan penelusuran perubahan."
        ],
      },
      {
        title: "3. Tujuan Penggunaan Data",
        content: [
          "Data digunakan untuk membuat dan mengelola akun pengguna, menyediakan autentikasi, serta memberikan akses terhadap fitur personal.",
          "Data keluarga digunakan untuk mendukung perhitungan kebutuhan air dan fitur terkait.",
          "Riwayat kalkulator dan monitoring digunakan untuk menampilkan catatan serta perkembangan kondisi air rumah tangga.",
          "Data kontribusi digunakan untuk proses pemeriksaan, verifikasi, dan pembaruan informasi titik air.",
          "Data aktivitas digunakan untuk membantu menjaga keamanan dan menelusuri perubahan penting dalam sistem."
        ],
      },
      {
        title: "4. Prinsip Pengumpulan Data",
        content: [
          "AIRA menerapkan prinsip pengumpulan data sesuai kebutuhan fitur dan tidak bermaksud meminta informasi pribadi yang tidak relevan.",
          "Pengguna tanpa login tetap dapat mengakses fitur publik seperti kalkulator, AIRA Assistant, dan Navigasi Air.",
          "Penyimpanan hasil kalkulator ke riwayat pribadi dan penggunaan fitur personal memerlukan akun sesuai mekanisme sistem."
        ],
      },
      {
        title: "5. Penyimpanan dan Akses Data",
        content: [
          "Data akun dan informasi terkait dikelola melalui sistem autentikasi dan layanan penyimpanan yang digunakan AIRA.",
          "Riwayat kalkulator, monitoring, dan data keluarga hanya dapat diakses oleh pengguna yang bersangkutan serta pihak yang memiliki kewenangan sesuai kebutuhan sistem.",
          "Data pribadi tidak dimaksudkan untuk ditampilkan pada halaman publik.",
          "Hak akses admin dibatasi berdasarkan peran dan tanggung jawab pengelolaan sistem."
        ],
      },
      {
        title: "6. Penggunaan Layanan Pihak Ketiga",
        content: [
          "AIRA dapat menggunakan layanan pihak ketiga untuk mendukung autentikasi, penyimpanan data, pemrosesan AI, atau fungsi teknis lainnya.",
          "Apabila informasi diproses melalui layanan AI pihak ketiga, data yang dikirim perlu dibatasi pada informasi yang diperlukan untuk menghasilkan respons.",
          "Informasi pribadi yang tidak relevan tidak seharusnya disertakan dalam permintaan pemrosesan AI."
        ],
      },
      {
        title: "7. Perlindungan Data",
        content: [
          "AIRA berupaya menerapkan pengamanan yang sesuai untuk melindungi informasi pengguna dan membatasi akses berdasarkan kewenangan.",
          "Pengguna bertanggung jawab menjaga kerahasiaan informasi login dan tidak membagikan kata sandi kepada pihak lain.",
          "Pengguna disarankan tidak memasukkan informasi pribadi yang sensitif dan tidak diperlukan ke dalam pertanyaan AI maupun kontribusi titik air."
        ],
      },
      {
        title: "8. Penggunaan Data Kontribusi",
        content: [
          "Informasi titik air yang dikirimkan melalui kontribusi dapat digunakan untuk proses pemeriksaan dan pembaruan direktori titik air.",
          "Informasi pribadi yang tidak diperlukan tidak boleh dimasukkan ke dalam kontribusi.",
          "Informasi publik yang ditampilkan akan mengikuti kebutuhan fitur dan proses verifikasi AIRA."
        ],
      },
      {
        title: "9. Penyimpanan dan Penghapusan Data",
        content: [
          "Data dikelola sesuai kebutuhan fitur dan tujuan penggunaannya.",
          "Jangka waktu penyimpanan, prosedur penghapusan, dan mekanisme permintaan penghapusan data perlu ditetapkan lebih lanjut sesuai kemampuan sistem dan ketentuan yang berlaku.",
          "Pengguna dapat menghubungi pengelola AIRA melalui saluran kontak resmi yang nantinya disediakan untuk menyampaikan pertanyaan atau permintaan terkait data pribadi."
        ],
      },
      {
        title: "10. Perubahan Kebijakan Privasi",
        content: [
          "Kebijakan Privasi dapat diperbarui apabila terdapat perubahan fitur, layanan pendukung, atau mekanisme pengelolaan data.",
          "Versi kebijakan yang berlaku akan ditampilkan melalui halaman atau dokumen resmi AIRA."
        ],
      },
    ],
  },
};

export default function TermsPrivacyDialog({
  open,
  onClose,
  initialTab = "terms",
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const document = DOCUMENTS[activeTab];

  return (
    <div
      className="
        fixed inset-0 z-[100]
        flex items-center justify-center
        bg-slate-950/50
        p-3 backdrop-blur-sm
        sm:p-5
      "
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-dialog-title"
        className="
          flex max-h-[88vh] w-full max-w-2xl
          flex-col overflow-hidden
          rounded-2xl border border-aira-primary/10
          bg-white shadow-2xl
        "
      >
        {/* HEADER */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-aira-primary/10">
              {activeTab === "terms" ? (
                <FileText className="size-5 text-aira-primary" />
              ) : (
                <ShieldCheck className="size-5 text-aira-primary" />
              )}
            </div>

            <div>
              <h2
                id="terms-dialog-title"
                className="text-lg font-bold text-aira-primary sm:text-xl"
              >
                Dokumen AIRA
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                Ketentuan penggunaan dan perlindungan privasi.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dokumen"
            className="
              flex size-9 shrink-0 items-center justify-center
              rounded-full text-slate-500
              transition hover:bg-slate-100 hover:text-slate-800
            "
          >
            <X className="size-5" />
          </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="grid grid-cols-2 gap-2 border-b border-slate-100 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveTab("terms")}
            aria-pressed={activeTab === "terms"}
            className={`
              rounded-xl px-3 py-3 text-xs font-semibold
              transition sm:text-sm
              ${
                activeTab === "terms"
                  ? "bg-aira-primary text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }
            `}
          >
            Ketentuan Layanan
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("privacy")}
            aria-pressed={activeTab === "privacy"}
            className={`
              rounded-xl px-3 py-3 text-xs font-semibold
              transition sm:text-sm
              ${
                activeTab === "privacy"
                  ? "bg-aira-primary text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }
            `}
          >
            Kebijakan Privasi
          </button>
        </div>

        {/* DOCUMENT CONTENT */}
        <div
          key={activeTab}
          className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6"
        >
          <h3 className="text-base font-bold text-aira-primary sm:text-lg">
            {document.title}
          </h3>

          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            {document.description}
          </p>

          <div className="mt-5 space-y-5">
            {document.sections.map((section, index) => (
              <article key={index}>
                <h4 className="text-sm font-semibold text-slate-800 sm:text-base">
                  {section.title}
                </h4>

                <div className="mt-2 space-y-2">
                  {section.content.map((paragraph, paragraphIndex) => (
                    <p
                      key={paragraphIndex}
                      className="text-xs leading-6 text-slate-600 sm:text-sm"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
          <p className="text-[10px] leading-relaxed text-slate-500 sm:text-xs">
            Dokumen informasi dan ketentuan penggunaan AIRA.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="
              shrink-0 rounded-full bg-aira-primary
              px-5 py-2.5 text-xs font-semibold text-white
              transition hover:bg-aira-primary-dark
            "
          >
            Tutup
          </button>
        </div>
      </section>
    </div>
  );
} 
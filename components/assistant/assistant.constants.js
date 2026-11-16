export const INITIAL_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    "Halo, saya AIRA Assistant. Saya siap membantu pertanyaan seputar air bersih, penghematan air, sanitasi keluarga, kebersihan menstruasi, dan ketahanan iklim. Apa yang ingin Anda tanyakan?",
  topics: [],
};

export const SUGGESTED_QUESTIONS = [
  "Bagaimana cara menghemat air saat musim kemarau?",
  "Apa yang perlu diperhatikan dalam kebersihan menstruasi?",
  "Bagaimana cara menampung air hujan di rumah?",
  "Bagaimana memprioritaskan cadangan air keluarga?",
  "Apa arti hasil kalkulator ketahanan air saya?",
];

export const ASSISTANT_CONFIG = {
  title: "AIRA Assistant",

  subtitle: "Siap membantu, tanpa perlu login",

  mode:
    "Hybrid AI: referensi pengetahuan AIRA dan pengetahuan umum seputar air, sanitasi, dan ketahanan iklim.",

  placeholder: "Tulis pertanyaan Anda...",

  initialLoadingText: "Mencari referensi AIRA...",

  notice:
    "Jawaban AIRA Assistant disusun dari referensi pengetahuan AIRA yang diadaptasi dari dokumen resmi dan panduan (antara lain Kementerian Kesehatan RI, Peraturan Pemerintah No. 122 Tahun 2015, WHO, UNICEF, dan Sphere Handbook) serta pengetahuan umum seputar air, sanitasi, dan ketahanan iklim. Informasi bersifat edukatif dan umum, tidak mengubah hasil kalkulator, dan bukan pengganti pengujian kualitas air, arahan otoritas setempat, atau tenaga kesehatan.",
};

export const ASSISTANT_LINKS = [
  {
    label: "Buka Kalkulator",
    href: "/kalkulator-air",
    icon: "calculator",
  },
  {
    label: "Lihat Navigasi Air",
    href: "/navigasi-air",
    icon: "map",
  },
]; 

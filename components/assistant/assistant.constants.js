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
    "Jawaban AIRA Assistant merupakan informasi edukatif yang dihasilkan dari referensi pengetahuan AIRA dan informasi umum yang tersedia secara daring. AI dapat memberikan informasi yang kurang tepat atau tidak sepenuhnya akurat. Gunakan jawaban sebagai referensi awal dan lakukan verifikasi melalui sumber resmi atau tenaga ahli terkait sebelum mengambil keputusan.", 
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

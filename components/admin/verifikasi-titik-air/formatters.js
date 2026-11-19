const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MONTHS = {
  Januari: "Jan",
  Februari: "Feb",
  Maret: "Mar",
  April: "Apr",
  Mei: "Mei",
  Juni: "Jun",
  Juli: "Jul",
  Agustus: "Agu",
  September: "Sep",
  Oktober: "Okt",
  November: "Nov",
  Desember: "Des",
};

const CATEGORY_LABELS = {
  water_station: "Stasiun air",
  public_tank: "Tandon umum",
  dug_well: "Sumur gali",
  spring: "Mata air",
  borehole: "Sumur bor",
};

const AVAILABILITY_LABELS = {
  available: "Tersedia",
  tersedia: "Tersedia",

  limited: "Terbatas",
  terbatas: "Terbatas",

  unavailable: "Tidak Tersedia",
  "tidak tersedia": "Tidak Tersedia",

  unknown: "Belum Diketahui",
  "belum diketahui": "Belum Diketahui",
};

export function formatContributor(value) {
  if (!value) return "Warga";

  const text = String(value).trim();

  return UUID_RE.test(text)
    ? `Warga #${text.slice(0, 6)}`
    : text;
}

export function formatCategory(value) {
  if (!value) return "";

  const key = String(value).trim();

  if (CATEGORY_LABELS[key]) {
    return CATEGORY_LABELS[key];
  }

  const readable = key.replace(/_/g, " ");

  return (
    readable.charAt(0).toUpperCase() +
    readable.slice(1)
  );
}

export function formatAvailability(value) {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();

  return (
    AVAILABILITY_LABELS[key] ||
    "Belum Diketahui"
  );
}

export function formatSubmittedDate(value) {
  if (!value) return "-";

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const date = new Date(text);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      });
    }
  }

  return text
    .split(" pukul ")[0]
    .trim()
    .replace(
      /[A-Za-z]+/,
      (month) => MONTHS[month] || month
    );
}
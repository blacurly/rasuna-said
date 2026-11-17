export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function boundedText(value, { field, max = 500, required = false } = {}) {
  if (value == null) value = "";
  if (typeof value !== "string") {
    return { valid: false, value: "", error: `${field} harus berupa teks.` };
  }
  const normalized = value.trim();
  if (required && !normalized) {
    return { valid: false, value: normalized, error: `${field} wajib diisi.` };
  }
  if (normalized.length > max) {
    return { valid: false, value: normalized, error: `${field} maksimal ${max} karakter.` };
  }
  return { valid: true, value: normalized, error: null };
}

export function positiveInteger(value, field, { required = false } = {}) {
  if ((value === null || value === undefined || value === "") && !required) {
    return { valid: true, value: null, error: null };
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return { valid: false, value: null, error: `${field} harus berupa bilangan bulat positif.` };
  }
  return { valid: true, value: parsed, error: null };
}

export function parseCoordinates(latitude, longitude) {
  const hasLat = latitude !== null && latitude !== undefined && latitude !== "";
  const hasLng = longitude !== null && longitude !== undefined && longitude !== "";
  if (hasLat !== hasLng) {
    return { valid: false, latitude: null, longitude: null, error: "Latitude dan longitude harus diisi berpasangan." };
  }
  if (!hasLat) {
    return { valid: true, latitude: null, longitude: null, error: null };
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { valid: false, latitude: null, longitude: null, error: "Koordinat tidak valid." };
  }
  return { valid: true, latitude: lat, longitude: lng, error: null };
}

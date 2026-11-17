const MAX_LIMIT = 200;

function textParam(params, name) {
  return (params.get(name) || "").trim();
}

export function parseNavigationFilters(searchParams) {
  const rawLimit = Number(searchParams.get("limit") ?? 50);
  const rawOffset = Number(searchParams.get("offset") ?? 0);

  return {
    q: textParam(searchParams, "q"),
    type: textParam(searchParams, "type"),
    province: textParam(searchParams, "province"),
    regency: textParam(searchParams, "regency"),
    district: textParam(searchParams, "district"),
    availableOnly: searchParams.get("availableOnly") === "true",
    limit: Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT) : 50,
    offset: Number.isInteger(rawOffset) ? Math.max(rawOffset, 0) : 0,
  };
}

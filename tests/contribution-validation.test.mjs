import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { validateContributionPayload } from "@/lib/validation/contribution";

const payloadValid = {
  contribution_type: "new_point",
  proposed_point_name: "Sumur Komunal RT 04",
  proposed_water_source_type: "public_well",
  proposed_province_id: 34,
  proposed_city_regency_id: 3403,
  proposed_district_id: 340301,
  proposed_address_detail: "RT 04 RW 02",
  proposed_latitude: -7.96,
  proposed_longitude: 110.6,
  evidence_url: "https://maps.app.goo.gl/example",
};

describe("validateContributionPayload", () => {
  test("menerima kontribusi dengan URL Google Maps dan koordinat valid", () => {
    const result = validateContributionPayload(payloadValid);
    assert.equal(result.valid, true);
    assert.equal(result.value.proposed_latitude, -7.96);
    assert.equal(result.value.proposed_longitude, 110.6);
  });

  test("menolak URL non-Google Maps pada field lokasi", () => {
    const result = validateContributionPayload({
      ...payloadValid,
      evidence_url: "https://example.com/location",
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("Google Maps")));
  });

  test("menolak koordinat yang tidak berpasangan", () => {
    const result = validateContributionPayload({
      ...payloadValid,
      proposed_longitude: null,
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("berpasangan")));
  });
});

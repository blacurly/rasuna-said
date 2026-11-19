import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { normalizeIndonesianPhone } from "@/lib/phone";

describe("normalizeIndonesianPhone", () => {
  test("normalizes Indonesian local mobile numbers", () => {
    assert.equal(normalizeIndonesianPhone("0812-3456-7890"), "+6281234567890");
    assert.equal(normalizeIndonesianPhone("+62 812 3456 7890"), "+6281234567890");
    assert.equal(normalizeIndonesianPhone("6281234567890"), "+6281234567890");
    assert.equal(normalizeIndonesianPhone("0062 812-3456-7890"), "+6281234567890");
  });

  test("returns null for empty or invalid values", () => {
    assert.equal(normalizeIndonesianPhone(null), null);
    assert.equal(normalizeIndonesianPhone(""), null);
    assert.equal(normalizeIndonesianPhone("nomor admin"), null);
    assert.equal(normalizeIndonesianPhone("123"), null);
    assert.equal(normalizeIndonesianPhone("+62081234567890"), null);
  });
});

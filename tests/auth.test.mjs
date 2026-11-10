import assert from "node:assert/strict";
import test from "node:test";

import {
  hashPassword, hashToken, isValidUsername, normalizeUsername, verifyPassword,
} from "../src/lib/auth/credentials.ts";
import { safeReturnPath } from "../src/lib/auth/redirect.ts";

test("scrypt hashes use independent salts and verify the exact password", async () => {
  const password = "test-only-password-123";
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.ok(await verifyPassword(password, first));
  assert.equal(await verifyPassword(`${password}!`, first), false);
  await assert.rejects(verifyPassword(password, "broken"));
  await assert.rejects(hashPassword("short"));
  await assert.rejects(hashPassword("x".repeat(129)));
});

test("usernames are normalized and restricted", () => {
  assert.equal(normalizeUsername(" Admin "), "admin");
  assert.ok(isValidUsername("admin_123"));
  for (const invalid of ["a", "has space", "../admin", "x".repeat(65)]) {
    assert.equal(isValidUsername(invalid), false);
  }
});

test("password length accepts 9 through 128 characters", async () => {
  await assert.rejects(hashPassword("x".repeat(8)));
  for (const length of [9, 128]) {
    const password = "x".repeat(length);
    assert.ok(await verifyPassword(password, await hashPassword(password)));
  }
  await assert.rejects(hashPassword("x".repeat(129)));
});

test("tokens are stored as SHA-256 digests", () => {
  assert.match(hashToken("token"), /^[a-f0-9]{64}$/);
  assert.equal(hashToken("token"), hashToken("token"));
  assert.notEqual(hashToken("token"), hashToken("other-token"));
});

test("login redirects cannot escape the local site", () => {
  for (const value of [null, "", "//evil.invalid", "https://evil.invalid", "/\\evil.invalid", "/\nevil"]) {
    assert.equal(safeReturnPath(value), "/blog");
  }
  assert.equal(safeReturnPath("/blog/1/edit?mode=test#heading"), "/blog/1/edit?mode=test#heading");
});

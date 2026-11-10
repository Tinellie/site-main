import assert from "node:assert/strict";
import test from "node:test";

import { formatPostTimestamp } from "../src/features/blog/format-timestamp.ts";

test("post timestamps show UTC date and minute without seconds or milliseconds", () => {
  assert.equal(formatPostTimestamp("2026-11-08T15:50:22.506Z"), "2026-11-08 15:50");
  assert.equal(formatPostTimestamp("2026-01-02T03:04:59.999Z"), "2026-01-02 03:04");
  assert.equal(formatPostTimestamp("2026-01-02T03:04:00+08:00"), "2026-01-01 19:04");
  assert.equal(formatPostTimestamp("2026-01-02"), "2026-01-02 00:00");
});

test("invalid post timestamps raise an error instead of displaying a fallback", () => {
  assert.throws(() => formatPostTimestamp("not-a-date"), RangeError);
  assert.throws(() => formatPostTimestamp(""), RangeError);
});

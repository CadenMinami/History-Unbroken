import { describe, expect, it } from "vitest";

import { WORLD_HTML_Z_INDEX_RANGE } from "@/lib/world/world-overlay";

describe("world HTML overlay policy", () => {
  it("keeps scene-authored HTML below application dialogs", () => {
    expect(WORLD_HTML_Z_INDEX_RANGE).toEqual([1, 0]);
  });
});

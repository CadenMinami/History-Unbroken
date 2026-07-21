import { describe, expect, it } from "vitest";

import {
  migrateLegacyStorageValue,
} from "@/lib/browser-storage/rebrand-migration";

const LEGACY_PREFIX = ["history", "unbroken"].join("-");
const CURRENT_KEY = "unchanged:varennes:state";

function createStorage(values: Record<string, string> = {}) {
  const entries = new Map(Object.entries(values));
  return {
    getItem(key: string): string | null {
      return entries.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      entries.set(key, value);
    },
  };
}

describe("rebrand storage migration", () => {
  it("migrates a legacy product key when no current value exists", () => {
    const storage = createStorage({
      [`${LEGACY_PREFIX}:varennes:state`]: "saved-case",
    });

    expect(migrateLegacyStorageValue(storage, CURRENT_KEY)).toBe("saved-case");
    expect(storage.getItem(CURRENT_KEY)).toBe("saved-case");
  });

  it("keeps the current product value when both keys exist", () => {
    const storage = createStorage({
      [CURRENT_KEY]: "current-case",
      [`${LEGACY_PREFIX}:varennes:state`]: "saved-case",
    });

    expect(migrateLegacyStorageValue(storage, CURRENT_KEY)).toBe("current-case");
    expect(storage.getItem(CURRENT_KEY)).toBe("current-case");
  });
});

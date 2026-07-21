const LEGACY_STORAGE_PREFIX = ["history", "unbroken"].join("-");
const CURRENT_STORAGE_PREFIX = "unchanged";

type ReadableStorage = Pick<Storage, "getItem">;
type StorageWithOptionalWrites = ReadableStorage &
  Partial<Pick<Storage, "setItem">>;

function legacyKeyFor(currentKey: string): string | null {
  const prefix = `${CURRENT_STORAGE_PREFIX}:`;
  if (!currentKey.startsWith(prefix)) return null;
  return `${LEGACY_STORAGE_PREFIX}:${currentKey.slice(prefix.length)}`;
}

/**
 * Reads the current namespace first, then preserves a prior browser session by
 * copying its value forward once. Storage remains optional for every caller.
 */
export function migrateLegacyStorageValue(
  storage: StorageWithOptionalWrites,
  currentKey: string,
): string | null {
  const currentValue = storage.getItem(currentKey);
  if (currentValue !== null) return currentValue;

  const legacyKey = legacyKeyFor(currentKey);
  if (!legacyKey) return null;
  const legacyValue = storage.getItem(legacyKey);
  if (legacyValue === null) return null;

  storage.setItem?.(currentKey, legacyValue);
  return legacyValue;
}

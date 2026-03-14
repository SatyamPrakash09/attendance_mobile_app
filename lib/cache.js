import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "attendance_cache_";
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function cacheSet(key, data) {
  try {
    await AsyncStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, ts: Date.now() }),
    );
  } catch {}
}

export async function cacheGet(key, maxAgeMs = TTL_MS) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > maxAgeMs) return null;
    return data;
  } catch {
    return null;
  }
}

/** Always returns cached value even if stale (used as fallback when offline) */
export async function cacheGetStale(key) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw).data;
  } catch {
    return null;
  }
}

export async function cacheClear() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch {}
}

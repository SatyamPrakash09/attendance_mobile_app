import * as SecureStore from "expo-secure-store";

const KEYS = {
  UID: "uid",
  USER: "user",
  BACKEND_URL: "backend_url",
};

export async function getUid() {
  return await SecureStore.getItemAsync(KEYS.UID);
}

export async function getUser() {
  const raw = await SecureStore.getItemAsync(KEYS.USER);
  return raw ? JSON.parse(raw) : null;
}

export async function saveSession(uid, user) {
  await SecureStore.setItemAsync(KEYS.UID, uid);
  await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user));
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(KEYS.UID);
  await SecureStore.deleteItemAsync(KEYS.USER);
}

export async function getBackendUrl() {
  const stored = await SecureStore.getItemAsync(KEYS.BACKEND_URL);
  return stored || "https://attendance-backend-hhkn.onrender.com";
}

export async function saveBackendUrl(url) {
  const clean = url.replace(/\/$/, "");
  await SecureStore.setItemAsync(KEYS.BACKEND_URL, clean);
}

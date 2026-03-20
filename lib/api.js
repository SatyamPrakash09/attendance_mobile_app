import axios from "axios";
import { cacheGet, cacheGetStale, cacheSet } from "./cache";
import { getBackendUrl } from "./storage";

async function getClient(uid) {
  const baseURL = await getBackendUrl();
  return axios.create({
    baseURL,
    headers: { "x-user-id": uid },
    timeout: 10000,
  });
}

export async function fetchUser(uid) {
  const cacheKey = `user_${uid}`;
  try {
    const client = await getClient(uid);
    const res = await client.get(`/user?userId=${uid}`);
    await cacheSet(cacheKey, res.data);
    return res.data;
  } catch (err) {
    const cached = await cacheGetStale(cacheKey);
    if (cached) return cached;
    throw err;
  }
}

export async function markAttendance(uid, status, reason = "Present") {
  const client = await getClient(uid);
  const res = await client.post("/attendance", { status, reason });
  return res.data;
}

export async function updateAttendance(uid, status, reason = "Present", date) {
  const client = await getClient(uid);
  const res = await client.put("/attendance", { status, reason, date });
  return res.data;
}

export async function markHoliday(uid) {
  const client = await getClient(uid);
  const res = await client.post("/holiday");
  return res.data;
}

export async function updateHoliday(uid, date, reason = "Declared by user") {
  const client = await getClient(uid);
  const res = await client.put("/holiday", { date, reason });
  return res.data;
}

export async function fetchAllAttendance(uid) {
  const cacheKey = `attendance_all_${uid}`;
  try {
    // Use fresh cache (≤5min) to avoid hammering backend on every tab switch
    const fresh = await cacheGet(cacheKey);
    if (fresh) return fresh;

    const client = await getClient(uid);
    const res = await client.get(`/attendance/all?userId=${uid}`);
    await cacheSet(cacheKey, res.data);
    return res.data;
  } catch (err) {
    // Offline fallback — return stale data with a warning
    const stale = await cacheGetStale(cacheKey);
    if (stale) {
      console.log("Offline: returning cached attendance data");
      return stale;
    }
    throw err;
  }
}

export async function fetchAISummary(uid) {
  const cacheKey = `ai_summary_${uid}`;
  try {
    const client = await getClient(uid);
    const res = await client.get(`/attendance/summarize?userId=${uid}`);
    await cacheSet(cacheKey, res.data.summary, 30 * 60 * 1000); // 30 min cache
    return res.data.summary;
  } catch (err) {
    const stale = await cacheGetStale(cacheKey);
    if (stale) return stale;
    throw err;
  }
}

/** Force-refresh attendance: bypasses cache */
export async function refreshAttendance(uid) {
  const client = await getClient(uid);
  const res = await client.get(`/attendance/all?userId=${uid}`);
  const cacheKey = `attendance_all_${uid}`;
  await cacheSet(cacheKey, res.data);
  return res.data;
}

export async function queryAI(uid, query) {
  const client = await getClient(uid);
  // User specified 'useId' (without 'r') in their previous message
  const res = await client.post("/attendance/query", { useId: uid, query });
  return res.data;
}

import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { markAttendance } from "./api";
import { getBackendUrl, getUid } from "./storage";

// ─── IDs ──────────────────────────────────────────────────────────────────────
export const BACKGROUND_TASK_NAME = "attendance-keepalive";
export const NOTIF_ID_PING = "backend-ping-929";
export const NOTIF_ID_REMINDER = "attendance-930";
export const NOTIF_CATEGORY = "attendance-actions";

// ─── Notification handler ─────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isPing =
      notification.request.identifier === NOTIF_ID_PING ||
      notification.request.content.data?.type === "ping";
    return {
      shouldShowAlert: !isPing,
      shouldPlaySound: !isPing,
      shouldSetBadge: false,
    };
  },
});

// ─── Background task (defined but registration is optional) ───────────────────
if (TaskManager.isAvailableAsync) {
  TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
    try {
      const url = await getBackendUrl();
      await fetch(`${url}/health`, { method: "GET" });
      return { result: "success" };
    } catch {
      return { result: "failed" };
    }
  });
}

// ─── Notification quick-action category ──────────────────────────────────────
export async function registerNotificationCategory() {
  await Notifications.setNotificationCategoryAsync(NOTIF_CATEGORY, [
    {
      identifier: "mark-present",
      buttonTitle: "✅ Present",
      options: { opensAppToForeground: false },
    },
    {
      identifier: "mark-absent",
      buttonTitle: "❌ Absent",
      options: { opensAppToForeground: true },
    },
  ]);
}

// ─── Handle quick-action tap from notification ────────────────────────────────
export async function handleNotificationAction(response) {
  const actionId = response.actionIdentifier;
  if (actionId !== "mark-present" && actionId !== "mark-absent") return;
  try {
    const uid = await getUid();
    if (!uid) return;
    const status = actionId === "mark-present" ? "Present" : "Absent";
    await markAttendance(uid, status, status === "Present" ? "Present" : "-");
  } catch (e) {
    console.log("Quick-action mark failed:", e.message);
  }
}

// ─── Permissions ──────────────────────────────────────────────────────────────
export async function requestNotificationPermission() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ─── Ping backend ─────────────────────────────────────────────────────────────
export async function pingBackend() {
  try {
    const url = await getBackendUrl();
    await fetch(`${url}/health`, { method: "GET" });
  } catch {}
}

// ─── Schedule 9:29 AM ping + 9:30 AM reminder ────────────────────────────────
export async function scheduleDailyReminder() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await registerNotificationCategory();

  // Silent 9:29 AM ping to wake the backend
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_ID_PING,
    content: {
      title: "",
      body: "",
      data: { type: "ping" },
      priority: Notifications.AndroidNotificationPriority.MIN,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 29,
    },
  });

  // 9:30 AM reminder with Present / Absent action buttons
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_ID_REMINDER,
    content: {
      title: "Mark Your Attendance",
      body: "Good morning! Tap to mark attendance for today.",
      data: { type: "reminder", screen: "home" },
      categoryIdentifier: NOTIF_CATEGORY,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 30,
    },
  });
}

// ─── Background task registration (best-effort, skipped in Expo Go) ───────────
export async function registerBackgroundFetch() {
  try {
    const BackgroundTask = await import("expo-background-task");
    const isRegistered =
      await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
    if (!isRegistered) {
      await BackgroundTask.registerTaskAsync(BACKGROUND_TASK_NAME, {
        minimumInterval: 30 * 60,
      });
    }
  } catch {
    // expo-background-task not available (Expo Go) — safe to skip
    console.log("Background task not available in this environment.");
  }
}

export async function unregisterBackgroundFetch() {
  try {
    const isRegistered =
      await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
    if (isRegistered) {
      const BackgroundTask = await import("expo-background-task");
      await BackgroundTask.unregisterTaskAsync(BACKGROUND_TASK_NAME);
    }
  } catch {}
  await Notifications.cancelAllScheduledNotificationsAsync();
}

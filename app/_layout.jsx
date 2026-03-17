import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { COLORS } from "../constants/colors";
import {
  NOTIF_ID_PING,
  handleNotificationAction,
  pingBackend,
  registerBackgroundFetch,
  requestNotificationPermission,
  scheduleDailyReminder,
} from "../lib/notifications";
import { getUid, getUser } from "../lib/storage";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    async function init() {
      // Auth check
      try {
        const uid = await getUid();
        const user = await getUser();
        if (uid && user) {
          router.replace("/(tabs)/home");
        } else {
          router.replace("/(auth)/login");
          return;
        }
      } catch {
        router.replace("/(auth)/login");
        return;
      }

      // Notifications + background keep-alive
      try {
        const granted = await requestNotificationPermission();
        if (granted) {
          await scheduleDailyReminder();
          await registerBackgroundFetch();
        }
      } catch (e) {
        console.log("Notification setup error:", e.message);
      }
    }

    init();

    // Silent 9:29 ping listener
    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        const id = notification.request.identifier;
        const data = notification.request.content.data;
        if (id === NOTIF_ID_PING || data?.type === "ping") pingBackend();
      },
    );

    // Quick-action response listener (Present / Absent from notification)
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => handleNotificationAction(response),
    );

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Stack>
        <StatusBar style="light" backgroundColor={COLORS.bg} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="profile"
          options={{
            title: "Profile",
            presentation: "formSheet",
            gestureDirection: "vertical",
            sheetGrabberVisible: false,
            animation: "slide_from_bottom",
            sheetInitialDetentIndex: 0,
            sheetAllowedDetents: [0.5, 0.75],
            sheetCornerRadius: 15,
            sheetExpandsWhenScrolledToEdge: false,
            sheetElevation: 24,
          }}
        />
        <Stack.Screen
          name="AiChat"
          options={{
            headerShown: false,
            title: "AI Chat",
            presentation: "formSheet",
            gestureDirection: "vertical",
            sheetGrabberVisible: true,
            animation: "slide_from_bottom",
            sheetInitialDetentIndex: 0,
            sheetAllowedDetents: [1], 
            sheetCornerRadius: 15,
            sheetExpandsWhenScrolledToEdge: true,
            sheetElevation: 24,
          }}
        />
      </Stack>
    </>
  );
}

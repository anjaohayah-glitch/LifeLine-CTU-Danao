import * as Device from "expo-device";
import { useRouter } from "expo-router";
import { ref, set } from "firebase/database";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { auth, db } from "../firebase";
import { getNotifications, isAndroidExpoGo } from "../utils/notifications";

const PROJECT_ID = "a35b5dbd-7933-4073-b5e3-5e4d31ecf0df";

export async function registerForPushNotifications() {
  if (isAndroidExpoGo) {
    console.log("Push notifications require a development build on Android.");
    return null;
  }

  if (!Device.isDevice) return null;

  const Notifications = await getNotifications();
  if (!Notifications) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("lifeline_alerts", {
      name: "LIFELINE Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: "#B00020",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync("lifeline_emergency", {
      name: "LIFELINE Emergency",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 1000, 300, 1000, 300, 1000],
      lightColor: "#B00020",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
      bypassDnd: true,
    });
  }

  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID })).data;
  } catch (e) {
    console.log("Push token error:", e);
    return null;
  }
}

export function useNotifications() {
  const router = useRouter();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    let mounted = true;

    registerForPushNotifications().then((token) => {
      if (mounted && token && auth.currentUser) {
        set(ref(db, `users/${auth.currentUser.uid}/expoPushToken`), token);
        set(ref(db, `fcmTokens/${auth.currentUser.uid}`), token);
      }
    });

    const setupListeners = async () => {
      const Notifications = await getNotifications();
      if (!mounted || !Notifications) return;

      notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification.request.content.title);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        const screen = response.notification.request.content.data?.screen;
        if (screen) {
          try {
            router.push(`/${screen}`);
          } catch (e) {
            console.log("Navigation error:", e);
          }
        }
      });
    };

    setupListeners();

    return () => {
      mounted = false;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [router]);
}

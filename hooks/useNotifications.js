// hooks/useNotifications.js
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { ref, set } from "firebase/database";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { auth, db } from "../firebase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

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

    // Extra channel for emergency
    await Notifications.setNotificationChannelAsync("lifeline_emergency", {
      name: "LIFELINE Emergency",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 1000, 300, 1000, 300, 1000],
      lightColor: "#B00020",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
      bypassDnd: true, // bypasses Do Not Disturb for emergencies
    });
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: "a35b5dbd-7933-4073-b5e3-5e4d31ecf0df",
    })).data;
    return token;
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
    // Register and save token
    registerForPushNotifications().then((token) => {
      if (token && auth.currentUser) {
        set(ref(db, "users/" + auth.currentUser.uid + "/expoPushToken"), token);
        set(ref(db, "fcmTokens/" + auth.currentUser.uid), token);
      }
    });

    // Listen for notifications received while app is open
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("✅ Notification received:", notification.request.content.title);
      });

    // Listen for notification tapped by user
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const screen = response.notification.request.content.data?.screen;
        if (screen) {
          try {
            router.push(`/${screen}`);
          } catch (e) {
            console.log("Navigation error:", e);
          }
        }
      });

    // ✅ FIXED — use .remove() instead of removeNotificationSubscription
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}
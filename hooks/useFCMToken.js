import AsyncStorage from "@react-native-async-storage/async-storage";
import { ref, set } from "firebase/database";
import { useEffect } from "react";
import { Platform } from "react-native";
import { auth, db } from "../firebase";
import { EMERGENCY_CHANNEL_ID, EMERGENCY_SOUND } from "../utils/notificationChannels";
import { getNotifications, isAndroidExpoGo } from "../utils/notifications";

const PROJECT_ID = "a35b5dbd-7933-4073-b5e3-5e4d31ecf0df";

const createAndroidChannels = async (Notifications) => {
  if (Platform.OS !== "android") return;

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

  await Notifications.setNotificationChannelAsync(EMERGENCY_CHANNEL_ID, {
    name: "Emergency Alarm",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 1000, 300, 1000, 300, 1000],
    lightColor: "#B00020",
    sound: EMERGENCY_SOUND,
    enableVibrate: true,
    showBadge: true,
    bypassDnd: true,
  });

  await Notifications.setNotificationChannelAsync("emergency", {
    name: "Emergency Alerts",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 1000, 300, 1000, 300, 1000],
    lightColor: "#B00020",
    sound: "default",
    enableVibrate: true,
    showBadge: true,
    bypassDnd: true,
  });

  await Notifications.setNotificationChannelAsync("sos", {
    name: "SOS Alerts",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 300, 100, 300, 100, 300, 100, 300],
    lightColor: "#B00020",
    sound: "default",
    enableVibrate: true,
    showBadge: true,
    bypassDnd: true,
  });
};

export function useFCMToken() {
  useEffect(() => {
    const saveToken = async (user) => {
      try {
        if (isAndroidExpoGo) {
          console.log("Skipping push token save in Android Expo Go.");
          return;
        }

        if (!user) {
          console.log("No user logged in - skipping token save");
          return;
        }

        const Notifications = await getNotifications();
        if (!Notifications) return;

        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          console.log("Notification permission denied");
          return;
        }

        await createAndroidChannels(Notifications);

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: PROJECT_ID,
        });

        const token = tokenData.data;
        if (!token) {
          console.log("No token received");
          return;
        }

        console.log("Push token:", token);
        await set(ref(db, `fcmTokens/${user.uid}`), token);
        await set(ref(db, `users/${user.uid}/expoPushToken`), token);
        await AsyncStorage.setItem("expoPushToken", token);
        await AsyncStorage.setItem("userUID", user.uid);
        console.log("Token saved to Firebase successfully");
      } catch (e) {
        console.log("FCM token error:", e.message);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        saveToken(user);
      } else {
        AsyncStorage.removeItem("expoPushToken").catch(() => {});
        AsyncStorage.removeItem("userUID").catch(() => {});
      }
    });

    return unsubscribe;
  }, []);
}

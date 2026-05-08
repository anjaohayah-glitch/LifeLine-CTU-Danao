import AsyncStorage from "@react-native-async-storage/async-storage";
import { ref, set } from "firebase/database";
import { useEffect } from "react";
import { Platform } from "react-native";
import { auth, db } from "../firebase";
import { getNotifications, isAndroidExpoGo } from "../utils/notifications";

const PROJECT_ID = "a35b5dbd-7933-4073-b5e3-5e4d31ecf0df";

export function useFCMToken() {
  useEffect(() => {
    const saveToken = async () => {
      try {
        if (isAndroidExpoGo) {
          console.log("Skipping push token save in Android Expo Go.");
          return;
        }

        const user = auth.currentUser;
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

    const timer = setTimeout(saveToken, 2000);
    return () => clearTimeout(timer);
  }, []);
}

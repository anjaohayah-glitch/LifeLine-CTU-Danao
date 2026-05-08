// hooks/useFCMToken.js
import * as Notifications from "expo-notifications";
import { ref, set } from "firebase/database";
import { useEffect } from "react";
import { Platform } from "react-native";
import { auth, db } from "../firebase";

export function useFCMToken() {
  useEffect(() => {
    const saveToken = async () => {
      try {
        // Only works on real device with built APK
        const user = auth.currentUser;
        if (!user) {
          console.log("No user logged in — skipping token save");
          return;
        }

        // Request permission first
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          console.log("Notification permission denied");
          return;
        }

        // Set up Android notification channel
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

        // Get Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: "a35b5dbd-7933-4073-b5e3-5e4d31ecf0df",
        });

        const token = tokenData.data;
        if (!token) {
          console.log("No token received");
          return;
        }

        console.log("✅ Push token:", token);

        // Save to Firebase in TWO places
        await set(ref(db, `fcmTokens/${user.uid}`), token);
        await set(ref(db, `users/${user.uid}/expoPushToken`), token);

        console.log("✅ Token saved to Firebase successfully");

      } catch (e) {
        console.log("FCM token error:", e.message);
      }
    };

    // Small delay to make sure auth is ready
    const timer = setTimeout(saveToken, 2000);
    return () => clearTimeout(timer);
  }, []);
}
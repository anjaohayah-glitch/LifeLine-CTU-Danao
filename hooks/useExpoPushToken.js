// hooks/useExpoPushToken.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { ref, set } from "firebase/database";
import { useEffect } from "react";
import { Platform } from "react-native";
import { db } from "../firebase";

const PROJECT_ID = "a35b5dbd-7933-4073-b5e3-5e4d31ecf0df";

export function useExpoPushToken() {
  useEffect(() => {
    registerToken();
  }, []);
}

async function registerToken() {
  try {
    // ❌ Skip emulators
    if (!Device.isDevice) {
      console.log("❌ Push needs real device");
      return;
    }

    // ✅ Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("emergency", {
        name: "Emergency Alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1000, 300, 1000],
        lightColor: "#B00020",
        sound: true,
        enableVibrate: true,
        showBadge: true,
      });
    }

    // ✅ Request permission
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("❌ Permission denied");
      return;
    }

    // ✅ Get token
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: PROJECT_ID,
    });

    console.log("✅ Expo Push Token:", token);
    await AsyncStorage.setItem("expoPushToken", token);

    // ✅ Retry saving to Firebase until user is logged in
    let attempts = 0;
    const trySave = async () => {
      const uid = await AsyncStorage.getItem("userUID");
      if (uid) {
        await set(ref(db, `users/${uid}/expoPushToken`), token);
        console.log("✅ Token saved to Firebase for uid:", uid);
      } else if (attempts < 10) {
        attempts++;
        console.log(`⏳ uid not ready, retry ${attempts}/10...`);
        setTimeout(trySave, 3000); // retry every 3 seconds
      } else {
        console.log("❌ Could not save token - user never logged in");
      }
    };
    await trySave();

  } catch (e) {
    console.log("❌ registerToken error:", e.message);
  }
}
// hooks/useExpoPushToken.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { ref, set } from "firebase/database";
import { useEffect } from "react";
import { db } from "../firebase";

export function useExpoPushToken() {
  useEffect(() => {
    registerToken();
  }, []);

  async function registerToken() {
    if (!Device.isDevice) return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: "a35b5dbd-7933-4073-b5e3-5e4d31ecf0df", // your EAS project ID
    })).data;

    await AsyncStorage.setItem("expoPushToken", token);

    const uid = await AsyncStorage.getItem("userUID");
    if (uid) {
      await set(ref(db, `users/${uid}/expoPushToken`), token);
    }
  }
}
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { ref, set } from "firebase/database";
import { useEffect } from "react";
import { db } from "../firebase";
import { getNotifications, isAndroidExpoGo } from "../utils/notifications";

const PROJECT_ID = "a35b5dbd-7933-4073-b5e3-5e4d31ecf0df";

export function useExpoPushToken() {
  useEffect(() => {
    registerToken();
  }, []);

  async function registerToken() {
    if (isAndroidExpoGo || !Device.isDevice) return;

    const Notifications = await getNotifications();
    if (!Notifications) return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const token = (await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID })).data;

    await AsyncStorage.setItem("expoPushToken", token);

    const uid = await AsyncStorage.getItem("userUID");
    if (uid) {
      await set(ref(db, `users/${uid}/expoPushToken`), token);
    }
  }
}

import Constants from "expo-constants";
import { Platform } from "react-native";

export const isAndroidExpoGo =
  Platform.OS === "android" && Constants.appOwnership === "expo";

let notificationsPromise = null;

export async function getNotifications() {
  if (isAndroidExpoGo) {
    return null;
  }

  if (!notificationsPromise) {
    notificationsPromise = import("expo-notifications").then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      if (Platform.OS === "android") {
        Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 200, 500],
          lightColor: "#B00020",
          sound: "default",
          enableVibrate: true,
          showBadge: true,
        }).catch((e) => console.log("Default notification channel error:", e));
      }

      return Notifications;
    });
  }

  return notificationsPromise;
}

export async function scheduleNotification(request) {
  const Notifications = await getNotifications();
  if (!Notifications) return null;
  return Notifications.scheduleNotificationAsync(request);
}

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
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
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

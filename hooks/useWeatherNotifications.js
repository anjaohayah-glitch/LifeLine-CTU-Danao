// app/_layout.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { onValue, ref } from "firebase/database";
import { useEffect } from "react";
import { SettingsProvider } from "../context/SettingsContext";
import { db } from "../firebase";
import { useAlertNotifications } from "../hooks/useAlertNotifications";
import { useNotifications } from "../hooks/useNotifications";
import { registerWeatherBackgroundFetch } from "../hooks/useWeatherNotifications";

// Set notification handler globally
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function AppLayout() {
  useNotifications();
  useAlertNotifications();

  useEffect(() => {
    // ✅ Listen for admin emergency alerts in real-time
    const alertRef = ref(db, "emergencyAlert");
    const unsubAlert = onValue(alertRef, async (snapshot) => {
      const data = snapshot.val();
      if (data?.active === true) {
        const lastNotif = await AsyncStorage.getItem("lastEmergencyNotif");
        const alertTime = data.timestamp || 0;

        if (!lastNotif || alertTime > parseInt(lastNotif)) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "🚨 EMERGENCY ALERT — LIFELINE",
              body: data.message || "Emergency alert issued for CTU Danao Campus!",
              sound: true,
              priority: Notifications.AndroidNotificationPriority.MAX,
              vibrate: [0, 1000, 300, 1000, 300, 1000],
              color: "#B00020",
              sticky: true,
            },
            trigger: null,
          });
          await AsyncStorage.setItem("lastEmergencyNotif", String(alertTime));
        }
      }
    });

    // ✅ Listen for new SOS requests in real-time
    const sosRef = ref(db, "sosRequests");
    const unsubSOS = onValue(sosRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const savedUID = await AsyncStorage.getItem("userUID");
      if (!savedUID) return;

      const requests = Object.values(data);
      const now = Date.now();
      const fiveMin = 5 * 60 * 1000;
      const lastSOS = await AsyncStorage.getItem("lastSOSNotif");

      const recentSOS = requests.find((req) => {
        const reqTime = new Date(req.timestamp).getTime();
        return (
          now - reqTime < fiveMin &&
          req.uid !== savedUID &&
          (!lastSOS || reqTime > parseInt(lastSOS))
        );
      });

      if (recentSOS) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🆘 SOS RECEIVED — LIFELINE",
            body: `${recentSOS.name || "A contact"} needs help! Location: ${recentSOS.address || "See app for details"}`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 500, 100, 500, 100, 500, 100, 500],
            color: "#B00020",
          },
          trigger: null,
        });
        await AsyncStorage.setItem("lastSOSNotif", String(new Date(recentSOS.timestamp).getTime()));
      }
    });

    return () => {
      unsubAlert();
      unsubSOS();
    };
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="splash" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="home" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="evacuation" />
      <Stack.Screen name="hotlines" />
      <Stack.Screen name="weather" />
      <Stack.Screen name="firstaid" />
      <Stack.Screen name="guides" />
      <Stack.Screen name="checklist" />
      <Stack.Screen name="family" />
      <Stack.Screen name="drrm" />
      <Stack.Screen name="voiceguide" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

export default function Layout() {
  useEffect(() => {
    registerWeatherBackgroundFetch();
  }, []);

  return (
    <SettingsProvider>
      <AppLayout />
    </SettingsProvider>
  );
}
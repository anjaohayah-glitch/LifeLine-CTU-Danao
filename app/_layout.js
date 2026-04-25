import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { onValue, ref } from "firebase/database";
import { useEffect } from "react";
import { SettingsProvider } from "../context/SettingsContext";
import { db } from "../firebase";

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function AppLayout() {
  useEffect(() => {
    // 1. Listen for Emergency Alerts
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
            },
            trigger: null,
          });
          await AsyncStorage.setItem("lastEmergencyNotif", String(alertTime));
        }
      }
    });

    // 2. Listen for SOS Requests
    const sosRef = ref(db, "sosRequests");
    const unsubSOS = onValue(sosRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const savedUID = await AsyncStorage.getItem("userUID");
      if (!savedUID) return;

      const requests = Object.values(data);
      const now = Date.now();
      const lastSOS = await AsyncStorage.getItem("lastSOSNotif");

      const recentSOS = requests.find((req) => {
        const reqTime = new Date(req.timestamp).getTime();
        return (
          now - reqTime < 300000 && // 5 minutes
          req.uid !== savedUID &&
          (!lastSOS || reqTime > parseInt(lastSOS))
        );
      });

      if (recentSOS) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🆘 SOS RECEIVED — LIFELINE",
            body: `${recentSOS.name || "A contact"} needs help!`,
            sound: true,
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
      <Stack.Screen name="home" />
      {/* Add your other screens here if needed */}
    </Stack>
  );
}

export default function Layout() {
  return (
    <SettingsProvider>
      <AppLayout />
    </SettingsProvider>
  );
}
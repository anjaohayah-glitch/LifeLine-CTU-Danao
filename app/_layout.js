// app/_layout.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { onValue, ref, set } from "firebase/database";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { SettingsProvider } from "../context/SettingsContext";
import { auth, db } from "../firebase";
import { fetchNearbyEarthquake, handleQuakeFound } from "../hooks/useEarthquakeCheck";
import { registerWeatherBackgroundFetch } from "../hooks/useWeatherNotifications";

// Foreground notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── REGISTER FOR PUSH NOTIFICATIONS ─────────────────────
const registerForPushNotifications = async () => {
  if (!Device.isDevice) {
    console.log("Not a real device — push notifications unavailable");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Notification permission denied");
    return null;
  }

  // Android notification channels
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "General",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#B00020",
      sound: "default",
    });
    await Notifications.setNotificationChannelAsync("lifeline_alerts", {
      name: "LIFELINE Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: "#B00020",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync("emergency", {
      name: "Emergency Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      lightColor: "#FF0000",
      sound: "default",
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
    await Notifications.setNotificationChannelAsync("sos", {
      name: "SOS Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: "#FF5722",
      sound: "default",
    });
    await Notifications.setNotificationChannelAsync("social", {
      name: "Contact & Safety Updates",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250],
      lightColor: "#4CAF50",
      sound: "default",
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "a35b5dbd-7933-4073-b5e3-5e4d31ecf0df",
    });
    const token = tokenData.data;
    console.log("✅ Push token:", token);
    return token;
  } catch (e) {
    console.log("Push token error:", e);
    return null;
  }
};

// ── SEND PUSH TO ONE TOKEN ───────────────────────────────
const sendPush = async (token, title, body, data = {}, channelId = "default") => {
  if (!token) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data,
        sound: "default",
        priority: "high",
        channelId,
      }),
    });
  } catch (e) {
    console.log("Push send error:", e);
  }
};

// ── SEND PUSH TO MULTIPLE TOKENS ────────────────────────
const sendPushToMany = async (tokens, title, body, data = {}, channelId = "default") => {
  const validTokens = tokens.filter(Boolean);
  if (validTokens.length === 0) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        validTokens.map((token) => ({
          to: token,
          title,
          body,
          data,
          sound: "default",
          priority: "high",
          channelId,
        }))
      ),
    });
    console.log(`✅ Push sent to ${validTokens.length} users`);
  } catch (e) {
    console.log("Push multi-send error:", e);
  }
};

// ── GET ALL FCM TOKENS ───────────────────────────────────
const getAllFCMTokens = async () => {
  return new Promise((resolve) => {
    onValue(ref(db, "fcmTokens"), (snap) => {
      const data = snap.val();
      if (!data) { resolve([]); return; }
      resolve(Object.values(data).filter(Boolean));
    }, { onlyOnce: true });
  });
};

// ── GET CONTACT PUSH TOKENS ─────────────────────────────
const getContactTokens = async (uid) => {
  return new Promise((resolve) => {
    onValue(ref(db, `contacts/${uid}`), async (snap) => {
      const data = snap.val();
      if (!data) { resolve([]); return; }
      const accepted = Object.values(data).filter((c) => c.status === "accepted");
      const tokens = await Promise.all(
        accepted.map((contact) =>
          new Promise((res) => {
            onValue(ref(db, `fcmTokens/${contact.uid}`), (s) => res(s.val()), { onlyOnce: true });
          })
        )
      );
      resolve(tokens.filter(Boolean));
    }, { onlyOnce: true });
  });
};

function AppLayout() {
  const router = useRouter();
  const notifListener = useRef();
  const responseListener = useRef();

  useEffect(() => {

    // ── REGISTER PUSH TOKEN ────────────────────────────
    const setupPush = async () => {
      const token = await registerForPushNotifications();
      if (!token) return;

      const unsubAuth = auth.onAuthStateChanged(async (user) => {
        if (user) {
          // ✅ Save to BOTH locations
          await set(ref(db, `users/${user.uid}/expoPushToken`), token);
          await set(ref(db, `fcmTokens/${user.uid}`), token);
          await AsyncStorage.setItem("expoPushToken", token);
          await AsyncStorage.setItem("userUID", user.uid);
          console.log("✅ Token saved to Firebase:", token);
        }
      });
      return unsubAuth;
    };

    const unsubAuthPromise = setupPush();

    // ── CHECK EARTHQUAKES ON APP OPEN ─────────────────
    const checkQuakeOnOpen = async () => {
      try {
        console.log("🌍 Checking earthquakes on app open...");
        const quake = await fetchNearbyEarthquake();
        if (quake) {
          console.log(`🌍 Quake found: Mag ${quake.mag} at ${quake.place}`);
          await handleQuakeFound(quake);
        } else {
          console.log("✅ No nearby earthquakes detected");
        }
      } catch (e) {
        console.log("Earthquake check failed silently:", e);
      }
    };
    checkQuakeOnOpen();

    // ── EMERGENCY ALERTS ──────────────────────────────
    const unsubAlert = onValue(ref(db, "emergencyAlert"), async (snapshot) => {
      const data = snapshot.val();
      if (!data?.active) return;

      const alertTime = data.timestamp || 0;
      const lastNotif = await AsyncStorage.getItem("lastEmergencyNotif");

      if (!lastNotif || alertTime > parseInt(lastNotif)) {
        // Local notification (when app is open)
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🚨 EMERGENCY ALERT — LIFELINE",
            body: data.message || "Emergency alert issued for CTU Danao Campus!",
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 1000, 300, 1000, 300, 1000],
            data: { type: "emergency", screen: "evacuation" },
          },
          trigger: null,
        });

        // Push to ALL users (when app is closed)
        const allTokens = await getAllFCMTokens();
        await sendPushToMany(
          allTokens,
          "🚨 EMERGENCY ALERT — LIFELINE",
          data.message || "Emergency alert issued for CTU Danao Campus!",
          { type: "emergency", screen: "evacuation" },
          "emergency"
        );

        await AsyncStorage.setItem("lastEmergencyNotif", String(alertTime));
      }
    });

    // ── SOS ALERTS ────────────────────────────────────
    const unsubSOS = onValue(ref(db, "sosRequests"), async (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const user = auth.currentUser;
      if (!user) return;

      const now = Date.now();
      const lastSOS = await AsyncStorage.getItem("lastSOSNotif");
      const requests = Object.values(data);

      const recentSOS = requests.find((req) => {
        const reqTime = new Date(req.timestamp).getTime();
        return (
          now - reqTime < 300000 &&
          req.uid !== user.uid &&
          (!lastSOS || reqTime > parseInt(lastSOS))
        );
      });

      if (recentSOS) {
        // Local notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🆘 SOS RECEIVED — LIFELINE",
            body: `${recentSOS.name || "A contact"} needs help!\n📍 ${recentSOS.address || "See app for details"}`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 500, 100, 500, 100, 500, 100, 500],
            data: { type: "sos", screen: "family" },
          },
          trigger: null,
        });

        // Push to contacts (when app is closed)
        const tokens = await getContactTokens(user.uid);
        await sendPushToMany(
          tokens,
          "🆘 SOS RECEIVED — LIFELINE",
          `${recentSOS.name || "A contact"} needs help! Tap to navigate to their location.`,
          { type: "sos", screen: "family" },
          "sos"
        );

        await AsyncStorage.setItem(
          "lastSOSNotif",
          String(new Date(recentSOS.timestamp).getTime())
        );
      }
    });

    // ── CONTACT REQUESTS ─────────────────────────────
    const setupContactRequestListener = () => {
      const user = auth.currentUser;
      if (!user) return null;
      return onValue(ref(db, `contactRequests/${user.uid}`), async (snap) => {
        const data = snap.val();
        if (!data) return;
        const pending = Object.values(data).filter((r) => r.status === "pending");
        const lastReq = await AsyncStorage.getItem("lastContactRequestNotif");
        const newReq = pending.find(
          (r) => !lastReq || new Date(r.sentAt).getTime() > parseInt(lastReq)
        );
        if (newReq) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "📨 New Contact Request",
              body: `${newReq.name || "Someone"} wants to add you as a contact.`,
              sound: true,
              data: { type: "request", screen: "family" },
            },
            trigger: null,
          });
          await AsyncStorage.setItem(
            "lastContactRequestNotif",
            String(new Date(newReq.sentAt).getTime())
          );
        }
      });
    };

    // ── SAFETY STATUS UPDATES ─────────────────────────
    const setupSafetyListener = () => {
      const user = auth.currentUser;
      if (!user) return null;
      return onValue(ref(db, `contacts/${user.uid}`), (snap) => {
        const contacts = snap.val();
        if (!contacts) return;
        const accepted = Object.entries(contacts)
          .map(([id, val]) => ({ id, ...val }))
          .filter((c) => c.status === "accepted");
        accepted.forEach((contact) => {
          onValue(ref(db, `safetyStatus/${contact.uid}`), async (statusSnap) => {
            const status = statusSnap.val();
            if (!status) return;
            const lastKey = `lastSafetyNotif_${contact.uid}`;
            const lastNotif = await AsyncStorage.getItem(lastKey);
            if (!lastNotif || status.timestamp > parseInt(lastNotif)) {
              const isSafe = status.status === "safe";
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: isSafe ? "🟢 Contact is Safe" : "🔴 Contact Needs Help",
                  body: `${contact.name || "Your contact"} ${isSafe ? "is safe!" : "needs help!"}`,
                  sound: true,
                  data: { type: "safety", screen: "family" },
                },
                trigger: null,
              });
              await AsyncStorage.setItem(lastKey, String(status.timestamp));
            }
          });
        });
      }, { onlyOnce: true });
    };

    // Set up auth-dependent listeners
    let unsubContactReq = null;
    let unsubSafety = null;
    const unsubAuthState = auth.onAuthStateChanged((user) => {
      if (user) {
        unsubContactReq = setupContactRequestListener();
        unsubSafety = setupSafetyListener();
      }
    });

    // ── NOTIFICATION TAP HANDLER ──────────────────────
    notifListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log("✅ Notification received:", notification.request.content.title);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen;
      if (screen) {
        setTimeout(() => router.push(`/${screen}`), 500);
      }
    });

    return () => {
      unsubAlert();
      unsubSOS();
      unsubAuthState();
      if (unsubContactReq) unsubContactReq();
      if (unsubSafety) unsubSafety();
      if (unsubAuthPromise) unsubAuthPromise.then((unsub) => unsub?.());
      // ✅ FIXED — use .remove() instead of removeNotificationSubscription
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="splash" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="home" />
      <Stack.Screen name="evacuation" />
      <Stack.Screen name="firstaid" />
      <Stack.Screen name="family" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="hotlines" />
      <Stack.Screen name="weather" />
      <Stack.Screen name="checklist" />
      <Stack.Screen name="gobag" />
      <Stack.Screen name="guides" />
      <Stack.Screen name="drrm" />
      <Stack.Screen name="preparedness" />
      <Stack.Screen name="voiceguide" />
      <Stack.Screen name="earthqauake" />
      <Stack.Screen name="admin" />
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
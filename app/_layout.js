import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { onValue, ref, set } from "firebase/database";
import { useEffect, useRef } from "react";
import { SettingsProvider } from "../context/SettingsContext";
import { auth, db } from "../firebase";
import { fetchNearbyEarthquake, handleQuakeFound } from "../hooks/useEarthquakeCheck";
import { useFCMToken } from "../hooks/useFCMToken";
import { registerWeatherBackgroundFetch } from "../hooks/useWeatherNotifications";
import { getNotifications, scheduleNotification } from "../utils/notifications";

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
  } catch (e) {
    console.log("Push multi-send error:", e);
  }
};

const getAllFCMTokens = async () =>
  new Promise((resolve) => {
    onValue(
      ref(db, "fcmTokens"),
      (snap) => {
        const data = snap.val();
        resolve(data ? Object.values(data).filter(Boolean) : []);
      },
      { onlyOnce: true }
    );
  });

const getContactTokens = async (uid) =>
  new Promise((resolve) => {
    onValue(
      ref(db, `contacts/${uid}`),
      async (snap) => {
        const data = snap.val();
        if (!data) {
          resolve([]);
          return;
        }

        const accepted = Object.values(data).filter((contact) => contact.status === "accepted");
        const tokens = await Promise.all(
          accepted.map(
            (contact) =>
              new Promise((res) => {
                onValue(ref(db, `fcmTokens/${contact.uid}`), (s) => res(s.val()), {
                  onlyOnce: true,
                });
              })
          )
        );

        resolve(tokens.filter(Boolean));
      },
      { onlyOnce: true }
    );
  });

function AppLayout() {
  const router = useRouter();
  const notifListener = useRef();
  const responseListener = useRef();

  useFCMToken();

  useEffect(() => {
    const checkQuakeOnOpen = async () => {
      try {
        const quake = await Promise.race([
          fetchNearbyEarthquake(),
          new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);

        if (quake) {
          await handleQuakeFound(quake);
        } else {
          console.log("No nearby earthquakes or timed out");
        }
      } catch (e) {
        console.log("Earthquake check skipped:", e);
      }
    };

    const quakeTimer = setTimeout(checkQuakeOnOpen, 3000);

    const unsubAlert = onValue(ref(db, "emergencyAlert"), async (snapshot) => {
      try {
        const data = snapshot.val();
        if (!data?.active) return;

        const alertTime = data.timestamp || 0;
        const lastNotif = await AsyncStorage.getItem("lastEmergencyNotif");

        if (!lastNotif || alertTime > parseInt(lastNotif, 10)) {
          const title = "Emergency Alert - LIFELINE";
          const body = data.message || "Emergency alert issued for CTU Danao Campus!";

          await scheduleNotification({
            content: {
              title,
              body,
              sound: true,
              vibrate: [0, 1000, 300, 1000, 300, 1000],
              data: { type: "emergency", screen: "evacuation" },
            },
            trigger: null,
          });

          const allTokens = await getAllFCMTokens();
          await sendPushToMany(allTokens, title, body, { type: "emergency", screen: "evacuation" }, "emergency");

          await AsyncStorage.setItem("lastEmergencyNotif", String(alertTime));
        }
      } catch (e) {
        console.log("Emergency alert error:", e);
      }
    });

    const unsubSOS = onValue(ref(db, "sosRequests"), async (snapshot) => {
      try {
        const data = snapshot.val();
        const user = auth.currentUser;
        if (!data || !user) return;

        const now = Date.now();
        const lastSOS = await AsyncStorage.getItem("lastSOSNotif");
        const recentSOS = Object.values(data).find((req) => {
          const reqTime = new Date(req.timestamp).getTime();
          return now - reqTime < 300000 && req.uid !== user.uid && (!lastSOS || reqTime > parseInt(lastSOS, 10));
        });

        if (recentSOS) {
          const title = "SOS Received - LIFELINE";

          await scheduleNotification({
            content: {
              title,
              body: `${recentSOS.name || "A contact"} needs help!\n${recentSOS.address || "See app for details"}`,
              sound: true,
              vibrate: [0, 500, 100, 500, 100, 500, 100, 500],
              data: { type: "sos", screen: "family" },
            },
            trigger: null,
          });

          const tokens = await getContactTokens(user.uid);
          await sendPushToMany(
            tokens,
            title,
            `${recentSOS.name || "A contact"} needs help! Tap to navigate.`,
            { type: "sos", screen: "family" },
            "sos"
          );

          await AsyncStorage.setItem("lastSOSNotif", String(new Date(recentSOS.timestamp).getTime()));
        }
      } catch (e) {
        console.log("SOS alert error:", e);
      }
    });

    const setupContactRequestListener = () => {
      const user = auth.currentUser;
      if (!user) return null;

      return onValue(ref(db, `contactRequests/${user.uid}`), async (snap) => {
        try {
          const data = snap.val();
          if (!data) return;

          const pending = Object.values(data).filter((request) => request.status === "pending");
          const lastReq = await AsyncStorage.getItem("lastContactRequestNotif");
          const newReq = pending.find((request) => !lastReq || new Date(request.sentAt).getTime() > parseInt(lastReq, 10));

          if (newReq) {
            await scheduleNotification({
              content: {
                title: "New Contact Request",
                body: `${newReq.name || "Someone"} wants to add you as a contact.`,
                sound: true,
                data: { type: "request", screen: "family" },
              },
              trigger: null,
            });
            await AsyncStorage.setItem("lastContactRequestNotif", String(new Date(newReq.sentAt).getTime()));
          }
        } catch (e) {
          console.log("Contact request error:", e);
        }
      });
    };

    const setupSafetyListener = () => {
      const user = auth.currentUser;
      if (!user) return null;

      return onValue(
        ref(db, `contacts/${user.uid}`),
        (snap) => {
          const contacts = snap.val();
          if (!contacts) return;

          Object.values(contacts)
            .filter((contact) => contact.status === "accepted")
            .forEach((contact) => {
              onValue(ref(db, `safetyStatus/${contact.uid}`), async (statusSnap) => {
                try {
                  const status = statusSnap.val();
                  if (!status) return;

                  const lastKey = `lastSafetyNotif_${contact.uid}`;
                  const lastNotif = await AsyncStorage.getItem(lastKey);

                  if (!lastNotif || status.timestamp > parseInt(lastNotif, 10)) {
                    const isSafe = status.status === "safe";
                    await scheduleNotification({
                      content: {
                        title: isSafe ? "Contact is Safe" : "Contact Needs Help",
                        body: `${contact.name || "Your contact"} ${isSafe ? "is safe!" : "needs help!"}`,
                        sound: true,
                        data: { type: "safety", screen: "family" },
                      },
                      trigger: null,
                    });
                    await AsyncStorage.setItem(lastKey, String(status.timestamp));
                  }
                } catch (e) {
                  console.log("Safety status error:", e);
                }
              });
            });
        },
        { onlyOnce: true }
      );
    };

    let unsubContactReq = null;
    let unsubSafety = null;
    const unsubAuthState = auth.onAuthStateChanged((user) => {
      if (user) {
        set(ref(db, `users/${user.uid}/lastSeen`), Date.now()).catch(() => {});
        AsyncStorage.setItem("userUID", user.uid).catch(() => {});
        unsubContactReq = setupContactRequestListener();
        unsubSafety = setupSafetyListener();
      }
    });

    const setupNotificationResponse = async () => {
      const Notifications = await getNotifications();
      if (!Notifications) return;

      notifListener.current = Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification.request.content.title);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        const screen = response.notification.request.content.data?.screen;
        if (screen) {
          setTimeout(() => router.push(`/${screen}`), 500);
        }
      });
    };

    setupNotificationResponse();

    return () => {
      clearTimeout(quakeTimer);
      unsubAlert();
      unsubSOS();
      unsubAuthState();
      if (unsubContactReq) unsubContactReq();
      if (unsubSafety) unsubSafety();
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [router]);

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
    registerWeatherBackgroundFetch().catch((e) => {
      console.log("Background fetch registration error:", e);
    });
  }, []);

  return (
    <SettingsProvider>
      <AppLayout />
    </SettingsProvider>
  );
}

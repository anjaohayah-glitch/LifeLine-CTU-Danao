// hooks/useAlertNotifications.js
import * as Notifications from "expo-notifications";
import { onValue, ref } from "firebase/database";
import { useEffect, useRef } from "react";
import { db } from "../firebase";

export function useAlertNotifications() {
  const prevAlert = useRef(null);
  const prevAnnouncement = useRef(null);
  const prevSOSCount = useRef(null);

  // 🚨 Watch Emergency Alert
  useEffect(() => {
    const alertRef = ref(db, "emergencyAlert");
    const unsubscribe = onValue(alertRef, (snapshot) => {
      const data = snapshot.val();
      if (prevAlert.current === false && data === true) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: "🚨 EMERGENCY ALERT",
            body: "A disaster alert has been issued. Stay safe!",
            sound: true,
            data: { screen: "/home" },
          },
          trigger: null,
        });
      }
      prevAlert.current = data;
    });
    return () => unsubscribe();
  }, []);

  // 📢 Watch Announcements
  useEffect(() => {
    const annRef = ref(db, "announcement");
    const unsubscribe = onValue(annRef, (snapshot) => {
      const data = snapshot.val();
      if (
        data?.message &&
        prevAnnouncement.current !== null &&
        prevAnnouncement.current !== data.message
      ) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: "📢 New Announcement",
            body: data.message,
            sound: true,
            data: { screen: "/home" },
          },
          trigger: null,
        });
      }
      prevAnnouncement.current = data?.message || null;
    });
    return () => unsubscribe();
  }, []);

  // 🆘 Watch SOS Requests
  useEffect(() => {
    const sosRef = ref(db, "sosRequests");
    const unsubscribe = onValue(sosRef, (snapshot) => {
      const data = snapshot.val();
      const count = data ? Object.keys(data).length : 0;
      if (prevSOSCount.current !== null && count > prevSOSCount.current) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: "🆘 New SOS Request",
            body: "Someone needs help! Check the admin dashboard.",
            sound: true,
            data: { screen: "/admin" },
          },
          trigger: null,
        });
      }
      prevSOSCount.current = count;
    });
    return () => unsubscribe();
  }, []);
}
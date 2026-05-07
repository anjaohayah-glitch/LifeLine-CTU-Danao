// utils/sendPushNotification.js
import { get, ref } from "firebase/database";
import { db } from "../firebase";

export async function sendPushToAllUsers(title, body, data = {}) {
  const snapshot = await get(ref(db, "users"));
  if (!snapshot.exists()) return;

  const users = snapshot.val();
  const tokens = Object.values(users)
    .map((u) => u.expoPushToken)
    .filter(Boolean);

  // Expo allows batches of 100
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100);
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        chunk.map((token) => ({
          to: token,
          title,
          body,
          sound: "default",
          priority: "high",
          data,
          channelId: "emergency",
        }))
      ),
    });
  }
}

export async function sendPushToUser(uid, title, body, data = {}) {
  const snapshot = await get(ref(db, `users/${uid}/expoPushToken`));
  if (!snapshot.exists()) return;
  const token = snapshot.val();

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: token,
      title,
      body,
      sound: "default",
      priority: "high",
      data,
      channelId: "emergency",
    }),
  });
}
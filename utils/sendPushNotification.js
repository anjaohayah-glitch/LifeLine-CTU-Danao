// utils/sendPushNotification.js
import { get, ref } from "firebase/database";
import { db } from "../firebase";

export async function sendPushToAllUsers(title, body, data = {}) {
  try {
    const snapshot = await get(ref(db, "users"));
    if (!snapshot.exists()) {
      console.log("❌ No users found");
      return;
    }

    const users = snapshot.val();
    const tokens = Object.values(users)
      .map((u) => u.expoPushToken)
      .filter((t) => t && t.startsWith("ExponentPushToken"));

    console.log("📤 Sending to", tokens.length, "devices");

    if (tokens.length === 0) {
      console.log("❌ No valid tokens found");
      return;
    }

    // Send in batches of 100
    for (let i = 0; i < tokens.length; i += 100) {
      const chunk = tokens.slice(i, i + 100);
      const messages = chunk.map((token) => ({
        to: token,
        title,
        body,
        sound: "default",
        priority: "high",
        channelId: "emergency",
        data,
        ttl: 86400, // 24 hours
        expiration: Math.floor(Date.now() / 1000) + 86400,
        badge: 1,
      }));

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      console.log("📬 Push result:", JSON.stringify(result));
    }
  } catch (e) {
    console.log("❌ Push send error:", e.message);
  }
}
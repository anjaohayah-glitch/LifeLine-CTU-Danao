// utils/sendPushNotification.js
import { get, ref } from "firebase/database";
import { db } from "../firebase";
import { EMERGENCY_CHANNEL_ID, EMERGENCY_SOUND } from "./notificationChannels";

const isExpoPushToken = (token) =>
  typeof token === "string" &&
  (token.startsWith("ExponentPushToken") || token.startsWith("ExpoPushToken"));

const normalizeScreenData = (data) => {
  if (!data?.screen || typeof data.screen !== "string") return data;
  return { ...data, screen: data.screen.replace(/^\/+/, "") };
};

const getAllExpoPushTokens = async () => {
  const [usersSnapshot, tokensSnapshot] = await Promise.all([
    get(ref(db, "users")),
    get(ref(db, "fcmTokens")),
  ]);

  const userTokens = usersSnapshot.exists()
    ? Object.values(usersSnapshot.val())
        .map((user) => user?.expoPushToken)
        .filter(isExpoPushToken)
    : [];

  const fcmTokens = tokensSnapshot.exists()
    ? Object.values(tokensSnapshot.val()).filter(isExpoPushToken)
    : [];

  return [...new Set([...userTokens, ...fcmTokens])];
};

export async function sendPushToAllUsers(title, body, data = {}, channelId = "emergency") {
  try {
    const tokens = await getAllExpoPushTokens();

    console.log("Sending push to", tokens.length, "devices");

    if (tokens.length === 0) {
      console.log("No valid Expo push tokens found");
      return { sent: 0, tickets: [] };
    }

    const tickets = [];
    for (let i = 0; i < tokens.length; i += 100) {
      const chunk = tokens.slice(i, i + 100);
      const sound = channelId === EMERGENCY_CHANNEL_ID ? EMERGENCY_SOUND : "default";
      const messages = chunk.map((token) => ({
        to: token,
        title,
        body,
        sound,
        priority: "high",
        channelId,
        data: normalizeScreenData(data),
        ttl: 86400,
        expiration: Math.floor(Date.now() / 1000) + 86400,
        badge: 1,
      }));

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      console.log("Push result:", JSON.stringify(result));
      tickets.push(result);
    }

    return { sent: tokens.length, tickets };
  } catch (e) {
    console.log("Push send error:", e.message);
    return { sent: 0, error: e.message };
  }
}

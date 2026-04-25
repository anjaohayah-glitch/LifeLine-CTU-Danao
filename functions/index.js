// functions/index.js
const { onValueWritten } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getMessaging } = require("firebase-admin/messaging");
const axios = require("axios");

initializeApp();

const db = getDatabase();
const messaging = getMessaging();

const WEATHER_API_KEY = "f1174f62efabb76017f70f21096688b2";
const DANAO_LAT = 10.52;
const DANAO_LON = 124.03;
const USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

// ── HELPER: Get all user FCM tokens ──────────────────────
const getAllTokens = async () => {
  try {
    const snapshot = await db.ref("fcmTokens").get();
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val()).filter(Boolean);
  } catch (e) {
    console.log("Error getting tokens:", e);
    return [];
  }
};

// ── HELPER: Send notification to all users ───────────────
const sendToAll = async (title, body, data = {}) => {
  const tokens = await getAllTokens();
  if (tokens.length === 0) return;

  const message = {
    notification: { title, body },
    data,
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "lifeline_alerts",
        priority: "max",
        defaultVibrateTimings: false,
        vibrateTimingsMillis: [0, 500, 200, 500, 200, 500],
        color: "#B00020",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
          contentAvailable: true,
        },
      },
    },
    tokens,
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log(`✅ Sent to ${response.successCount}/${tokens.length} users`);
  } catch (e) {
    console.log("Send error:", e);
  }
};

// ── TRIGGER 1: Admin Emergency Alert ─────────────────────
// Fires instantly when admin sets emergencyAlert in Firebase
exports.onEmergencyAlert = onValueWritten(
  { ref: "/emergencyAlert", region: "us-central1" },
  async (event) => {
    const after = event.data.after.val();
    if (!after || after.active !== true) return;

    console.log("🚨 Emergency alert detected — notifying all users");

    await sendToAll(
      "🚨 EMERGENCY ALERT — LIFELINE",
      after.message || "Emergency alert issued for CTU Danao Campus! Open the app immediately.",
      { type: "emergency", screen: "evacuation" }
    );
  }
);

// ── TRIGGER 2: SOS Request ───────────────────────────────
// Fires instantly when any user sends an SOS
exports.onSOSRequest = onValueWritten(
  { ref: "/sosRequests/{timestamp}", region: "us-central1" },
  async (event) => {
    const sos = event.data.after.val();
    if (!sos) return;

    console.log(`🆘 SOS received from ${sos.name}`);

    // Get contacts of the SOS sender
    try {
      const contactsSnapshot = await db.ref(`contacts/${sos.uid}`).get();
      if (!contactsSnapshot.exists()) return;

      const contacts = Object.values(contactsSnapshot.val())
        .filter((c) => c.status === "accepted");

      // Get tokens only for the sender's contacts
      const contactTokens = [];
      for (const contact of contacts) {
        const tokenSnapshot = await db.ref(`fcmTokens/${contact.uid}`).get();
        if (tokenSnapshot.exists()) {
          contactTokens.push(tokenSnapshot.val());
        }
      }

      if (contactTokens.length === 0) return;

      const message = {
        notification: {
          title: "🆘 SOS RECEIVED — LIFELINE",
          body: `${sos.name || "A contact"} needs help! Location: ${sos.address || "See app for details"}. Tap to navigate.`,
        },
        data: {
          type: "sos",
          screen: "family",
          locationUrl: sos.locationUrl || "",
          senderName: sos.name || "",
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "lifeline_alerts",
            priority: "max",
            defaultVibrateTimings: false,
            vibrateTimingsMillis: [0, 300, 100, 300, 100, 300, 100, 300],
            color: "#B00020",
          },
        },
        apns: {
          payload: { aps: { sound: "default", badge: 1 } },
        },
        tokens: contactTokens,
      };

      const response = await getMessaging().sendEachForMulticast(message);
      console.log(`✅ SOS notification sent to ${response.successCount} contacts`);
    } catch (e) {
      console.log("SOS notification error:", e);
    }
  }
);

// ── TRIGGER 3: Weather + Earthquake Check (every 15 min) ─
exports.scheduledWeatherCheck = onSchedule(
  { schedule: "every 15 minutes", region: "us-central1" },
  async () => {
    console.log("⏰ Running scheduled weather + earthquake check");

    // ── WEATHER CHECK ────────────────────────────────────
    try {
      const weatherRes = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${DANAO_LAT}&lon=${DANAO_LON}&appid=${WEATHER_API_KEY}&units=metric`
      );
      const data = weatherRes.data;
      const condition = data?.weather?.[0]?.main;
      const windSpeed = data?.wind?.speed || 0;
      const windKmh = windSpeed * 3.6;
      const temp = data?.main?.temp || 0;

      let title = null;
      let body = null;

      if (windKmh >= 62) {
        title = "🌪 TYPHOON WARNING — LIFELINE";
        body = `Winds at ${windKmh.toFixed(0)} km/h detected near Danao City! Take shelter immediately and proceed to the nearest evacuation center.`;
      } else if (windKmh >= 39) {
        title = "⚠️ Strong Wind Warning — LIFELINE";
        body = `Wind speed of ${windKmh.toFixed(0)} km/h detected. Stay indoors and avoid open areas.`;
      } else if (condition === "Thunderstorm") {
        title = "⛈ Thunderstorm Warning — LIFELINE";
        body = "A thunderstorm has been detected near Danao City. Stay indoors and away from windows.";
      } else if (condition === "Rain") {
        title = "🌧 Heavy Rain Advisory — LIFELINE";
        body = `Heavy rain detected near Danao City (${temp}°C). Avoid flood-prone areas and stay safe.`;
      } else if (condition === "Squall" || condition === "Tornado") {
        title = "🌪 Severe Weather Alert — LIFELINE";
        body = "Severe weather detected near Danao City. Take immediate shelter.";
      }

      if (title && body) {
        // Check last weather notification time to avoid spam
        const lastNotifSnap = await db.ref("systemLogs/lastWeatherNotif").get();
        const lastNotif = lastNotifSnap.exists() ? lastNotifSnap.val() : 0;
        const oneHour = 60 * 60 * 1000;

        if (Date.now() - lastNotif >= oneHour) {
          await sendToAll(title, body, { type: "weather", screen: "weather" });
          await db.ref("systemLogs/lastWeatherNotif").set(Date.now());
          console.log(`✅ Weather alert sent: ${title}`);
        }
      } else {
        console.log(`☀️ No weather warning — ${condition}, ${windKmh.toFixed(0)} km/h`);
      }
    } catch (e) {
      console.log("Weather check error:", e);
    }

    // ── EARTHQUAKE CHECK ─────────────────────────────────
    try {
      const quakeRes = await axios.get(USGS_URL);
      const quakeData = quakeRes.data;

      const nearbyQuake = quakeData.features.find((quake) => {
        const [lon, lat] = quake.geometry.coordinates;
        const mag = quake.properties.mag;
        const isNear = Math.abs(lat - 10.52) < 2 && Math.abs(lon - 124.03) < 2;
        return mag >= 4.0 && isNear;
      });

      if (nearbyQuake) {
        const mag = nearbyQuake.properties.mag;
        const place = nearbyQuake.properties.place;
        const quakeTime = nearbyQuake.properties.time;

        // Avoid duplicate earthquake notifications
        const lastQuakeSnap = await db.ref("systemLogs/lastQuakeNotif").get();
        const lastQuake = lastQuakeSnap.exists() ? lastQuakeSnap.val() : 0;

        if (quakeTime > lastQuake) {
          // Auto-activate emergency alert for all users
          await db.ref("emergencyAlert").set({
            active: true,
            message: `🌍 EARTHQUAKE DETECTED: Magnitude ${mag} near ${place}. Proceed to nearest evacuation center immediately!`,
            timestamp: Date.now(),
            type: "seismic_alert",
          });

          await sendToAll(
            "🌍 EARTHQUAKE ALERT — LIFELINE",
            `Magnitude ${mag} earthquake detected near ${place}! Open LIFELINE for evacuation instructions immediately.`,
            { type: "earthquake", screen: "evacuation" }
          );

          await db.ref("systemLogs/lastQuakeNotif").set(quakeTime);
          console.log(`✅ Earthquake alert sent: Mag ${mag} at ${place}`);
        }
      } else {
        console.log("✅ No significant earthquake detected near Danao");
      }
    } catch (e) {
      console.log("Earthquake check error:", e);
    }
  }
);
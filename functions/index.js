// functions/index.js
const { onValueWritten } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const axios = require("axios");

initializeApp();

const db = getDatabase();

const WEATHER_API_KEY = "f1174f62efabb76017f70f21096688b2";
const DANAO_LAT = 10.52;
const DANAO_LON = 124.03;
const USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// ── HELPER: Get weather emoji ─────────────────────────────
const getWeatherEmoji = (main) => {
  // Emojis removed - using icons instead in UI
  return "";
};

const getWeatherLabel = (main = "Clear", description = "clear") => {
  const normalized = main.toLowerCase();
  if (normalized.includes("rain") || normalized.includes("drizzle") || normalized.includes("thunderstorm")) {
    return "rainy";
  }
  if (normalized.includes("clear")) return "sunny";
  if (normalized.includes("cloud")) return "cloudy";
  return description;
};

const isExpoPushToken = (token) =>
  typeof token === "string" &&
  (token.startsWith("ExponentPushToken") || token.startsWith("ExpoPushToken"));

const normalizePushData = (data = {}) => {
  const normalized = { ...data };
  if (typeof normalized.screen === "string") {
    normalized.screen = normalized.screen.replace(/^\/+/, "");
  }
  return normalized;
};

const sendExpoPushMessages = async (tokens, title, body, data = {}, channelId = "lifeline_alerts", sound = "default") => {
  const validTokens = [...new Set(tokens.filter(isExpoPushToken))];
  if (validTokens.length === 0) {
    console.log("No valid Expo push tokens found");
    return;
  }

  for (let i = 0; i < validTokens.length; i += 100) {
    const chunk = validTokens.slice(i, i + 100);
    const messages = chunk.map((token) => ({
      to: token,
      title,
      body,
      data: normalizePushData(data),
      sound,
      priority: "high",
      channelId,
      ttl: 86400,
      expiration: Math.floor(Date.now() / 1000) + 86400,
      badge: 1,
    }));

    const response = await axios.post(EXPO_PUSH_URL, messages, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
    });

    console.log("Expo push response:", JSON.stringify(response.data));
  }
};

// ── HELPER: Get all user FCM tokens ──────────────────────
const getAllTokens = async () => {
  try {
    const snapshot = await db.ref("fcmTokens").get();
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val()).filter(isExpoPushToken);
  } catch (e) {
    console.log("Error getting tokens:", e);
    return [];
  }
};

// ── HELPER: Send notification to all users ───────────────
const sendToAll = async (title, body, data = {}, channelId = "lifeline_alerts", sound = "default") => {
  const tokens = await getAllTokens();
  if (tokens.length === 0) {
    console.log("No tokens found — no users to notify");
    return;
  }

  try {
    await sendExpoPushMessages(tokens, title, body, data, channelId, sound);
    console.log(`Queued Expo push for ${tokens.length} users`);
  } catch (e) {
    console.log("Expo push send error:", e.response?.data || e.message);
  }
};

// ── TRIGGER 1: Admin Emergency Alert ─────────────────────
exports.onEmergencyAlert = onValueWritten(
  { ref: "/emergencyAlert", region: "us-central1" },
  async (event) => {
    const after = event.data.after.val();
    if (!after || after.active !== true) return;
    console.log("🚨 Emergency alert detected — notifying all users");
    const isEarthquake = after.type === "seismic_alert" || after.type === "earthquake";
    await sendToAll(
      "🚨 EMERGENCY ALERT — LIFELINE",
      after.message || "Emergency alert issued for CTU Danao Campus! Open the app immediately.",
      { type: isEarthquake ? "earthquake" : "emergency", screen: "evacuation" },
      "emergency"
    );
  }
);

// ── TRIGGER 2: SOS Request ───────────────────────────────
exports.onAnnouncement = onValueWritten(
  { ref: "/announcement", region: "us-central1" },
  async (event) => {
    const after = event.data.after.val();
    if (!after?.message) return;

    console.log("Announcement detected - notifying all users");
    await sendToAll(
      "New Announcement - LIFELINE",
      after.message,
      { type: "announcement", screen: "home" },
      "lifeline_alerts"
    );
  }
);

exports.onSOSRequest = onValueWritten(
  { ref: "/sosRequests/{timestamp}", region: "us-central1" },
  async (event) => {
    const sos = event.data.after.val();
    if (!sos) return;
    console.log(`🆘 SOS received from ${sos.name}`);
    try {
      const contactsSnapshot = await db.ref(`contacts/${sos.uid}`).get();
      if (!contactsSnapshot.exists()) return;
      const contacts = Object.values(contactsSnapshot.val()).filter((c) => c.status === "accepted");
      const contactTokens = [];
      for (const contact of contacts) {
        const tokenSnapshot = await db.ref(`fcmTokens/${contact.uid}`).get();
        if (tokenSnapshot.exists()) contactTokens.push(tokenSnapshot.val());
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
        apns: { payload: { aps: { sound: "default", badge: 1 } } },
        tokens: contactTokens,
      };
      await sendExpoPushMessages(
        contactTokens,
        message.notification.title,
        message.notification.body,
        message.data,
        "sos"
      );
      console.log(`SOS notification queued for ${contactTokens.length} contacts`);
    } catch (e) {
      console.log("SOS notification error:", e);
    }
  }
);

// ── TRIGGER 3: Weather + Earthquake (every 15 min) ───────
exports.scheduledWeatherCheck = onSchedule(
  { schedule: "every 15 minutes", region: "us-central1" },
  async () => {
    console.log("⏰ Running scheduled weather + earthquake check");

    // WEATHER CHECK
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
        body = `Winds at ${windKmh.toFixed(0)} km/h near Danao City! Take shelter immediately and proceed to the nearest evacuation center.`;
      } else if (windKmh >= 39) {
        title = "Strong Wind Warning - LIFELINE";
        body = `Wind speed of ${windKmh.toFixed(0)} km/h detected. Stay indoors and avoid open areas.`;
      } else if (condition === "Thunderstorm") {
        title = "Thunderstorm Warning - LIFELINE";
        body = "Thunderstorm detected near Danao City. Stay indoors and away from windows.";
      } else if (condition === "Rain") {
        title = "Heavy Rain Advisory - LIFELINE";
        body = `Heavy rain near Danao City (${temp}°C). Avoid flood-prone areas and stay safe.`;
      } else if (condition === "Squall" || condition === "Tornado") {
        title = "Severe Weather Alert - LIFELINE";
        body = "Severe weather near Danao City. Take immediate shelter.";
      }

      if (title && body) {
        const lastNotifSnap = await db.ref("systemLogs/lastWeatherNotif").get();
        const lastNotif = lastNotifSnap.exists() ? lastNotifSnap.val() : 0;
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - lastNotif >= oneHour) {
          await sendToAll(title, body, { type: "weather", screen: "weather" });
          await db.ref("systemLogs/lastWeatherNotif").set(Date.now());
          console.log(`Weather alert sent: ${title}`);
        }
      } else {
        console.log(`No warning - ${condition}, ${windKmh.toFixed(0)} km/h`);
      }
    } catch (e) {
      console.log("Weather check error:", e);
    }

    // EARTHQUAKE CHECK
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
        const lastQuakeSnap = await db.ref("systemLogs/lastQuakeNotif").get();
        const lastQuake = lastQuakeSnap.exists() ? lastQuakeSnap.val() : 0;
        if (quakeTime > lastQuake) {
          await db.ref("emergencyAlert").set({
            active: true,
            message: `🌍 EARTHQUAKE DETECTED: Magnitude ${mag} near ${place}. Proceed to nearest evacuation center immediately!`,
            timestamp: Date.now(),
            type: "seismic_alert",
          });
          await db.ref("systemLogs/lastQuakeNotif").set(quakeTime);
          console.log(`Earthquake alert queued through emergencyAlert trigger: Magnitude ${mag} at ${place}`);
          return;
          await sendToAll(
            "🌍 EARTHQUAKE ALERT — LIFELINE",
            `Magnitude ${mag} earthquake near ${place}! Open LIFELINE for evacuation instructions immediately.`,
            { type: "earthquake", screen: "evacuation" },
            "emergency"
          );
          await db.ref("systemLogs/lastQuakeNotif").set(quakeTime);
          console.log(`Earthquake alert sent: Magnitude ${mag} at ${place}`);
        }
      } else {
        console.log("No significant earthquake near Danao");
      }
    } catch (e) {
      console.log("Earthquake check error:", e);
    }
  }
);

// ── TRIGGER 4: Daily Morning Weather Briefing (6AM) ──────
exports.fiveHourWeatherUpdate = onSchedule(
  {
    schedule: "0 1,6,11,16,21 * * *",
    timeZone: "Asia/Manila",
    region: "us-central1",
  },
  async () => {
    console.log("Sending 5-hour weather update...");
    try {
      const weatherRes = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${DANAO_LAT}&lon=${DANAO_LON}&appid=${WEATHER_API_KEY}&units=metric`
      );
      const data = weatherRes.data;
      const weatherMain = data?.weather?.[0]?.main || "Clear";
      const condition = data?.weather?.[0]?.description || "clear";
      const temp = Math.round(data?.main?.temp || 0);
      const feelsLike = Math.round(data?.main?.feels_like || 0);
      const humidity = data?.main?.humidity || 0;
      const windKmh = Math.round((data?.wind?.speed || 0) * 3.6);
      const label = getWeatherLabel(weatherMain, condition);

      let advice = "Stay prepared and check LIFELINE for updates.";
      if (weatherMain === "Thunderstorm") advice = "Thunderstorm possible. Stay indoors when conditions worsen.";
      else if (weatherMain === "Rain" || weatherMain === "Drizzle") advice = "Rain expected. Bring an umbrella and avoid flood-prone areas.";
      else if (weatherMain === "Clear") advice = "Sunny conditions. Stay hydrated and avoid long heat exposure.";
      else if (windKmh >= 39) advice = "Strong wind detected. Be careful outside.";

      await sendToAll(
        "Weather Update - LIFELINE",
        `Danao is ${label}: ${temp}C, feels like ${feelsLike}C. Humidity ${humidity}%, wind ${windKmh} km/h. ${advice}`,
        { type: "weather_update", screen: "weather" },
        "lifeline_alerts"
      );

      await db.ref("weatherUpdates/lastFiveHourUpdate").set({
        weatherMain,
        condition,
        temp,
        feelsLike,
        humidity,
        windKmh,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.log("5-hour weather update error:", e.response?.data || e.message);
    }
  }
);

exports.tomorrowWeatherForecast = onSchedule(
  {
    schedule: "0 20 * * *",
    timeZone: "Asia/Manila",
    region: "us-central1",
  },
  async () => {
    console.log("Sending tomorrow sunny/rainy forecast...");
    try {
      const forecastRes = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${DANAO_LAT}&lon=${DANAO_LON}&appid=${WEATHER_API_KEY}&units=metric`
      );
      const forecastItems = forecastRes.data?.list || [];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().slice(0, 10);
      const tomorrowItems = forecastItems.filter((item) => item.dt_txt?.startsWith(tomorrowDate));

      if (tomorrowItems.length === 0) {
        console.log("No forecast items for tomorrow");
        return;
      }

      const rainyItem = tomorrowItems.find((item) => {
        const main = item.weather?.[0]?.main || "";
        return main === "Rain" || main === "Drizzle" || main === "Thunderstorm" || (item.pop || 0) >= 0.4;
      });
      const summaryItem = rainyItem || tomorrowItems.find((item) => item.dt_txt?.includes("12:00:00")) || tomorrowItems[0];
      const weatherMain = summaryItem.weather?.[0]?.main || "Clear";
      const condition = summaryItem.weather?.[0]?.description || "clear";
      const temp = Math.round(summaryItem.main?.temp || 0);
      const rainChance = Math.round(Math.max(...tomorrowItems.map((item) => item.pop || 0)) * 100);
      const label = rainyItem ? "rainy" : getWeatherLabel(weatherMain, condition);
      const advice = rainyItem
        ? "Prepare an umbrella and avoid flood-prone areas."
        : "Plan for outdoor activity carefully and stay hydrated.";

      await sendToAll(
        "Tomorrow Weather - LIFELINE",
        `Tomorrow in Danao looks ${label}. Expected around ${temp}C with ${rainChance}% rain chance. ${advice}`,
        { type: "tomorrow_weather", screen: "weather" },
        "lifeline_alerts"
      );
    } catch (e) {
      console.log("Tomorrow forecast error:", e.response?.data || e.message);
    }
  }
);

exports.dailyMorningWeather = onSchedule(
  {
    schedule: "0 6 * * *",
    timeZone: "Asia/Manila",
    region: "us-central1",
  },
  async () => {
    console.log("dailyMorningWeather disabled; fiveHourWeatherUpdate handles routine weather notifications.");
    return;
    console.log("🌅 Sending daily morning weather briefing...");
    try {
      const weatherRes = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${DANAO_LAT}&lon=${DANAO_LON}&appid=${WEATHER_API_KEY}&units=metric`
      );
      const data = weatherRes.data;
      const condition = data?.weather?.[0]?.description || "clear";
      const weatherMain = data?.weather?.[0]?.main || "Clear";
      const temp = Math.round(data?.main?.temp || 0);
      const feelsLike = Math.round(data?.main?.feels_like || 0);
      const humidity = data?.main?.humidity || 0;
      const windKmh = ((data?.wind?.speed || 0) * 3.6).toFixed(0);
      const emoji = getWeatherEmoji(weatherMain);
      const windNum = parseFloat(windKmh);

      let warningLine = "";
      if (windNum >= 62) warningLine = "🌪 TYPHOON WARNING — Take shelter immediately!";
      else if (windNum >= 39) warningLine = "Strong winds today - Stay cautious!";
      else if (weatherMain === "Thunderstorm") warningLine = "Thunderstorm expected - Stay indoors!";
      else if (weatherMain === "Rain") warningLine = "Rain expected - Bring an umbrella!";
      else if (weatherMain === "Clear") warningLine = "Clear skies - Great day ahead!";
      else warningLine = "Weather looks stable - Stay prepared!";

      const title = `${emoji} Good Morning, CTU Danao! — Daily Weather`;
      const body = `${temp}°C | Feels like ${feelsLike}°C | ${condition}\n💧 Humidity: ${humidity}% | 💨 Wind: ${windKmh} km/h\n\n${warningLine}`;

      await sendToAll(title, body, { type: "daily_weather", screen: "weather" }, "lifeline_alerts");

      // Save to Firebase for in-app display
      await db.ref("dailyWeather").set({
        temp, feelsLike, condition, weatherMain,
        humidity, windKmh, emoji, warningLine,
        timestamp: Date.now(),
      });

      console.log(`Morning briefing sent: ${temp}°C, ${condition}`);
    } catch (e) {
      console.log("Morning briefing error:", e);
    }
  }
);

// ── TRIGGER 5: Evening Forecast Summary (6PM) ────────────
exports.eveningWeatherSummary = onSchedule(
  {
    schedule: "0 18 * * *",
    timeZone: "Asia/Manila",
    region: "us-central1",
  },
  async () => {
    console.log("eveningWeatherSummary disabled; tomorrowWeatherForecast handles tomorrow forecast notifications.");
    return;
    console.log("🌙 Sending evening weather summary...");
    try {
      const forecastRes = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${DANAO_LAT}&lon=${DANAO_LON}&appid=${WEATHER_API_KEY}&units=metric&cnt=8`
      );
      const data = forecastRes.data;
      const tonight = data?.list?.[0];
      const tomorrow = data?.list?.[4];
      if (!tonight || !tomorrow) return;

      const tonightTemp = Math.round(tonight?.main?.temp || 0);
      const tonightCondition = tonight?.weather?.[0]?.description || "clear";
      const tomorrowTemp = Math.round(tomorrow?.main?.temp || 0);
      const tomorrowCondition = tomorrow?.weather?.[0]?.description || "clear";
      const tomorrowRain = Math.round((tomorrow?.pop || 0) * 100);
      const tomorrowMain = tomorrow?.weather?.[0]?.main || "Clear";
      const tomorrowEmoji = getWeatherEmoji(tomorrowMain);

      let tomorrowTip = "";
      if (tomorrowRain > 70) tomorrowTip = "High rain chance - Prepare your go-bag tonight!";
      else if (tomorrowRain > 40) tomorrowTip = "🌂 Moderate rain chance — Bring an umbrella!";
      else tomorrowTip = "Tomorrow looks okay - Stay prepared as always!";

      const title = `🌙 Good Evening! — LIFELINE Weather Update`;
      const body = `Tonight: ${tonightTemp}°C — ${tonightCondition}\n${tomorrowEmoji} Tomorrow: ${tomorrowTemp}°C — ${tomorrowCondition}\n🌧 Rain chance: ${tomorrowRain}%\n\n${tomorrowTip}`;

      await sendToAll(title, body, { type: "evening_weather", screen: "weather" }, "lifeline_alerts");
      console.log(`✅ Evening summary sent: Tomorrow ${tomorrowTemp}°C, ${tomorrowRain}% rain`);
    } catch (e) {
      console.log("Evening summary error:", e);
    }
  }
);

// ── TRIGGER 6: Noon Weather Check (12PM) ─────────────────
exports.noonWeatherCheck = onSchedule(
  {
    schedule: "0 12 * * *",
    timeZone: "Asia/Manila",
    region: "us-central1",
  },
  async () => {
    console.log("noonWeatherCheck disabled; fiveHourWeatherUpdate handles routine weather notifications.");
    return;
    console.log("Running noon weather check...");
    try {
      const weatherRes = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${DANAO_LAT}&lon=${DANAO_LON}&appid=${WEATHER_API_KEY}&units=metric`
      );
      const data = weatherRes.data;
      const weatherMain = data?.weather?.[0]?.main || "Clear";
      const condition = data?.weather?.[0]?.description || "clear";
      const temp = Math.round(data?.main?.temp || 0);
      const windKmh = ((data?.wind?.speed || 0) * 3.6).toFixed(0);
      const emoji = getWeatherEmoji(weatherMain);
      const windNum = parseFloat(windKmh);

      // Only send noon update if there's a warning
      // or if weather changed significantly
      if (windNum >= 39 || weatherMain === "Thunderstorm" || weatherMain === "Rain") {
        const title = `${emoji} Noon Weather Alert — LIFELINE`;
        const body = `Current: ${temp}°C — ${condition} | 💨 Wind: ${windKmh} km/h\n\n${windNum >= 62
          ? "🌪 TYPHOON WARNING — Take shelter now!"
          : windNum >= 39
            ? "⚠️ Strong winds — Be careful outside!"
            : weatherMain === "Thunderstorm"
              ? "⛈ Thunderstorm active — Stay indoors!"
              : "🌧 Rain ongoing — Avoid flood-prone areas!"
        }`;
        await sendToAll(title, body, { type: "noon_weather", screen: "weather" }, "lifeline_alerts");
        console.log(`✅ Noon weather alert sent: ${temp}°C, ${condition}`);
      } else {
        console.log(`☀️ Noon check — no alert needed: ${temp}°C, ${condition}`);
      }
    } catch (e) {
      console.log("Noon weather check error:", e);
    }
  }
);

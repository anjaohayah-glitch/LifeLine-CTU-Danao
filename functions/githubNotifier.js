const admin = require("firebase-admin");
const axios = require("axios");

const DATABASE_URL =
  process.env.FIREBASE_DATABASE_URL ||
  "https://lifelineexpo-default-rtdb.asia-southeast1.firebasedatabase.app";
const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || "f1174f62efabb76017f70f21096688b2";
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const DANAO_LAT = 10.52;
const DANAO_LON = 124.03;
const USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT GitHub secret.");
  }
  return JSON.parse(raw);
}

function initFirebase() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
    databaseURL: DATABASE_URL,
  });
}

const db = () => admin.database();

function isExpoPushToken(token) {
  return (
    typeof token === "string" &&
    (token.startsWith("ExponentPushToken") || token.startsWith("ExpoPushToken"))
  );
}

function normalizePushData(data = {}) {
  const normalized = { ...data };
  if (typeof normalized.screen === "string") {
    normalized.screen = normalized.screen.replace(/^\/+/, "");
  }
  return normalized;
}

async function getAllTokens() {
  const [fcmSnap, usersSnap] = await Promise.all([
    db().ref("fcmTokens").get(),
    db().ref("users").get(),
  ]);

  const fcmTokens = fcmSnap.exists() ? Object.values(fcmSnap.val()) : [];
  const userTokens = usersSnap.exists()
    ? Object.values(usersSnap.val()).map((user) => user?.expoPushToken)
    : [];

  return [...new Set([...fcmTokens, ...userTokens].filter(isExpoPushToken))];
}

async function sendExpoPush(tokens, title, body, data = {}, channelId = "lifeline_alerts") {
  const validTokens = [...new Set(tokens.filter(isExpoPushToken))];
  if (validTokens.length === 0) {
    console.log("No valid Expo push tokens found.");
    return;
  }

  for (let i = 0; i < validTokens.length; i += 100) {
    const chunk = validTokens.slice(i, i + 100);
    const messages = chunk.map((token) => ({
      to: token,
      title,
      body,
      data: normalizePushData(data),
      sound: "default",
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
}

async function sendToAll(title, body, data = {}, channelId = "lifeline_alerts") {
  const tokens = await getAllTokens();
  await sendExpoPush(tokens, title, body, data, channelId);
  console.log(`Queued notification for ${tokens.length} devices.`);
}

function getWeatherLabel(main = "Clear", description = "clear") {
  const normalized = main.toLowerCase();
  if (
    normalized.includes("rain") ||
    normalized.includes("drizzle") ||
    normalized.includes("thunderstorm")
  ) {
    return "rainy";
  }
  if (normalized.includes("clear")) return "sunny";
  if (normalized.includes("cloud")) return "cloudy";
  return description;
}

async function sendFiveHourWeatherUpdate() {
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

  await db().ref("weatherUpdates/lastFiveHourUpdate").set({
    weatherMain,
    condition,
    temp,
    feelsLike,
    humidity,
    windKmh,
    timestamp: Date.now(),
    source: "github-actions",
  });
}

async function sendTomorrowForecast() {
  const forecastRes = await axios.get(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${DANAO_LAT}&lon=${DANAO_LON}&appid=${WEATHER_API_KEY}&units=metric`
  );
  const forecastItems = forecastRes.data?.list || [];
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowDate = tomorrow.toISOString().slice(0, 10);
  const tomorrowItems = forecastItems.filter((item) => item.dt_txt?.startsWith(tomorrowDate));

  if (tomorrowItems.length === 0) {
    console.log("No forecast items for tomorrow.");
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
}

async function checkEarthquake() {
  const quakeRes = await axios.get(USGS_URL);
  const quakeData = quakeRes.data;
  const nearbyQuake = (quakeData.features || []).find((quake) => {
    const [lon, lat] = quake.geometry?.coordinates || [];
    const mag = quake.properties?.mag;
    const isNear = Math.abs(lat - DANAO_LAT) < 2 && Math.abs(lon - DANAO_LON) < 2;
    return mag >= 4.0 && isNear;
  });

  if (!nearbyQuake) {
    console.log("No significant earthquake near Danao.");
    return;
  }

  const mag = nearbyQuake.properties.mag;
  const place = nearbyQuake.properties.place;
  const quakeTime = nearbyQuake.properties.time;
  const lastQuakeSnap = await db().ref("systemLogs/lastQuakeNotif").get();
  const lastQuake = lastQuakeSnap.exists() ? lastQuakeSnap.val() : 0;

  if (quakeTime <= lastQuake) {
    console.log("Earthquake already notified.");
    return;
  }

  const message = `EARTHQUAKE DETECTED: Magnitude ${mag} near ${place}. Proceed to nearest evacuation center immediately!`;
  await db().ref("emergencyAlert").set({
    active: true,
    message,
    timestamp: Date.now(),
    type: "seismic_alert",
    source: "github-actions",
  });

  await sendToAll(
    "EARTHQUAKE ALERT - LIFELINE",
    `Magnitude ${mag} earthquake near ${place}! Open LIFELINE for evacuation instructions immediately.`,
    { type: "earthquake", screen: "evacuation" },
    "emergency"
  );

  await db().ref("systemLogs/lastQuakeNotif").set(quakeTime);
}

async function main() {
  initFirebase();
  const mode = process.argv[2] || process.env.NOTIFIER_MODE;

  if (mode === "weather") {
    await sendFiveHourWeatherUpdate();
  } else if (mode === "tomorrow") {
    await sendTomorrowForecast();
  } else if (mode === "earthquake") {
    await checkEarthquake();
  } else {
    throw new Error("Usage: node githubNotifier.js <weather|tomorrow|earthquake>");
  }
}

main()
  .then(() => {
    console.log("Notifier finished.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Notifier failed:", error.response?.data || error);
    process.exit(1);
  });

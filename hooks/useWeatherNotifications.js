// hooks/useWeatherNotifications.js
import * as BackgroundFetch from "expo-background-fetch";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ref, set } from "firebase/database";
import { db } from "../firebase";

const WEATHER_TASK = "LIFELINE_WEATHER_CHECK";
const API_KEY = "f1174f62efabb76017f70f21096688b2";
const USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

// ── EARTHQUAKE CHECK ─────────────────────────────────────
const checkEarthquakes = async () => {
  try {
    const response = await fetch(USGS_URL);
    const data = await response.json();

    // Find earthquake near Danao City (10.52°N, 124.03°E)
    // within ~200km radius and magnitude 4.0+
    const nearbyQuake = data.features.find((quake) => {
      const [lon, lat] = quake.geometry.coordinates;
      const mag = quake.properties.mag;
      const isNear = Math.abs(lat - 10.52) < 2 && Math.abs(lon - 124.03) < 2;
      return mag >= 4.0 && isNear;
    });

    if (nearbyQuake) {
      const mag = nearbyQuake.properties.mag;
      const place = nearbyQuake.properties.place;

      // ✅ Auto-activate emergency alert in Firebase
      await set(ref(db, "emergencyAlert"), {
        active: true,
        message: `🌍 EARTHQUAKE DETECTED: Magnitude ${mag} near ${place}. Proceed to nearest evacuation center immediately!`,
        timestamp: Date.now(),
        type: "seismic_alert",
      });

      // ✅ Send push notification with buzzer
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🌍 LIFELINE — Earthquake Alert!",
          body: `Magnitude ${mag} earthquake detected near ${place}. Check the app for evacuation instructions!`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 500, 200, 500, 200, 500],
          color: "#4527A0",
          data: { screen: "evacuation" },
        },
        trigger: null,
      });

      // Save last earthquake alert time
      await AsyncStorage.setItem("lastQuakeNotif", String(Date.now()));
      return true; // earthquake found
    }
    return false; // no earthquake
  } catch (error) {
    console.error("USGS Fetch Failed:", error);
    return false;
  }
};

// ── BACKGROUND TASK ──────────────────────────────────────
TaskManager.defineTask(WEATHER_TASK, async () => {
  try {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // ── 1. CHECK EARTHQUAKES ─────────────────────────────
    const lastQuakeNotif = await AsyncStorage.getItem("lastQuakeNotif");
    if (!lastQuakeNotif || now - parseInt(lastQuakeNotif) >= oneHour) {
      await checkEarthquakes();
    }

    // ── 2. CHECK WEATHER ─────────────────────────────────
    const savedCoords = await AsyncStorage.getItem("lastKnownCoords");
    let latitude, longitude;

    if (savedCoords) {
      const parsed = JSON.parse(savedCoords);
      latitude = parsed.latitude;
      longitude = parsed.longitude;
    } else {
      const location = await Location.getCurrentPositionAsync({});
      latitude = location.coords.latitude;
      longitude = location.coords.longitude;
      await AsyncStorage.setItem("lastKnownCoords", JSON.stringify({ latitude, longitude }));
    }

    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
    );
    const data = await res.json();

    if (data.cod !== 200) return BackgroundFetch.BackgroundFetchResult.Failed;

    const condition = data?.weather?.[0]?.main;
    const windSpeed = data?.wind?.speed || 0;
    const windKmh = windSpeed * 3.6;

    // Only notify once per hour
    const lastWeatherNotif = await AsyncStorage.getItem("lastWeatherNotif");
    if (lastWeatherNotif && now - parseInt(lastWeatherNotif) < oneHour) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    let title = null;
    let body = null;

    if (windKmh >= 62) {
      title = "🌪 TYPHOON WARNING";
      body = `Winds at ${windKmh.toFixed(0)} km/h detected! Take shelter immediately and proceed to the nearest evacuation center.`;
    } else if (windKmh >= 39) {
      title = "⚠️ Strong Wind Warning";
      body = `Wind speed is ${windKmh.toFixed(0)} km/h. Stay indoors and avoid open areas.`;
    } else if (condition === "Thunderstorm") {
      title = "⛈ Thunderstorm Warning";
      body = "A thunderstorm has been detected in your area. Stay indoors and away from windows.";
    } else if (condition === "Rain") {
      title = "🌧 Heavy Rain Advisory";
      body = "Heavy rain detected. Avoid flood-prone areas and stay safe.";
    } else if (condition === "Squall" || condition === "Tornado") {
      title = "🌪 Severe Weather Alert";
      body = "Severe weather detected in your area. Take immediate precautions.";
    }

    if (title && body) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `LIFELINE — ${title}`,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 500, 200, 500, 200, 500],
          color: "#B00020",
          data: { screen: "weather" },
        },
        trigger: null,
      });
      await AsyncStorage.setItem("lastWeatherNotif", String(now));
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;

  } catch (error) {
    console.log("Background task error:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ── REGISTER BACKGROUND TASK ─────────────────────────────
export async function registerWeatherBackgroundFetch() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;

    await Location.requestBackgroundPermissionsAsync();

    const isRegistered = await TaskManager.isTaskRegisteredAsync(WEATHER_TASK);
    if (isRegistered) return;

    await BackgroundFetch.registerTaskAsync(WEATHER_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log("✅ Background fetch registered — weather + earthquake monitoring active");
  } catch (error) {
    console.log("Background fetch registration error:", error);
  }
}

// ── UNREGISTER BACKGROUND TASK ───────────────────────────
export async function unregisterWeatherBackgroundFetch() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(WEATHER_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(WEATHER_TASK);
    }
  } catch (error) {
    console.log(error);
  }
}

// ── MANUAL EARTHQUAKE CHECK (for use in screens) ─────────
export { checkEarthquakes };
// hooks/useWeatherNotifications.js
import * as BackgroundFetch from "expo-background-fetch";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WEATHER_TASK = "LIFELINE_WEATHER_CHECK";
const API_KEY = "f1174f62efabb76017f70f21096688b2";

// ── Define the background task ──────────────────────────
TaskManager.defineTask(WEATHER_TASK, async () => {
  try {
    // Get last known location from storage
    const savedCoords = await AsyncStorage.getItem("lastKnownCoords");
    let latitude, longitude;

    if (savedCoords) {
      const parsed = JSON.parse(savedCoords);
      latitude = parsed.latitude;
      longitude = parsed.longitude;
    } else {
      // Try to get fresh location
      const location = await Location.getCurrentPositionAsync({});
      latitude = location.coords.latitude;
      longitude = location.coords.longitude;
      await AsyncStorage.setItem("lastKnownCoords", JSON.stringify({ latitude, longitude }));
    }

    // Fetch weather
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
    );
    const data = await res.json();

    if (data.cod !== 200) return BackgroundFetch.BackgroundFetchResult.Failed;

    const condition = data?.weather?.[0]?.main;
    const windSpeed = data?.wind?.speed || 0;
    const windKmh = windSpeed * 3.6;

    // Check last notification time to avoid spamming
    const lastNotif = await AsyncStorage.getItem("lastWeatherNotif");
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Only notify once per hour max
    if (lastNotif && now - parseInt(lastNotif) < oneHour) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    let title = null;
    let body = null;

    if (windKmh >= 62) {
      title = "🌪 TYPHOON WARNING";
      body = `Winds at ${windKmh.toFixed(0)} km/h detected near your area! Take shelter immediately and proceed to the nearest evacuation center.`;
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

    // Send notification if warning detected
    if (title && body) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `LIFELINE — ${title}`,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 500, 200, 500, 200, 500], // buzzer pattern
          color: "#B00020",
          data: { screen: "weather" },
        },
        trigger: null,
      });

      // Save time of last notification
      await AsyncStorage.setItem("lastWeatherNotif", String(now));
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;

  } catch (error) {
    console.log("Background weather check error:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ── Register the background task ────────────────────────
export async function registerWeatherBackgroundFetch() {
  try {
    // Request notification permission
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;

    // Request background location permission
    await Location.requestBackgroundPermissionsAsync();

    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(WEATHER_TASK);
    if (isRegistered) return;

    // Register background fetch — runs every 15 minutes
    await BackgroundFetch.registerTaskAsync(WEATHER_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,   // keep running after app is closed
      startOnBoot: true,        // start when phone boots up
    });

    console.log("✅ Weather background fetch registered");
  } catch (error) {
    console.log("Background fetch registration error:", error);
  }
}

// ── Unregister the background task ──────────────────────
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
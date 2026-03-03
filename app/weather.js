// app/weather.js
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const API_KEY = "f1174f62efabb76017f70f21096688b2";

const WEATHER_ICONS = {
  Thunderstorm: "⛈",
  Drizzle: "🌦",
  Rain: "🌧",
  Snow: "❄️",
  Clear: "☀️",
  Clouds: "☁️",
  Mist: "🌫",
  Fog: "🌫",
  Haze: "🌫",
  Tornado: "🌪",
  Squall: "💨",
};

const HOURS = ["12AM","1AM","2AM","3AM","4AM","5AM","6AM","7AM","8AM","9AM","10AM","11AM",
  "12PM","1PM","2PM","3PM","4PM","5PM","6PM","7PM","8PM","9PM","10PM","11PM"];

export default function Weather() {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is required.");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;

      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
      );
      const weatherData = await weatherRes.json();

      // ✅ Check API returned valid data
      if (weatherData.cod !== 200) {
        setError(`API Error: ${weatherData.message}`);
        setLoading(false);
        return;
      }

      const forecastRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&cnt=8`
      );
      const forecastData = await forecastRes.json();

      setWeather(weatherData);
      setForecast(forecastData?.list || []);
    } catch (err) {
      console.log(err);
      setError("Could not fetch weather. Check your internet connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchWeather();
  };

  const getWarning = () => {
    if (!weather?.wind || !weather?.weather?.[0]) return null;
    const condition = weather.weather[0].main;
    const windSpeed = weather.wind.speed || 0;

    if (windSpeed >= 17.2) return { text: "🌪 Typhoon Warning — Winds above 62km/h!", color: "#B00020" };
    if (windSpeed >= 10.8) return { text: "⚠️ Strong Wind Warning — Stay cautious!", color: "#E65100" };
    if (condition === "Thunderstorm") return { text: "⛈ Thunderstorm Warning — Stay indoors!", color: "#B00020" };
    if (condition === "Rain") return { text: "🌧 Heavy Rain Advisory — Avoid flood-prone areas!", color: "#1565C0" };
    return null;
  };

  // LOADING
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B00020" />
        <Text style={styles.loadingText}>Fetching weather...</Text>
      </View>
    );
  }

  // ERROR
  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchWeather}>
          <Text style={styles.retryText}>🔄 Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // NO DATA
  if (!weather) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No weather data available.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchWeather}>
          <Text style={styles.retryText}>🔄 Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const warning = getWarning();
  const icon = WEATHER_ICONS[weather?.weather?.[0]?.main] || "🌡";

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#B00020"]} />
      }
    >
      <Text style={styles.header}>🌤 Weather</Text>
      <Text style={styles.location}>
        📍 {weather?.name || "Unknown"}, {weather?.sys?.country || ""}
      </Text>

      {/* 🌪 WARNING BANNER */}
      {warning && (
        <View style={[styles.warningBanner, { backgroundColor: warning.color }]}>
          <Text style={styles.warningText}>{warning.text}</Text>
        </View>
      )}

      {/* CURRENT WEATHER */}
      <View style={styles.currentCard}>
        <Text style={styles.weatherIcon}>{icon}</Text>
        <Text style={styles.temperature}>{Math.round(weather?.main?.temp ?? 0)}°C</Text>
        <Text style={styles.condition}>{weather?.weather?.[0]?.description || ""}</Text>
        <Text style={styles.feelsLike}>Feels like {Math.round(weather?.main?.feels_like ?? 0)}°C</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>💧</Text>
            <Text style={styles.statValue}>{weather?.main?.humidity ?? 0}%</Text>
            <Text style={styles.statLabel}>Humidity</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>💨</Text>
            <Text style={styles.statValue}>{((weather?.wind?.speed ?? 0) * 3.6).toFixed(1)} km/h</Text>
            <Text style={styles.statLabel}>Wind</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>👁</Text>
            <Text style={styles.statValue}>{((weather?.visibility ?? 0) / 1000).toFixed(1)} km</Text>
            <Text style={styles.statLabel}>Visibility</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🌡</Text>
            <Text style={styles.statValue}>{weather?.main?.pressure ?? 0} hPa</Text>
            <Text style={styles.statLabel}>Pressure</Text>
          </View>
        </View>
      </View>

      {/* ⏱ HOURLY FORECAST */}
      {forecast.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱ Next 24 Hours</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {forecast.map((item, index) => {
              const time = new Date((item?.dt ?? 0) * 1000);
              const hour = HOURS[time.getHours()];
              const itemIcon = WEATHER_ICONS[item?.weather?.[0]?.main] || "🌡";
              return (
                <View key={index} style={styles.hourCard}>
                  <Text style={styles.hourTime}>{hour}</Text>
                  <Text style={styles.hourIcon}>{itemIcon}</Text>
                  <Text style={styles.hourTemp}>{Math.round(item?.main?.temp ?? 0)}°C</Text>
                  <Text style={styles.hourRain}>💧{Math.round((item?.pop ?? 0) * 100)}%</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 🌅 SUNRISE & SUNSET */}
      {weather?.sys && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌅 Sun Schedule</Text>
          <View style={styles.sunRow}>
            <View style={styles.sunCard}>
              <Text style={styles.sunIcon}>🌅</Text>
              <Text style={styles.sunLabel}>Sunrise</Text>
              <Text style={styles.sunTime}>
                {new Date((weather.sys.sunrise ?? 0) * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
            <View style={styles.sunCard}>
              <Text style={styles.sunIcon}>🌇</Text>
              <Text style={styles.sunLabel}>Sunset</Text>
              <Text style={styles.sunTime}>
                {new Date((weather.sys.sunset ?? 0) * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 🔄 REFRESH */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchWeather}>
        <Text style={styles.refreshText}>🔄 Refresh Weather</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", padding: 30 },
  loadingText: { marginTop: 15, color: "#B00020", fontSize: 16 },
  errorIcon: { fontSize: 50, marginBottom: 10 },
  errorText: { color: "#555", fontSize: 15, textAlign: "center", marginBottom: 20 },
  retryButton: { backgroundColor: "#B00020", padding: 15, borderRadius: 10, alignItems: "center", width: "60%" },
  retryText: { color: "#fff", fontWeight: "bold" },
  header: { fontSize: 26, fontWeight: "bold", color: "#B00020", textAlign: "center", marginTop: 50, marginBottom: 5 },
  location: { textAlign: "center", color: "#555", marginBottom: 15 },
  warningBanner: { padding: 15, borderRadius: 12, marginBottom: 15 },
  warningText: { color: "#fff", fontWeight: "bold", textAlign: "center", fontSize: 14 },
  currentCard: {
    backgroundColor: "#fff0f0", borderRadius: 20, padding: 25,
    alignItems: "center", marginBottom: 20,
    borderWidth: 1, borderColor: "#ffcccc",
  },
  weatherIcon: { fontSize: 70 },
  temperature: { fontSize: 60, fontWeight: "bold", color: "#B00020" },
  condition: { fontSize: 18, color: "#444", textTransform: "capitalize", marginTop: 5 },
  feelsLike: { color: "#888", marginTop: 5 },
  statsRow: { flexDirection: "row", marginTop: 20, gap: 10 },
  statItem: { alignItems: "center", flex: 1 },
  statIcon: { fontSize: 20 },
  statValue: { fontWeight: "bold", fontSize: 12, color: "#222", marginTop: 4 },
  statLabel: { fontSize: 10, color: "#888", marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#B00020", marginBottom: 12 },
  hourCard: {
    backgroundColor: "#fff0f0", borderRadius: 12, padding: 12,
    alignItems: "center", marginRight: 10, minWidth: 70,
    borderWidth: 1, borderColor: "#ffcccc",
  },
  hourTime: { fontSize: 11, color: "#888" },
  hourIcon: { fontSize: 24, marginVertical: 6 },
  hourTemp: { fontWeight: "bold", color: "#B00020" },
  hourRain: { fontSize: 11, color: "#1565C0", marginTop: 3 },
  sunRow: { flexDirection: "row", gap: 10 },
  sunCard: {
    flex: 1, backgroundColor: "#fff0f0", borderRadius: 12,
    padding: 15, alignItems: "center",
    borderWidth: 1, borderColor: "#ffcccc",
  },
  sunIcon: { fontSize: 30 },
  sunLabel: { color: "#888", fontSize: 12, marginTop: 5 },
  sunTime: { fontWeight: "bold", color: "#B00020", fontSize: 16, marginTop: 3 },
  refreshButton: {
    backgroundColor: "#B00020", padding: 15,
    borderRadius: 12, alignItems: "center", marginBottom: 10,
  },
  refreshText: { color: "#fff", fontWeight: "bold" },
});
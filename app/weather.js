// app/weather.js
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import { useSettings } from "../context/SettingsContext";

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

// ✅ Notification handler — shows alert + plays buzzer sound
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function Weather() {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [activeTab, setActiveTab] = useState("weather");
  const { theme } = useSettings();
  const { bg, card, border, textDark, textMid, textLight } = theme;
  const notificationSentRef = useRef(false);

  useEffect(() => {
    registerForNotifications();
    fetchWeather();
  }, []);

  // ✅ Register for push notifications
  const registerForNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.log("Notification permission not granted");
      }
    } catch (e) {
      console.log(e);
    }
  };

  // ✅ Send weather warning notification with buzzer
  const sendWeatherNotification = async (warning) => {
    if (notificationSentRef.current) return;
    notificationSentRef.current = true;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚠️ LIFELINE Weather Alert",
        body: warning.text,
        sound: true, // triggers buzzer/sound
        priority: Notifications.AndroidNotificationPriority.MAX,
        color: warning.color,
      },
      trigger: null, // send immediately
    });
  };

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);
      notificationSentRef.current = false;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is required.");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setUserCoords({ latitude, longitude });

      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
      );
      const weatherData = await weatherRes.json();

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

      // ✅ Auto-send notification if warning detected
      const warning = getWarningFromData(weatherData);
      if (warning) {
        await sendWeatherNotification(warning);
      }

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

  const getWarningFromData = (data) => {
    if (!data?.wind || !data?.weather?.[0]) return null;
    const condition = data.weather[0].main;
    const windSpeed = data.wind.speed || 0;

    if (windSpeed >= 17.2) return { text: "🌪 Typhoon Warning — Winds above 62km/h! Take shelter immediately!", color: "#B00020" };
    if (windSpeed >= 10.8) return { text: "⚠️ Strong Wind Warning — Stay cautious and avoid open areas!", color: "#E65100" };
    if (condition === "Thunderstorm") return { text: "⛈ Thunderstorm Warning — Stay indoors and away from windows!", color: "#B00020" };
    if (condition === "Rain") return { text: "🌧 Heavy Rain Advisory — Avoid flood-prone areas!", color: "#1565C0" };
    return null;
  };

  const getWarning = () => {
    if (!weather) return null;
    return getWarningFromData(weather);
  };

  // LOADING
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color="#B00020" />
        <Text style={[styles.loadingText, { color: "#B00020" }]}>Fetching weather...</Text>
      </View>
    );
  }

  // ERROR
  if (error) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bg }]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={[styles.errorText, { color: textMid }]}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchWeather}>
          <Text style={styles.retryText}>🔄 Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!weather) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bg }]}>
        <Text style={[styles.errorText, { color: textMid }]}>No weather data available.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchWeather}>
          <Text style={styles.retryText}>🔄 Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const warning = getWarning();
  const icon = WEATHER_ICONS[weather?.weather?.[0]?.main] || "🌡";

  // Windy URL with user coordinates
  const windyUrl = userCoords
    ? `https://embed.windy.com/embed2.html?lat=${userCoords.latitude}&lon=${userCoords.longitude}&detailLat=${userCoords.latitude}&detailLon=${userCoords.longitude}&width=650&height=450&pane=wind&overlay=wind&product=ecmwf&level=surface&pressure=true&type=map&location=coordinates&detail=true&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`
    : `https://embed.windy.com/embed2.html?lat=10.5034&lon=124.0292&width=650&height=450&pane=wind&overlay=wind&product=ecmwf&level=surface&pressure=true`;

  return (
    <View style={[styles.wrapper, { backgroundColor: bg }]}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌤 Weather</Text>
        <Text style={styles.headerSub}>📍 {weather?.name || "Unknown"}, {weather?.sys?.country || ""}</Text>
      </View>

      {/* WARNING BANNER */}
      {warning && (
        <View style={[styles.warningBanner, { backgroundColor: warning.color }]}>
          <Text style={styles.warningText}>🔔 {warning.text}</Text>
          <Text style={styles.warningSubText}>Notification sent to your device</Text>
        </View>
      )}

      {/* TABS */}
      <View style={[styles.tabs, { borderColor: border }]}>
        {[
          { key: "weather", label: "🌡 Weather" },
          { key: "windy", label: "🗺 Windy Map" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, { color: textLight }, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* WEATHER TAB */}
      {activeTab === "weather" && (
        <ScrollView
          style={[styles.container, { backgroundColor: bg }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#B00020"]} />
          }
        >
          {/* CURRENT WEATHER */}
          <View style={[styles.currentCard, { backgroundColor: card, borderColor: border }]}>
            <Text style={styles.weatherIcon}>{icon}</Text>
            <Text style={styles.temperature}>{Math.round(weather?.main?.temp ?? 0)}°C</Text>
            <Text style={[styles.condition, { color: textMid }]}>{weather?.weather?.[0]?.description || ""}</Text>
            <Text style={[styles.feelsLike, { color: textLight }]}>Feels like {Math.round(weather?.main?.feels_like ?? 0)}°C</Text>

            <View style={styles.statsRow}>
              {[
                { icon: "💧", value: `${weather?.main?.humidity ?? 0}%`, label: "Humidity" },
                { icon: "💨", value: `${((weather?.wind?.speed ?? 0) * 3.6).toFixed(1)} km/h`, label: "Wind" },
                { icon: "👁", value: `${((weather?.visibility ?? 0) / 1000).toFixed(1)} km`, label: "Visibility" },
                { icon: "🌡", value: `${weather?.main?.pressure ?? 0} hPa`, label: "Pressure" },
              ].map((stat, i) => (
                <View key={i} style={styles.statItem}>
                  <Text style={styles.statIcon}>{stat.icon}</Text>
                  <Text style={[styles.statValue, { color: textDark }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: textLight }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* HOURLY FORECAST */}
          {forecast.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: "#B00020" }]}>⏱ Next 24 Hours</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {forecast.map((item, index) => {
                  const time = new Date((item?.dt ?? 0) * 1000);
                  const hour = HOURS[time.getHours()];
                  const itemIcon = WEATHER_ICONS[item?.weather?.[0]?.main] || "🌡";
                  return (
                    <View key={index} style={[styles.hourCard, { backgroundColor: card, borderColor: border }]}>
                      <Text style={[styles.hourTime, { color: textLight }]}>{hour}</Text>
                      <Text style={styles.hourIcon}>{itemIcon}</Text>
                      <Text style={[styles.hourTemp, { color: "#B00020" }]}>{Math.round(item?.main?.temp ?? 0)}°C</Text>
                      <Text style={styles.hourRain}>💧{Math.round((item?.pop ?? 0) * 100)}%</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* SUNRISE & SUNSET */}
          {weather?.sys && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: "#B00020" }]}>🌅 Sun Schedule</Text>
              <View style={styles.sunRow}>
                {[
                  { icon: "🌅", label: "Sunrise", time: weather.sys.sunrise },
                  { icon: "🌇", label: "Sunset", time: weather.sys.sunset },
                ].map((sun, i) => (
                  <View key={i} style={[styles.sunCard, { backgroundColor: card, borderColor: border }]}>
                    <Text style={styles.sunIcon}>{sun.icon}</Text>
                    <Text style={[styles.sunLabel, { color: textLight }]}>{sun.label}</Text>
                    <Text style={[styles.sunTime, { color: "#B00020" }]}>
                      {new Date((sun.time ?? 0) * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* PAGASA & PHIVOLCS LINKS */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: "#B00020" }]}>📡 Official Updates</Text>
            {[
              { icon: "🌧", label: "PAGASA Weather Bulletin", url: "https://www.pagasa.dost.gov.ph/weather#daily-weather-forecast", color: "#1565C0" },
              { icon: "🌋", label: "PHIVOLCS Earthquake Bulletin", url: "https://earthquake.phivolcs.dost.gov.ph/", color: "#4527A0" },
              { icon: "🌪", label: "PAGASA Typhoon Updates", url: "https://www.pagasa.dost.gov.ph/tropical-cyclone/active-tropical-cyclone", color: "#B00020" },
            ].map((link, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.linkCard, { backgroundColor: card, borderColor: border }]}
                onPress={() => Linking.openURL(link.url)}
              >
                <Text style={styles.linkIcon}>{link.icon}</Text>
                <Text style={[styles.linkLabel, { color: textDark }]}>{link.label}</Text>
                <Text style={[styles.linkArrow, { color: link.color }]}>→</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* REFRESH */}
          <TouchableOpacity style={styles.refreshButton} onPress={fetchWeather}>
            <Text style={styles.refreshText}>🔄 Refresh Weather</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* WINDY MAP TAB */}
      {activeTab === "windy" && (
        <View style={{ flex: 1 }}>
          <View style={[styles.windyInfo, { backgroundColor: card, borderColor: border }]}>
            <Text style={[styles.windyInfoText, { color: textDark }]}>
              🗺 Live wind, rain, and typhoon map powered by Windy
            </Text>
          </View>
          <WebView
            source={{ uri: windyUrl }}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={[styles.loadingContainer, { backgroundColor: bg, position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }]}>
                <ActivityIndicator size="large" color="#B00020" />
                <Text style={{ color: "#B00020", marginTop: 10 }}>Loading Windy Map...</Text>
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, padding: 20 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30 },
  loadingText: { marginTop: 15, fontSize: 16 },
  errorIcon: { fontSize: 50, marginBottom: 10 },
  errorText: { fontSize: 15, textAlign: "center", marginBottom: 20 },
  retryButton: { backgroundColor: "#B00020", padding: 15, borderRadius: 10, alignItems: "center", width: "60%" },
  retryText: { color: "#fff", fontWeight: "bold" },
  header: { backgroundColor: "#B00020", paddingTop: 55, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, marginBottom: 5 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 },
  warningBanner: { padding: 15, marginHorizontal: 0 },
  warningText: { color: "#fff", fontWeight: "bold", textAlign: "center", fontSize: 14 },
  warningSubText: { color: "rgba(255,255,255,0.8)", textAlign: "center", fontSize: 11, marginTop: 4 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, marginHorizontal: 20, marginTop: 10, marginBottom: 5 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  activeTab: { borderBottomWidth: 3, borderBottomColor: "#B00020" },
  tabText: { fontSize: 13, fontWeight: "bold" },
  activeTabText: { color: "#B00020", fontWeight: "bold" },
  currentCard: { borderRadius: 20, padding: 25, alignItems: "center", marginBottom: 20, borderWidth: 1 },
  weatherIcon: { fontSize: 70 },
  temperature: { fontSize: 60, fontWeight: "bold", color: "#B00020" },
  condition: { fontSize: 18, textTransform: "capitalize", marginTop: 5 },
  feelsLike: { marginTop: 5 },
  statsRow: { flexDirection: "row", marginTop: 20, gap: 10 },
  statItem: { alignItems: "center", flex: 1 },
  statIcon: { fontSize: 20 },
  statValue: { fontWeight: "bold", fontSize: 12, marginTop: 4 },
  statLabel: { fontSize: 10, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  hourCard: { borderRadius: 12, padding: 12, alignItems: "center", marginRight: 10, minWidth: 70, borderWidth: 1 },
  hourTime: { fontSize: 11 },
  hourIcon: { fontSize: 24, marginVertical: 6 },
  hourTemp: { fontWeight: "bold" },
  hourRain: { fontSize: 11, color: "#1565C0", marginTop: 3 },
  sunRow: { flexDirection: "row", gap: 10 },
  sunCard: { flex: 1, borderRadius: 12, padding: 15, alignItems: "center", borderWidth: 1 },
  sunIcon: { fontSize: 30 },
  sunLabel: { fontSize: 12, marginTop: 5 },
  sunTime: { fontWeight: "bold", fontSize: 16, marginTop: 3 },
  linkCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  linkIcon: { fontSize: 24, marginRight: 12 },
  linkLabel: { flex: 1, fontWeight: "bold", fontSize: 14 },
  linkArrow: { fontSize: 18, fontWeight: "bold" },
  refreshButton: { backgroundColor: "#B00020", padding: 15, borderRadius: 12, alignItems: "center", marginBottom: 10 },
  refreshText: { color: "#fff", fontWeight: "bold" },
  windyInfo: { padding: 12, marginHorizontal: 20, marginVertical: 10, borderRadius: 10, borderWidth: 1 },
  windyInfoText: { textAlign: "center", fontSize: 13 },
});
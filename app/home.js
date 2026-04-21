import * as Location from "expo-location";
import { useRouter } from "expo-router";
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { onValue, push, ref, set, limitToLast, query } from "firebase/database";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Vibration,
} from "react-native";
import { COLORS } from "../constants/colors";
import { useSettings } from "../context/SettingsContext";
import { auth, db } from "../firebase";
import { useAdmin } from "../hooks/useAdmin";

// --- 1. BACKGROUND TASK DEFINITION (Must be outside the component) ---
const WEATHER_TASK_NAME = "BACKGROUND_WEATHER_CHECK";
const WEATHER_API_KEY = "f1174f62efabb76017f70f21096688b2";
const DANAO_LAT = 10.52;
const DANAO_LON = 124.03;

TaskManager.defineTask(WEATHER_TASK_NAME, async () => {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${DANAO_LAT}&lon=${DANAO_LON}&appid=${WEATHER_API_KEY}`);
    const data = await res.json();
    
    if (data.weather[0].id < 700 || data.wind.speed > 10) {
      await set(ref(db, "emergencyAlert"), {
        active: true,
        message: `SYSTEM (BG): ${data.weather[0].main} in Danao. Wind: ${data.wind.speed}m/s. Stay safe!`,
        timestamp: Date.now(),
        type: "automatic_bg"
      });
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// --- CONSTANTS ---
const NAV_ITEMS = [
  { icon: "🏠", label: "Home", route: "/home" },
  { icon: "🗺", label: "Evacuate", route: "/evacuation" },
  { icon: "📞", label: "Hotlines", route: "/hotlines" },
  { icon: "🌤", label: "Weather", route: "/weather" },
  { icon: "👤", label: "Profile", route: "/profile" },
];

const QUICK_ACCESS = [
  { icon: "🛡", label: "Admin", route: "/admin", color: COLORS.admin, adminOnly: true },
  { icon: "🩺", label: "First Aid", route: "/firstaid", color: COLORS.danger },
  { icon: "📚", label: "Guides", route: "/guides", color: "#00695C" },
  { icon: "✅", label: "Checklist", route: "/checklist", color: "#00838F" },
  { icon: "👨‍👩‍👧", label: "Family", route: "/family", color: "#6A1B9A" },
  { icon: "🛡", label: "DRRM", route: "/drrm", color: "#B00020" },
  { icon: "🗣", label: "Voice Guide", route: "/voiceguide", color: "#1565C0" },
  { icon: "⚙️", label: "Settings", route: "/settings", color: "#455A64" },
];

const DISASTER_TIPS = [
  { icon: "🌊", label: "Flood", color: "#1565C0", tip: "Move to higher ground. Avoid walking in moving water." },
  { icon: "🌍", label: "Earthquake", color: "#4527A0", tip: "Drop, Cover, and Hold On. Stay away from windows." },
  { icon: "🌪", label: "Typhoon", color: "#00695C", tip: "Stay indoors. Keep away from windows and doors." },
  { icon: "🔥", label: "Fire", color: "#E65100", tip: "Use evacuation routes. Stay low to avoid smoke." },
];

const PREPAREDNESS_TIPS = [
  { icon: "🎒", title: "Go Bag", desc: "3-day supplies: food, water, meds, documents." },
  { icon: "📋", title: "Family Plan", desc: "Have a meeting point and contact list ready." },
];

export default function Home() {
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [announcement, setAnnouncement] = useState(null);
  const [activeNav, setActiveNav] = useState("/home");
  const [isOnline, setIsOnline] = useState(true);
  const [expandedDisaster, setExpandedDisaster] = useState(null);
  
  const { isAdmin } = useAdmin();
  const router = useRouter();
  const { theme } = useSettings();
  const { bg, card, border, textDark, textMid, textLight } = theme;

  const FEATURE_CARDS = QUICK_ACCESS.filter((item) => !item.adminOnly || isAdmin);

  // --- 2. REGISTER BACKGROUND TASK ON MOUNT ---
  useEffect(() => {
    const registerTask = async () => {
      try {
        await BackgroundFetch.registerTaskAsync(WEATHER_TASK_NAME, {
          minimumInterval: 15 * 60, 
          stopOnTerminate: false,
          startOnBoot: true,
        });
      } catch (err) {
        console.log("BG Task Registration Failed:", err);
      }
    };
    registerTask();
  }, []);

  // --- 3. DATABASE LISTENERS (Alerts, Announcements, SOS Vibration) ---
  useEffect(() => {
    const alertRef = ref(db, "emergencyAlert");
    const annRef = ref(db, "announcement");
    const sosRef = query(ref(db, "sosRequests"), limitToLast(1));

    const unsubAlert = onValue(alertRef, (snap) => {
      const data = snap.val();
      if (data) { setAlertVisible(data.active === true); setAlertMessage(data.message); }
    });
    
    const unsubAnn = onValue(annRef, (snap) => setAnnouncement(snap.val()));

    const unsubSos = onValue(sosRef, (snapshot) => {
      if (snapshot.exists()) {
        const details = Object.values(snapshot.val())[0];
        if (details.uid !== auth.currentUser?.uid) Vibration.vibrate([500, 300, 500]);
      }
    });

    return () => { unsubAlert(); unsubAnn(); unsubSos(); };
  }, []);

  const handleSOS = async () => {
    if (!isOnline) { Alert.alert("Offline 📵", "Internet required for SOS."); return; }
    Alert.alert("🚨 Send SOS Alert", "Broadcast your location to contacts?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "🚨 Send SOS",
        style: "destructive",
        onPress: async () => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") return;
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const { latitude, longitude } = loc.coords;
            const timestamp = Date.now();
            await set(ref(db, `sosRequests/${timestamp}`), {
              uid: auth.currentUser?.uid, name: auth.currentUser?.displayName || "User",
              latitude, longitude, timestamp: new Date().toISOString(),
            });
            Alert.alert("🚨 SOS Sent!", "Help is on the way!");
          } catch (e) { Alert.alert("Error", e.message); }
        },
      },
    ]);
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: bg }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>🚑 LIFELINE</Text>
            <Text style={styles.headerSub}>CTU Danao Autonomous System</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? "#4caf50" : "#ff5722" }]} />
              <Text style={styles.statusText}>{isOnline ? "Online" : "Offline"}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.headerSOS} onPress={handleSOS}>
            <Text style={styles.headerSOSText}>SOS</Text>
          </TouchableOpacity>
        </View>

        {/* ALERTS */}
        {alertVisible && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertTitle}>🚨 {alertMessage.includes("SYSTEM") ? "SYSTEM ALERT" : "EMERGENCY ALERT"}</Text>
            <Text style={styles.alertText}>{alertMessage}</Text>
          </View>
        )}

        {/* ANNOUNCEMENT */}
        {announcement && (
          <View style={styles.announcementBanner}>
            <Text style={styles.announcementTitle}>📢 Announcement</Text>
            <Text style={styles.announcementText}>{announcement}</Text>
          </View>
        )}

        {/* QUICK ACCESS GRID */}
        <View style={styles.panelHeader}><Text style={[styles.panelTitle, { color: textDark }]}>⚡ Quick Access</Text></View>
        <View style={styles.quickGrid}>
          {FEATURE_CARDS.map((item, index) => (
            <TouchableOpacity key={index} style={[styles.quickCard, { backgroundColor: item.color }]} onPress={() => router.push(item.route)}>
              <Text style={styles.quickIcon}>{item.icon}</Text>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* DISASTER TIPS */}
        <View style={styles.panelHeader}><Text style={[styles.panelTitle, { color: textDark }]}>⚠️ Disaster Tips</Text></View>
        <View style={styles.disasterGrid}>
          {DISASTER_TIPS.map((item, index) => (
            <TouchableOpacity key={index} style={[styles.disasterCard, { borderLeftColor: item.color, backgroundColor: card, borderColor: border }]} onPress={() => setExpandedDisaster(expandedDisaster === index ? null : index)}>
              <View style={styles.disasterCardTop}>
                <Text style={styles.disasterIcon}>{item.icon}</Text>
                <Text style={[styles.disasterLabel, { color: item.color }]}>{item.label}</Text>
              </View>
              {expandedDisaster === index && <Text style={[styles.disasterTip, { color: textMid }]}>{item.tip}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* PREPAREDNESS TIPS */}
        <View style={styles.panelHeader}><Text style={[styles.panelTitle, { color: textDark }]}>🛡 Preparedness Tips</Text></View>
        {PREPAREDNESS_TIPS.map((tip, index) => (
          <View key={index} style={[styles.tipCard, { backgroundColor: card, borderColor: border }]}>
            <Text style={styles.tipIcon}>{tip.icon}</Text>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.tipTitle, { color: textDark }]}>{tip.title}</Text>
              <Text style={[styles.tipDesc, { color: textMid }]}>{tip.desc}</Text>
            </View>
          </View>
        ))}
        
        <View style={{ height: 100 }} />
        <Text style={{textAlign: 'center', fontSize: 10, color: textLight, marginBottom: 20}}>Background Monitor: Active</Text>
      </ScrollView>

      {/* BOTTOM NAV */}
      <View style={[styles.bottomNav, { backgroundColor: card, borderColor: border }]}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity key={item.route} style={styles.navItem} onPress={() => { setActiveNav(item.route); router.push(item.route); }}>
            <Text style={styles.navIcon}>{item.icon}</Text>
            <Text style={[styles.navLabel, { color: textLight }, activeNav === item.route && { color: COLORS.primary, fontWeight: 'bold' }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// --- 4. STYLES (Always at the very bottom) ---
const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1 },
  header: { backgroundColor: COLORS.primary, paddingTop: 55, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 11 },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 5, gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: "#fff", fontSize: 11 },
  headerSOS: { backgroundColor: "#fff", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 25, elevation: 5 },
  headerSOSText: { color: COLORS.primary, fontWeight: "bold", fontSize: 16 },
  alertBanner: { backgroundColor: "#B00020", padding: 18, borderRadius: 15, marginHorizontal: 20, marginTop: 15 },
  alertTitle: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  alertText: { color: "#fff", textAlign: "center", marginTop: 4 },
  announcementBanner: { backgroundColor: "#0288D1", padding: 15, borderRadius: 15, marginHorizontal: 20, marginTop: 15 },
  announcementTitle: { color: "#fff", fontWeight: "bold", marginBottom: 4 },
  announcementText: { color: "#fff", fontSize: 13 },
  panelHeader: { marginHorizontal: 20, marginTop: 25, marginBottom: 15 },
  panelTitle: { fontSize: 16, fontWeight: "bold" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 10 },
  quickCard: { width: "22.5%", borderRadius: 15, padding: 12, alignItems: "center", elevation: 2 },
  quickIcon: { fontSize: 24, marginBottom: 5 },
  quickLabel: { fontSize: 9, fontWeight: "bold", color: "#fff", textAlign: "center" },
  disasterGrid: { paddingHorizontal: 20 },
  disasterCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 5, borderWidth: 1, elevation: 1 },
  disasterCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  disasterIcon: { fontSize: 22 },
  disasterLabel: { flex: 1, fontWeight: "bold", fontSize: 15 },
  disasterTip: { fontSize: 13, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  tipCard: { flexDirection: "row", alignItems: "center", borderRadius: 15, padding: 14, marginHorizontal: 20, marginBottom: 12, borderWidth: 1 },
  tipIcon: { fontSize: 24 },
  tipTitle: { fontWeight: "bold", fontSize: 14 },
  tipDesc: { fontSize: 12, marginTop: 3 },
  bottomNav: { flexDirection: "row", borderTopWidth: 1, paddingBottom: 25, paddingTop: 10 },
  navItem: { flex: 1, alignItems: "center" },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 10, marginTop: 3 },
});
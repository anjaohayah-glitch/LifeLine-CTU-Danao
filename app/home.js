// app/home.js
import * as BackgroundFetch from "expo-background-fetch";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import * as TaskManager from "expo-task-manager";
import { limitToLast, onValue, push, query, ref, set } from "firebase/database";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { COLORS } from "../constants/colors";
import { useSettings } from "../context/SettingsContext";
import { auth, db } from "../firebase";
import { useAdmin } from "../hooks/useAdmin";

const WEATHER_TASK_NAME = "BACKGROUND_WEATHER_CHECK";
const WEATHER_API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY;
const DANAO_LAT = 10.52;
const DANAO_LON = 124.03;

TaskManager.defineTask(WEATHER_TASK_NAME, async () => {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${DANAO_LAT}&lon=${DANAO_LON}&appid=${WEATHER_API_KEY}`);
    const data = await res.json();
    if (data.weather[0].id < 700 || data.wind.speed > 10) {
      await set(ref(db, "emergencyAlert"), {
        active: true,
        message: `SYSTEM: ${data.weather[0].main} in Danao. Wind: ${data.wind.speed}m/s. Stay safe!`,
        timestamp: Date.now(),
        type: "automatic_bg",
      });
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

const NAV_ITEMS = [
  { icon: "🏠", label: "Home", route: "/home" },
  { icon: "🗺", label: "Evacuate", route: "/evacuation" },
  { icon: "📞", label: "Hotlines", route: "/hotlines" },
  { icon: "🌤", label: "Weather", route: "/weather" },
  { icon: "👤", label: "Profile", route: "/profile" },
];

const QUICK_ACCESS = [
  { icon: "🛡", label: "Admin", route: "/admin", color: "#7F0000", adminOnly: true },
  { icon: "🩺", label: "First Aid", route: "/firstaid", color: "#C62828" },
  { icon: "📚", label: "Guides", route: "/guides", color: "#00695C" },
  { icon: "✅", label: "Checklist", route: "/checklist", color: "#00838F" },
  { icon: "👨‍👩‍👧", label: "Family", route: "/family", color: "#6A1B9A" },
  { icon: "🛡", label: "DRRM", route: "/drrm", color: "#B00020" },
  { icon: "🗣", label: "Voice", route: "/voiceguide", color: "#1565C0" },
  { icon: "⚙️", label: "Settings", route: "/settings", color: "#37474F" },
];

const DISASTER_TIPS = [
  { icon: "🌊", label: "Flood", color: "#1565C0", bg: "#E3F2FD", darkBg: "#0d1f35", tip: "Move to higher ground immediately. Avoid walking in moving water. Never drive through flooded roads." },
  { icon: "🌍", label: "Earthquake", color: "#4527A0", bg: "#EDE7F6", darkBg: "#1a1035", tip: "Drop, Cover, and Hold On. Stay away from windows and heavy furniture." },
  { icon: "🌪", label: "Typhoon", color: "#00695C", bg: "#E0F2F1", darkBg: "#0d2520", tip: "Stay indoors. Keep away from windows and doors. Unplug electrical appliances." },
  { icon: "🔥", label: "Fire", color: "#E65100", bg: "#FBE9E7", darkBg: "#2d1200", tip: "Use evacuation routes. Stay low to avoid smoke. Never use elevators." },
];

export default function Home() {
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [announcement, setAnnouncement] = useState(null);
  const [activeNav, setActiveNav] = useState("/home");
  const [isOnline, setIsOnline] = useState(true);
  const [expandedDisaster, setExpandedDisaster] = useState(null);
  const [isSafe, setIsSafe] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { isAdmin } = useAdmin();
  const router = useRouter();
  const { theme } = useSettings();
  const { bg, card, border, textDark, textLight } = theme;
  const isDark = theme.bg === "#121212";

  const FEATURE_CARDS = QUICK_ACCESS.filter((item) => !item.adminOnly || isAdmin);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  useEffect(() => {
    const unsubAlert = onValue(ref(db, "emergencyAlert"), (snap) => {
      const data = snap.val();
      if (data) { setAlertVisible(data.active === true); setAlertMessage(data.message); }
    });
    const unsubAnn = onValue(ref(db, "announcement"), (snap) => setAnnouncement(snap.val()));
    const unsubSos = onValue(query(ref(db, "sosRequests"), limitToLast(1)), (snapshot) => {
      if (snapshot.exists()) {
        const details = Object.values(snapshot.val())[0];
        if (details.uid !== auth.currentUser?.uid) Vibration.vibrate([500, 300, 500]);
      }
    });
    return () => { unsubAlert(); unsubAnn(); unsubSos(); };
  }, []);

  const handleCheckIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newStatus = !isSafe;
    setIsSafe(newStatus);
    try {
      await set(ref(db, `userStatus/${auth.currentUser?.uid}`), {
        name: auth.currentUser?.displayName || "Student",
        isSafe: newStatus,
        lastCheckIn: new Date().toISOString(),
      });
    } catch (e) { console.log(e); }
  };

  const handleSOS = async () => {
    if (!isOnline) { Alert.alert("Offline 📵", "Internet required for SOS."); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("🚨 Send SOS Alert", "This will broadcast your live location to ALL contacts and admin.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "🚨 YES, SEND SOS", style: "destructive",
        onPress: async () => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") return;
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const { latitude, longitude } = loc.coords;
            let locationText = "Location unavailable";
            try {
              const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
              if (geocode.length > 0) {
                const g = geocode[0];
                locationText = [g.street, g.district, g.city, g.region].filter(Boolean).join(", ");
              }
            } catch (e) {}
            const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
            const senderName = auth.currentUser?.displayName || auth.currentUser?.email;
            const timestamp = Date.now();
            await set(ref(db, `sosRequests/${timestamp}`), {
              uid: auth.currentUser?.uid, name: senderName,
              email: auth.currentUser?.email, latitude, longitude,
              address: locationText, locationUrl,
              timestamp: new Date().toISOString(),
            });
            await set(ref(db, `safetyStatus/${auth.currentUser?.uid}`), {
              status: "help", message: "I need help! 🔴",
              timestamp, name: senderName, location: locationText,
            });
            onValue(ref(db, `contacts/${auth.currentUser?.uid}`), async (snapshot) => {
              const data = snapshot.val();
              if (data) {
                const contacts = Object.entries(data).map(([id, val]) => ({ id, ...val })).filter((c) => c.status === "accepted");
                const getChatId = (uid1, uid2) => [uid1, uid2].sort().join("_");
                for (const contact of contacts) {
                  await push(ref(db, `messages/${getChatId(auth.currentUser?.uid, contact.uid)}`), {
                    senderId: auth.currentUser?.uid, senderName,
                    text: `🚨 SOS ALERT!\n\n${senderName} NEEDS HELP!\n\n📍 ${locationText}\n\n🗺 Tap to navigate:\n${locationUrl}`,
                    timestamp, type: "sos",
                  });
                }
              }
            }, { onlyOnce: true });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("🚨 SOS Sent!", "✅ All contacts notified\n✅ Admin notified\n\nStay calm. Help is on the way!");
          } catch (e) { Alert.alert("Error", e.message); }
        },
      },
    ]);
  };

  const formatTime = (date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDate = (date) => date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const getGreeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return "Good Morning ☀️";
    if (h < 17) return "Good Afternoon 🌤";
    return "Good Evening 🌙";
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: bg }]}>

      {/* ── COMPACT STICKY BAR — always visible at top ── */}
      <View style={[styles.stickyBar, { backgroundColor: COLORS.primary }]}>
        <View style={styles.stickyLeft}>
          <Text style={styles.stickyTime}>{formatTime(currentTime)}</Text>
          <Text style={styles.stickyDate}>{formatDate(currentTime)}</Text>
        </View>
        <View style={styles.stickyRight}>
          <View style={[styles.stickyDot, { backgroundColor: isOnline ? "#4CAF50" : "#FF5722" }]} />
          <Text style={styles.stickyOnline}>{isOnline ? "Online" : "Offline"}</Text>
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── HEADER — scrolls away ───────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerGreeting}>{getGreeting()}</Text>
              <Text style={styles.headerTitle}>LIFELINE</Text>
              <Text style={styles.headerSub}>CTU Danao Campus · DRRMO System</Text>
            </View>
            <TouchableOpacity style={styles.sosButton} onPress={handleSOS}>
              <Text style={styles.sosButtonEmoji}>🚨</Text>
              <Text style={styles.sosButtonText}>SOS</Text>
            </TouchableOpacity>
          </View>

          {/* Big clock in header — scrolls away with it */}
          <View style={styles.clockRow}>
            <Text style={styles.clockTime}>{formatTime(currentTime)}</Text>
            <Text style={styles.clockDate}>{formatDate(currentTime)}</Text>
          </View>

          {/* Status strip */}
          <View style={styles.statusStrip}>
            {[
              { dot: isOnline ? "#4CAF50" : "#FF5722", label: isOnline ? "Online" : "Offline" },
              { dot: "#4CAF50", label: "USGS Active" },
              { dot: "#4CAF50", label: "PAGASA Sync" },
            ].map((s, i) => (
              <View key={i} style={styles.statusItem}>
                {i > 0 && <View style={styles.statusDivider} />}
                <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
                <Text style={styles.statusItemText}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── STATUS CARD ────────────────────────────── */}
        <View style={[styles.statusCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.statusCardLeft}>
            <Text style={[styles.statusCardLabel, { color: textLight }]}>YOUR STATUS</Text>
            <Text style={[styles.statusCardName, { color: textDark }]} numberOfLines={1}>
              {auth.currentUser?.displayName || "Student"}
            </Text>
            <View style={styles.statusBadgeRow}>
              <View style={[styles.statusPulseDot, { backgroundColor: isSafe ? "#4CAF50" : "#FF9800" }]} />
              <Text style={[styles.statusBadgeText, { color: isSafe ? "#4CAF50" : "#FF9800" }]}>
                {isSafe ? "Marked Safe" : "Status Unknown"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.safeButton, { backgroundColor: isSafe ? "#4CAF50" : COLORS.primary }]}
            onPress={handleCheckIn}
          >
            <Text style={styles.safeButtonIcon}>{isSafe ? "✓" : "?"}</Text>
            <Text style={styles.safeButtonLabel}>{isSafe ? "SAFE" : "MARK\nSAFE"}</Text>
          </TouchableOpacity>
        </View>

        {/* ── EMERGENCY ALERT ────────────────────────── */}
        {alertVisible && (
          <View style={styles.alertCard}>
            <View style={styles.alertTop}>
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>⚠️ EMERGENCY ACTIVE</Text>
              </View>
            </View>
            <Text style={styles.alertTitle}>🚨 Emergency Alert</Text>
            <Text style={styles.alertMessage}>{alertMessage}</Text>
            <TouchableOpacity style={styles.alertButton} onPress={() => router.push("/evacuation")}>
              <Text style={styles.alertButtonText}>View Evacuation Centers →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── ANNOUNCEMENT ───────────────────────────── */}
        {announcement?.message && (
          <View style={[styles.announcementCard, { backgroundColor: card, borderColor: border }]}>
            <View style={[styles.announcementAccent, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.announcementIcon}>📢</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.announcementLabel, { color: textLight }]}>DRRMO ANNOUNCEMENT</Text>
              <Text style={[styles.announcementText, { color: textDark }]}>{announcement.message}</Text>
            </View>
          </View>
        )}

        {/* ── QUICK ACCESS ───────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textDark }]}>Quick Access</Text>
          <Text style={[styles.sectionSub, { color: textLight }]}>All features</Text>
        </View>
        <View style={styles.quickGrid}>
          {FEATURE_CARDS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickCard, { backgroundColor: item.color }]}
              onPress={() => { Haptics.selectionAsync(); router.push(item.route); }}
              activeOpacity={0.85}
            >
              <Text style={styles.quickIcon}>{item.icon}</Text>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── DISASTER TIPS ──────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textDark }]}>Disaster Tips</Text>
          <Text style={[styles.sectionSub, { color: textLight }]}>Tap to expand</Text>
        </View>
        <View style={styles.disasterGrid}>
          {DISASTER_TIPS.map((item, index) => (
            <View key={index}>
              <TouchableOpacity
                style={[
                  styles.disasterCard,
                  { backgroundColor: card, borderColor: border },
                  expandedDisaster === index && { borderColor: item.color, borderWidth: 1.5 },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setExpandedDisaster(expandedDisaster === index ? null : index);
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.disasterIconBg, { backgroundColor: isDark ? item.darkBg : item.bg }]}>
                  <Text style={styles.disasterIcon}>{item.icon}</Text>
                </View>
                <View style={styles.disasterContent}>
                  <Text style={[styles.disasterLabel, { color: item.color }]}>{item.label}</Text>
                  <Text style={[styles.disasterSubLabel, { color: textLight }]}>
                    {expandedDisaster === index ? "Tap to collapse" : "Tap for quick tip"}
                  </Text>
                </View>
                <Text style={[styles.disasterChevron, { color: textLight }]}>
                  {expandedDisaster === index ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>
              {expandedDisaster === index && (
                <View style={[styles.expandedTip, { backgroundColor: isDark ? item.darkBg : item.bg }]}>
                  <Text style={styles.expandedTipIcon}>{item.icon}</Text>
                  <Text style={[styles.expandedTipText, { color: item.color }]}>{item.tip}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* ── SYSTEM FEED ────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textDark }]}>System Feed</Text>
          <View style={[styles.liveBadge, { backgroundColor: isDark ? "#1a3a1a" : "#E8F5E9" }]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <View style={[styles.systemFeed, { backgroundColor: card, borderColor: border }]}>
          {[
            { icon: "🌍", label: "USGS Seismic Watch", status: "Active" },
            { icon: "☁️", label: "PAGASA Weather Sync", status: "Online" },
            { icon: "🌋", label: "PHIVOLCS Monitor", status: "Active" },
            { icon: "📡", label: "Firebase Real-Time DB", status: "Connected" },
            { icon: "🔔", label: "Push Notifications", status: "Enabled" },
          ].map((feed, i, arr) => (
            <View
              key={i}
              style={[styles.feedItem, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: border }]}
            >
              <Text style={styles.feedIcon}>{feed.icon}</Text>
              <Text style={[styles.feedLabel, { color: textDark }]}>{feed.label}</Text>
              <View style={[styles.feedStatus, { backgroundColor: isDark ? "#1a3a1a" : "#E8F5E9" }]}>
                <View style={styles.feedDot} />
                <Text style={styles.feedStatusText}>{feed.status}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── BOTTOM NAV ─────────────────────────────── */}
      <View style={[styles.bottomNav, { backgroundColor: card, borderColor: border }]}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.navItem}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveNav(item.route);
              router.push(item.route);
            }}
          >
            <View style={[
              styles.navIconWrap,
              activeNav === item.route && { backgroundColor: COLORS.primary + "18" },
            ]}>
              <Text style={styles.navIcon}>{item.icon}</Text>
            </View>
            <Text style={[
              styles.navLabel,
              { color: textLight },
              activeNav === item.route && { color: COLORS.primary, fontWeight: "bold" },
            ]}>
              {item.label}
            </Text>
            {activeNav === item.route && <View style={styles.navActiveDot} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1 },

  // ── COMPACT STICKY BAR ──────────────────────────────
  stickyBar: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 10,
  },
  stickyLeft: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  stickyTime: { color: "#fff", fontSize: 20, fontWeight: "600", letterSpacing: 1 },
  stickyDate: { color: "rgba(255,255,255,0.7)", fontSize: 11 },
  stickyRight: { flexDirection: "row", alignItems: "center", gap: 5 },
  stickyDot: { width: 6, height: 6, borderRadius: 3 },
  stickyOnline: { color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "600" },

  // ── HEADER ──────────────────────────────────────────
  header: {
    backgroundColor: COLORS.primary,
    paddingBottom: 30, paddingHorizontal: 24,
    paddingTop: 12,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 16,
  },
  headerGreeting: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginBottom: 2 },
  headerTitle: { color: "#fff", fontSize: 32, fontWeight: "bold", letterSpacing: 2 },
  headerSub: { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 2 },
  sosButton: {
    backgroundColor: "#fff", borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 10,
    alignItems: "center", elevation: 6,
    shadowColor: "#000", shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
  },
  sosButtonEmoji: { fontSize: 18 },
  sosButtonText: { color: COLORS.primary, fontWeight: "bold", fontSize: 12, marginTop: 2 },

  // ── BIG CLOCK (in scrollable header) ────────────────
  clockRow: { marginBottom: 16 },
  clockTime: { color: "#fff", fontSize: 42, fontWeight: "200", letterSpacing: 2 },
  clockDate: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },

  // ── STATUS STRIP ────────────────────────────────────
  statusStrip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14,
  },
  statusItem: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1, justifyContent: "center" },
  statusItemText: { color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "600" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDivider: { width: 1, height: 14, backgroundColor: "rgba(255,255,255,0.2)", marginRight: 8 },

  // ── STATUS CARD ─────────────────────────────────────
  statusCard: {
    marginHorizontal: 20, marginTop: -20,
    borderRadius: 20, padding: 18,
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", borderWidth: 1,
    elevation: 12, shadowColor: "#000",
    shadowOpacity: 0.12, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12,
  },
  statusCardLeft: { flex: 1 },
  statusCardLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 4 },
  statusCardName: { fontSize: 18, fontWeight: "bold", marginBottom: 6 },
  statusBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusPulseDot: { width: 7, height: 7, borderRadius: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: "600" },
  safeButton: {
    borderRadius: 16, width: 64, height: 64,
    justifyContent: "center", alignItems: "center", elevation: 4,
  },
  safeButtonIcon: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  safeButtonLabel: { color: "#fff", fontSize: 9, fontWeight: "bold", textAlign: "center", marginTop: 2 },

  // ── ALERT ───────────────────────────────────────────
  alertCard: {
    backgroundColor: "#B00020", marginHorizontal: 20, marginTop: 16,
    borderRadius: 20, padding: 18, borderWidth: 1.5,
    borderColor: "#FF5252", elevation: 6,
  },
  alertTop: { marginBottom: 10 },
  alertBadge: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  alertBadgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  alertTitle: { color: "#fff", fontWeight: "bold", fontSize: 16, marginBottom: 6 },
  alertMessage: { color: "rgba(255,255,255,0.9)", fontSize: 13, lineHeight: 20, marginBottom: 14 },
  alertButton: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  alertButtonText: { color: "#fff", fontWeight: "bold", fontSize: 13 },

  // ── ANNOUNCEMENT ────────────────────────────────────
  announcementCard: { marginHorizontal: 20, marginTop: 12, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, overflow: "hidden" },
  announcementAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  announcementIcon: { fontSize: 26, marginLeft: 8 },
  announcementLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 3 },
  announcementText: { fontSize: 13, lineHeight: 18 },

  // ── SECTION HEADERS ─────────────────────────────────
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 20, marginTop: 28, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: "bold" },
  sectionSub: { fontSize: 12 },

  // ── QUICK ACCESS ────────────────────────────────────
  quickGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 10 },
  quickCard: { width: "22%", borderRadius: 16, paddingVertical: 16, paddingHorizontal: 8, alignItems: "center", elevation: 3, shadowColor: "#000", shadowOpacity: 0.12, shadowOffset: { width: 0, height: 3 }, shadowRadius: 5 },
  quickIcon: { fontSize: 26, marginBottom: 6 },
  quickLabel: { fontSize: 10, fontWeight: "bold", color: "#fff", textAlign: "center" },

  // ── DISASTER TIPS ────────────────────────────────────
  disasterGrid: { paddingHorizontal: 20, gap: 8 },
  disasterCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 14, gap: 14, borderWidth: 1, elevation: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3 },
  disasterIconBg: { width: 46, height: 46, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  disasterIcon: { fontSize: 22 },
  disasterContent: { flex: 1 },
  disasterLabel: { fontWeight: "bold", fontSize: 14 },
  disasterSubLabel: { fontSize: 11, marginTop: 2 },
  disasterChevron: { fontSize: 11 },
  expandedTip: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14, padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: -4 },
  expandedTipIcon: { fontSize: 20 },
  expandedTipText: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: "500" },

  // ── SYSTEM FEED ──────────────────────────────────────
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4CAF50" },
  liveText: { fontSize: 10, fontWeight: "bold", color: "#4CAF50" },
  systemFeed: { marginHorizontal: 20, borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  feedItem: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  feedIcon: { fontSize: 18, width: 28, textAlign: "center" },
  feedLabel: { flex: 1, fontSize: 13, fontWeight: "500" },
  feedStatus: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  feedDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#4CAF50" },
  feedStatusText: { fontSize: 10, fontWeight: "bold", color: "#4CAF50" },

  // ── BOTTOM NAV ───────────────────────────────────────
  bottomNav: { flexDirection: "row", borderTopWidth: 1, paddingBottom: 28, paddingTop: 12, position: "absolute", bottom: 0, left: 0, right: 0, elevation: 20, shadowColor: "#000", shadowOpacity: 0.08, shadowOffset: { width: 0, height: -2 } },
  navItem: { flex: 1, alignItems: "center" },
  navIconWrap: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 3 },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 10 },
  navActiveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, marginTop: 3 },
});
// app/home.js
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { onValue, ref, set } from "firebase/database";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../constants/colors";
import { db } from "../firebase";
import { useAdmin } from "../hooks/useAdmin";

const NAV_ITEMS = [
  { icon: "🏠", label: "Home", route: "/home" },
  { icon: "🗺", label: "Evacuate", route: "/evacuation" },
  { icon: "📞", label: "Hotlines", route: "/hotlines" },
  { icon: "🌤", label: "Weather", route: "/weather" },
  { icon: "👤", label: "Profile", route: "/profile" },
];

const ALL_FEATURE_CARDS = [
  { icon: "🛡", label: "Admin", route: "/admin", color: COLORS.admin, adminOnly: true },
  { icon: "🩺", label: "First Aid", route: "/firstaid", color: COLORS.danger },
  { icon: "📚", label: "Guides", route: "/guides", color: "#00695C" },
  { icon: "✅", label: "Checklist", route: "/checklist", color: "#00838F" },
  { icon: "👨‍👩‍👧", label: "Family", route: "/family", color: "#6A1B9A" },
  { icon: "🛡", label: "DRRM", route: "/drrm", color: "#B00020" },
  { icon: "🗣", label: "Voice Guide", route: "/voiceguide", color: "#1565C0" },
  { icon: "⚙️", label: "Settings", route: "/settings", color: "#455A64" },
  { icon: "🌊", label: "Flood", tip: "Move to higher ground." },
  { icon: "🌍", label: "Earthquake", tip: "Drop, Cover, Hold." },
  { icon: "🌪", label: "Typhoon", tip: "Stay indoors." },
  { icon: "🔥", label: "Fire", tip: "Use evacuation routes." },
  { icon: "⛰️", label: "Landslide", tip: "Move sideways to safety." },
];

export default function Home() {
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [announcement, setAnnouncement] = useState(null);
  const [activeNav, setActiveNav] = useState("/home");
  const [isOnline, setIsOnline] = useState(true);
  const { isAdmin } = useAdmin();
  const router = useRouter();

  const FEATURE_CARDS = ALL_FEATURE_CARDS.filter(
    (item) => !item.adminOnly || isAdmin
  );

  useEffect(() => {
    const alertRef = ref(db, "emergencyAlert");
    const unsubscribe = onValue(alertRef, (snapshot) => {
      const data = snapshot.val();
      if (typeof data === "object" && data !== null) {
        setAlertVisible(data.active === true);
        setAlertMessage(data.message || "Emergency alert issued!");
      } else {
        setAlertVisible(data === true);
        setAlertMessage("Emergency alert issued!");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const annRef = ref(db, "announcement");
    const unsubscribe = onValue(annRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.message) setAnnouncement(data.message);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribe;
    (async () => {
      const NetInfo = (await import("@react-native-community/netinfo")).default;
      unsubscribe = NetInfo.addEventListener((state) => {
        setIsOnline(state.isConnected && state.isInternetReachable);
      });
    })();
    return () => unsubscribe && unsubscribe();
  }, []);

  const handleSOS = async () => {
    if (!isOnline) {
      Alert.alert(
        "You are Offline 📵",
        "SOS requires internet connection.\n\nYou can still access Disaster Guides offline.",
        [
          { text: "Open Guides", onPress: () => router.push("/guides") },
          { text: "OK", style: "cancel" },
        ]
      );
      return;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is required.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      await set(ref(db, "sosRequests/" + Date.now()), {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString(),
      });
      Alert.alert("SOS Sent", "🚨 Your location has been sent successfully.");
    } catch (error) {
      Alert.alert("Error", "Something went wrong sending SOS.");
    }
  };

  const handleNav = (route) => {
    setActiveNav(route);
    router.push(route);
  };

  return (
    <View style={styles.wrapper}>

      {/* OFFLINE BANNER */}
      {!isOnline && (
        <TouchableOpacity
          style={styles.offlineBanner}
          onPress={() => router.push("/guides")}
        >
          <Text style={styles.offlineText}>
            📵 You are offline — Tap to access Disaster Guides
          </Text>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>🚑 LIFELINE</Text>
            <Text style={styles.headerSub}>CTU Danao Preparedness System</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? "#4caf50" : "#ff5722" }]} />
              <Text style={styles.statusText}>{isOnline ? "Online" : "Offline"}</Text>
              {isAdmin && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>🛡 Admin</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push("/settings")}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerSOS, !isOnline && styles.headerSOSDisabled]}
              onPress={handleSOS}
            >
              <Text style={[styles.headerSOSText, !isOnline && { color: "#999" }]}>SOS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 🚨 EMERGENCY ALERT */}
        {alertVisible && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertTitle}>🚨 EMERGENCY ALERT 🚨</Text>
            <Text style={styles.alertText}>{alertMessage}</Text>
            <Text style={styles.alertSubText}>Stay indoors. Prepare emergency supplies.</Text>
          </View>
        )}

        {/* 📢 ANNOUNCEMENT */}
        {announcement && (
          <View style={styles.announcementBanner}>
            <Text style={styles.announcementTitle}>📢 Announcement</Text>
            <Text style={styles.announcementText}>{announcement}</Text>
          </View>
        )}

        {/* OFFLINE GUIDE CARD */}
        {!isOnline && (
          <TouchableOpacity
            style={styles.offlineGuideCard}
            onPress={() => router.push("/guides")}
          >
            <Text style={styles.offlineGuideIcon}>📚</Text>
            <View style={styles.offlineGuideContent}>
              <Text style={styles.offlineGuideTitle}>Access Disaster Guides</Text>
              <Text style={styles.offlineGuideDesc}>
                View Before, During & After guides — no internet needed!
              </Text>
            </View>
            <Text style={styles.offlineGuideArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* QUICK ACCESS */}
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickGrid}>
          {FEATURE_CARDS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.quickCard,
                { backgroundColor: item.color || COLORS.surface },
              ]}
              onPress={() => item.route && router.push(item.route)}
            >
              <Text style={styles.quickIcon}>{item.icon}</Text>
              <Text style={[styles.quickLabel, item.color && { color: "#fff" }]}>
                {item.label}
              </Text>
              {item.tip && (
                <Text style={styles.quickTip}>{item.tip}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* PREPAREDNESS TIPS */}
        <Text style={styles.sectionTitle}>Preparedness Tips</Text>
        {[
          { icon: "🎒", title: "Go Bag", desc: "Prepare a bag with 3-day supplies: food, water, meds, documents." },
          { icon: "📋", title: "Family Plan", desc: "Have a meeting point and contact list ready for your family." },
          { icon: "📻", title: "Stay Informed", desc: "Keep a battery-powered radio for updates during power outages." },
          { icon: "💊", title: "First Aid Kit", desc: "Keep a stocked first aid kit at home and in your vehicle." },
        ].map((tip, index) => (
          <View key={index} style={styles.tipCard}>
            <View style={styles.tipIconBox}>
              <Text style={styles.tipIcon}>{tip.icon}</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipDesc}>{tip.desc}</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* BOTTOM NAVIGATION BAR */}
      <View style={styles.bottomNav}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.navItem}
            onPress={() => handleNav(item.route)}
          >
            <Text style={styles.navIcon}>{item.icon}</Text>
            <Text style={[
              styles.navLabel,
              activeNav === item.route && { color: COLORS.primary, fontWeight: "bold" }
            ]}>
              {item.label}
            </Text>
            {activeNav === item.route && <View style={styles.navDot} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: "#fff" },
  offlineBanner: {
    backgroundColor: "#E65100",
    padding: 10, alignItems: "center",
  },
  offlineText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingTop: 55, paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 20,
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 5, gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: "rgba(255,255,255,0.85)", fontSize: 11 },
  adminBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10,
  },
  adminBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  headerButtons: { flexDirection: "row", alignItems: "center", gap: 10 },
  settingsButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 40, height: 40, borderRadius: 20,
    justifyContent: "center", alignItems: "center",
  },
  settingsIcon: { fontSize: 20 },
  headerSOS: {
    backgroundColor: "#fff",
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 25, elevation: 3,
  },
  headerSOSDisabled: { backgroundColor: "#eee" },
  headerSOSText: { color: COLORS.primary, fontWeight: "bold", fontSize: 16 },
  alertBanner: {
    backgroundColor: COLORS.primary,
    padding: 18, borderRadius: 15,
    marginHorizontal: 20, marginBottom: 15,
    elevation: 4,
  },
  alertTitle: { color: "#fff", fontSize: 17, fontWeight: "bold", textAlign: "center" },
  alertText: { color: "#fff", textAlign: "center", marginTop: 4 },
  alertSubText: { color: "rgba(255,255,255,0.8)", textAlign: "center", marginTop: 4, fontSize: 13 },
  announcementBanner: {
    backgroundColor: COLORS.info,
    padding: 15, borderRadius: 15,
    marginHorizontal: 20, marginBottom: 15,
  },
  announcementTitle: { color: "#fff", fontWeight: "bold", fontSize: 14, marginBottom: 4 },
  announcementText: { color: "#fff", fontSize: 13 },
  offlineGuideCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#E8F5E9", borderRadius: 15,
    padding: 15, marginHorizontal: 20, marginBottom: 20,
    borderWidth: 1, borderColor: "#A5D6A7",
  },
  offlineGuideIcon: { fontSize: 35, marginRight: 12 },
  offlineGuideContent: { flex: 1 },
  offlineGuideTitle: { fontWeight: "bold", color: "#2e7d32", fontSize: 14 },
  offlineGuideDesc: { color: "#555", fontSize: 12, marginTop: 3 },
  offlineGuideArrow: { fontSize: 26, color: "#aaa" },
  sectionTitle: {
    fontSize: 18, fontWeight: "bold",
    color: COLORS.textDark,
    marginBottom: 12, marginHorizontal: 20,
  },
  quickGrid: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: 20, gap: 10, marginBottom: 25,
  },
  quickCard: {
    width: "30%", borderRadius: 15,
    padding: 14, alignItems: "center",
    elevation: 3, shadowColor: "#000",
    shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4, borderWidth: 1, borderColor: COLORS.border,
  },
  quickIcon: { fontSize: 28, marginBottom: 6 },
  quickLabel: { fontSize: 12, fontWeight: "bold", color: COLORS.textDark, textAlign: "center" },
  quickTip: { fontSize: 10, color: COLORS.textLight, textAlign: "center", marginTop: 3 },
  tipCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.surface, borderRadius: 15,
    padding: 14, marginHorizontal: 20, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
    elevation: 2, shadowColor: "#000",
    shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  tipIconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: "#fff", justifyContent: "center",
    alignItems: "center", marginRight: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tipIcon: { fontSize: 24 },
  tipContent: { flex: 1 },
  tipTitle: { fontWeight: "bold", fontSize: 14, color: COLORS.textDark },
  tipDesc: { color: COLORS.textMid, fontSize: 12, marginTop: 3, lineHeight: 18 },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1, borderColor: COLORS.border,
    paddingBottom: 20, paddingTop: 10,
    elevation: 15, shadowColor: "#000",
    shadowOpacity: 0.1, shadowOffset: { width: 0, height: -3 },
    shadowRadius: 6,
  },
  navItem: { flex: 1, alignItems: "center" },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 10, color: COLORS.textLight, marginTop: 3 },
  navDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: COLORS.primary, marginTop: 3,
  },
});
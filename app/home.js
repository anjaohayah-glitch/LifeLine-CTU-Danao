// app/home.js
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { onValue, push, ref, set } from "firebase/database";
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
import { auth, db } from "../firebase";
import { useAdmin } from "../hooks/useAdmin";

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
  { icon: "🌊", label: "Flood", color: "#1565C0", tip: "Move to higher ground immediately. Avoid walking in moving water." },
  { icon: "🌍", label: "Earthquake", color: "#4527A0", tip: "Drop, Cover, and Hold On. Stay away from windows." },
  { icon: "🌪", label: "Typhoon", color: "#00695C", tip: "Stay indoors. Keep away from windows and doors." },
  { icon: "🔥", label: "Fire", color: "#E65100", tip: "Use evacuation routes. Stay low to avoid smoke." },
  { icon: "⛰️", label: "Landslide", color: "#4E342E", tip: "Move sideways to safety. Avoid river valleys." },
];

const PREPAREDNESS_TIPS = [
  { icon: "🎒", title: "Go Bag", desc: "Prepare a bag with 3-day supplies: food, water, meds, documents." },
  { icon: "📋", title: "Family Plan", desc: "Have a meeting point and contact list ready for your family." },
  { icon: "📻", title: "Stay Informed", desc: "Keep a battery-powered radio for updates during power outages." },
  { icon: "💊", title: "First Aid Kit", desc: "Keep a stocked first aid kit at home and in your vehicle." },
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

  const FEATURE_CARDS = QUICK_ACCESS.filter(
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

    Alert.alert(
      "🚨 Send SOS Alert",
      "This will send your live location to ALL your contacts and notify the admin. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "🚨 Send SOS",
          style: "destructive",
          onPress: async () => {
            try {
              // 📍 Get live location
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== "granted") {
                Alert.alert("Permission Denied", "Location access is required.");
                return;
              }
              const location = await Location.getCurrentPositionAsync({});
              const { latitude, longitude } = location.coords;

              // Reverse geocode
              let locationText = "Location unavailable";
              try {
                const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
                if (geocode.length > 0) {
                  const g = geocode[0];
                  locationText = [g.street, g.district, g.city, g.region]
                    .filter(Boolean).join(", ");
                }
              } catch (e) {}

              const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
              const senderName = auth.currentUser?.displayName || auth.currentUser?.email;
              const timestamp = Date.now();

              // 1️⃣ Save to Firebase sosRequests — Admin gets notified
              await set(ref(db, "sosRequests/" + timestamp), {
                uid: auth.currentUser?.uid,
                name: senderName,
                email: auth.currentUser?.email,
                latitude,
                longitude,
                address: locationText,
                locationUrl,
                timestamp: new Date().toISOString(),
              });

              // 2️⃣ Update safety status to Needs Help
              await set(ref(db, `safetyStatus/${auth.currentUser?.uid}`), {
                status: "help",
                message: "I need help! 🔴",
                timestamp,
                name: senderName,
                location: locationText,
              });

              // 3️⃣ Notify all approved contacts
              onValue(ref(db, `contacts/${auth.currentUser?.uid}`), async (snapshot) => {
                const data = snapshot.val();
                if (data) {
                  const contacts = Object.entries(data)
                    .map(([id, val]) => ({ id, ...val }))
                    .filter((c) => c.status === "accepted");

                  const getChatId = (uid1, uid2) => [uid1, uid2].sort().join("_");

                  for (const contact of contacts) {
                    await push(ref(db, `messages/${getChatId(auth.currentUser?.uid, contact.uid)}`), {
                      senderId: auth.currentUser?.uid,
                      senderName,
                      text: `🚨 SOS ALERT!\n\n${senderName} NEEDS IMMEDIATE HELP!\n\n📍 Location:\n${locationText}\n\n🗺 Live Location:\n${locationUrl}\n\n⏰ ${new Date().toLocaleString()}`,
                      timestamp,
                      type: "sos",
                    });
                  }
                }
              }, { onlyOnce: true });

              // 4️⃣ Confirmation
              Alert.alert(
                "🚨 SOS Sent!",
                `Your emergency alert has been sent!\n\n✅ All your contacts notified\n✅ Admin notified\n\n📍 Location shared:\n${locationText}\n\nStay calm. Help is on the way!`,
                [{ text: "OK" }]
              );

            } catch (error) {
              Alert.alert("Error", "Something went wrong sending SOS. Try again.");
            }
          },
        },
      ]
    );
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
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => router.push("/evacuation")}
            >
              <Text style={styles.alertButtonText}>🗺 View Evacuation Centers</Text>
            </TouchableOpacity>
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

        {/* PANEL 1 — QUICK ACCESS */}
        <View style={styles.panelHeader}>
          <View style={styles.panelHeaderLine} />
          <Text style={styles.panelTitle}>⚡ Quick Access</Text>
          <View style={styles.panelHeaderLine} />
        </View>
        <View style={styles.quickGrid}>
          {FEATURE_CARDS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickCard, { backgroundColor: item.color }]}
              onPress={() => item.route && router.push(item.route)}
            >
              <Text style={styles.quickIcon}>{item.icon}</Text>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* PANEL 2 — DISASTER TIPS */}
        <View style={styles.panelHeader}>
          <View style={styles.panelHeaderLine} />
          <Text style={styles.panelTitle}>⚠️ Disaster Tips</Text>
          <View style={styles.panelHeaderLine} />
        </View>
        <View style={styles.disasterGrid}>
          {DISASTER_TIPS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.disasterCard,
                { borderLeftColor: item.color },
                expandedDisaster === index && styles.disasterCardExpanded,
              ]}
              onPress={() => setExpandedDisaster(expandedDisaster === index ? null : index)}
            >
              <View style={styles.disasterCardTop}>
                <View style={[styles.disasterIconBox, { backgroundColor: item.color + "22" }]}>
                  <Text style={styles.disasterIcon}>{item.icon}</Text>
                </View>
                <Text style={[styles.disasterLabel, { color: item.color }]}>{item.label}</Text>
                <Text style={styles.disasterArrow}>
                  {expandedDisaster === index ? "▲" : "▼"}
                </Text>
              </View>
              {expandedDisaster === index && (
                <Text style={styles.disasterTip}>{item.tip}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* PANEL 3 — PREPAREDNESS TIPS */}
        <View style={styles.panelHeader}>
          <View style={styles.panelHeaderLine} />
          <Text style={styles.panelTitle}>🛡 Preparedness Tips</Text>
          <View style={styles.panelHeaderLine} />
        </View>
        {PREPAREDNESS_TIPS.map((tip, index) => (
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

      {/* BOTTOM NAV */}
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
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
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
  alertButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 10, borderRadius: 10,
    alignItems: "center", marginTop: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.4)",
  },
  alertButtonText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
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
  panelHeader: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 20, marginBottom: 15, marginTop: 5, gap: 10,
  },
  panelHeaderLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  panelTitle: {
    fontSize: 15, fontWeight: "bold",
    color: COLORS.textDark, paddingHorizontal: 5,
  },
  quickGrid: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: 20, gap: 10, marginBottom: 25,
  },
  quickCard: {
    width: "22%", borderRadius: 15,
    padding: 12, alignItems: "center",
    elevation: 3, shadowColor: "#000",
    shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  quickIcon: { fontSize: 26, marginBottom: 5 },
  quickLabel: { fontSize: 10, fontWeight: "bold", color: "#fff", textAlign: "center" },
  disasterGrid: { paddingHorizontal: 20, marginBottom: 25 },
  disasterCard: {
    backgroundColor: "#fff", borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderLeftWidth: 5, borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2, shadowColor: "#000",
    shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  disasterCardExpanded: { backgroundColor: "#fafafa" },
  disasterCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  disasterIconBox: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  disasterIcon: { fontSize: 22 },
  disasterLabel: { flex: 1, fontWeight: "bold", fontSize: 15 },
  disasterArrow: { color: COLORS.textLight, fontSize: 12 },
  disasterTip: {
    color: COLORS.textMid, fontSize: 13,
    lineHeight: 20, marginTop: 10,
    paddingTop: 10, borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
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
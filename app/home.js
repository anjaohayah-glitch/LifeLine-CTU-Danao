// app/home.js
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as BackgroundFetch from "expo-background-fetch";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import * as TaskManager from "expo-task-manager";
import { limitToLast, onValue, push, query, ref, set } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
  useWindowDimensions,
} from "react-native";
import { COLORS } from "../constants/colors";
import { useSettings } from "../context/SettingsContext";
import { auth, db } from "../firebase";
import { useAdmin } from "../hooks/useAdmin";

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
  { icon: "home", labelKey: "home", route: "/home" },
  { icon: "map", labelKey: "evacuate", route: "/evacuation" },
  { icon: "call", labelKey: "hotlines", route: "/hotlines" },
  { icon: "partly-sunny", labelKey: "weather", route: "/weather" },
  { icon: "person", labelKey: "profile", route: "/profile" },
];

const QUICK_ACCESS = [
  { icon: "shield-account", labelKey: "admin", route: "/admin", color: "#7F0000", adminOnly: true },
  { icon: "medical-bag", labelKey: "first_aid", route: "/firstaid", color: "#C62828" },
  { icon: "book-open-page-variant", labelKey: "guides", route: "/guides", color: "#00695C" },
  { icon: "clipboard-check", labelKey: "checklist", route: "/checklist", color: "#00838F" },
  { icon: "account-group", labelKey: "family_title", route: "/family", color: "#6A1B9A" },
  { icon: "shield-alert", labelKey: "drrm", route: "/drrm", color: "#B00020" },
  { icon: "account-voice", labelKey: "voice", route: "/voiceguide", color: "#1565C0" },
  { icon: "cog", labelKey: "settings", route: "/settings", color: "#37474F" },
];

const DISASTER_TIPS = [
  { icon: "home-flood", labelKey: "flood", color: "#1565C0", bg: "#E3F2FD", darkBg: "#0d1f35", tipKey: "flood_tip" },
  { icon: "earth", labelKey: "earthquake", color: "#4527A0", bg: "#EDE7F6", darkBg: "#1a1035", tipKey: "earthquake_tip" },
  { icon: "weather-hurricane", labelKey: "typhoon", color: "#00695C", bg: "#E0F2F1", darkBg: "#0d2520", tipKey: "typhoon_tip" },
  { icon: "fire", labelKey: "fire", color: "#E65100", bg: "#FBE9E7", darkBg: "#2d1200", tipKey: "fire_tip" },
];

const PREPAREDNESS_TIPS = [
  { icon: "bag-personal", labelKey: "go_bag", descKey: "go_bag_desc", color: "#B00020" },
  { icon: "account-group", labelKey: "family_plan", descKey: "family_plan_desc", color: "#1565C0" },
  { icon: "heart-pulse", labelKey: "first_aid", descKey: "first_aid_desc", color: "#2E7D32" },
  { icon: "map-marker-radius", labelKey: "know_routes", descKey: "know_routes_desc", color: "#6A1B9A" },
];

export default function Home() {
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [announcement, setAnnouncement] = useState(null);
  const [activeNav, setActiveNav] = useState("/home");
  const [isOnline] = useState(true);
  const [expandedDisaster, setExpandedDisaster] = useState(null);
  const [isSafe, setIsSafe] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const { isAdmin } = useAdmin();
  const router = useRouter();
  const { theme, t } = useSettings();
  const { bg, card, border, textDark, textLight } = theme;
  const isDark = theme.bg === "#121212";
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 360 ? 16 : 20;
  const quickColumns = width < 360 ? 3 : 4;
  const quickGap = 10;
  const quickCardWidth = Math.floor((width - (horizontalPadding * 2) - (quickGap * (quickColumns - 1))) / quickColumns);
  const scrollY = useRef(new Animated.Value(0)).current;
  const floatingHeaderOpacity = scrollY.interpolate({
    inputRange: [70, 120],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const floatingHeaderTranslateY = scrollY.interpolate({
    inputRange: [70, 120],
    outputRange: [-28, 0],
    extrapolate: "clamp",
  });

  const FEATURE_CARDS = QUICK_ACCESS.filter((item) => !item.adminOnly || isAdmin);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Background fetch
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

  // Firebase listeners
  useEffect(() => {
    return setupListeners();
  }, []);

  const setupListeners = () => {
    const alertRef = ref(db, "emergencyAlert");
    const annRef = ref(db, "announcement");
    const sosRef = query(ref(db, "sosRequests"), limitToLast(1));

    const unsubAlert = onValue(alertRef, (snap) => {
      const data = snap.val();
      if (data) {
        setAlertVisible(data.active === true);
        setAlertMessage(data.message);
      }
    });
    const unsubAnn = onValue(annRef, (snap) => setAnnouncement(snap.val()));
    const unsubSos = onValue(sosRef, (snapshot) => {
      if (snapshot.exists()) {
        const details = Object.values(snapshot.val())[0];
        if (details.uid !== auth.currentUser?.uid) Vibration.vibrate([500, 300, 500]);
      }
    });

    return () => { unsubAlert(); unsubAnn(); unsubSos(); };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleEmergencyCall = () => {
    Haptics.selectionAsync();
    Linking.openURL("tel:911");
  };

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
    if (!isOnline) { Alert.alert(t("offline"), "Internet required for SOS."); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Send SOS Alert",
      "This will broadcast your live location to ALL contacts and admin.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "YES, SEND SOS",
          style: "destructive",
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
              } catch (_e) {}
              const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
              const senderName = auth.currentUser?.displayName || auth.currentUser?.email;
              const timestamp = Date.now();

              await set(ref(db, `sosRequests/${timestamp}`), {
                uid: auth.currentUser?.uid,
                name: senderName,
                email: auth.currentUser?.email,
                latitude, longitude,
                address: locationText,
                locationUrl,
                timestamp: new Date().toISOString(),
              });
              await set(ref(db, `safetyStatus/${auth.currentUser?.uid}`), {
                status: "help",
                message: "I need help!",
                timestamp, name: senderName,
                location: locationText,
              });
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
                      text: `SOS ALERT!\n\n${senderName} NEEDS HELP!\n\n${locationText}\n\nTap to navigate:\n${locationUrl}`,
                      timestamp,
                      type: "sos",
                    });
                  }
                }
              }, { onlyOnce: true });

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("SOS Sent!", "All contacts notified\nAdmin notified\n\nStay calm. Help is on the way!");
            } catch (e) { Alert.alert("Error", e.message); }
          },
        },
      ]
    );
  };

  const formatTime = (date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDate = (date) => date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const getGreeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return t("good_morning");
    if (h < 17) return t("good_afternoon");
    return t("good_evening");
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: bg }]}>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.floatingHeader,
          {
            opacity: floatingHeaderOpacity,
            transform: [{ translateY: floatingHeaderTranslateY }],
          },
        ]}
      >
        <View style={styles.floatingHeaderTop}>
          <View style={styles.floatingHeaderTextBlock}>
            <Text style={styles.floatingHeaderTitle}>LIFELINE</Text>
            <Text style={styles.floatingHeaderDate} numberOfLines={1}>{formatDate(currentTime)}</Text>
          </View>
          <Text style={styles.floatingHeaderTime}>{formatTime(currentTime)}</Text>
          <TouchableOpacity style={styles.floatingSosButton} onPress={handleSOS} activeOpacity={0.85}>
            <Ionicons name="warning" size={16} color={COLORS.primary} />
            <Text style={styles.floatingSosButtonText}>SOS</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ── HEADER ─────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerGreeting}>{getGreeting()}</Text>
              <Text style={styles.headerTitle}>LIFELINE</Text>
              <Text style={styles.headerSub}>{t("ctu_drrmo_system")}</Text>
            </View>
            <TouchableOpacity style={styles.sosButton} onPress={handleSOS}>
              <Ionicons name="warning" size={18} color={COLORS.primary} />
              <Text style={styles.sosButtonText}>SOS</Text>
            </TouchableOpacity>
          </View>

          {/* Clock */}
          <View style={styles.clockRow}>
            <Text style={styles.clockTime}>{formatTime(currentTime)}</Text>
            <Text style={styles.clockDate}>{formatDate(currentTime)}</Text>
          </View>

        </View>

        {/* ── STATUS CARD ────────────────────────────── */}
        <View style={[styles.statusCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.statusCardLeft}>
            <Text style={[styles.statusCardLabel, { color: textLight }]}>{t("your_status")}</Text>
            <Text style={[styles.statusCardName, { color: textDark }]} numberOfLines={1}>
              {auth.currentUser?.displayName || t("student")}
            </Text>
            <View style={styles.statusBadgeRow}>
              <View style={[styles.statusPulseDot, { backgroundColor: isSafe ? "#4CAF50" : "#FF9800" }]} />
              <Text style={[styles.statusBadgeText, { color: isSafe ? "#4CAF50" : "#FF9800" }]}>
                {isSafe ? t("marked_safe") : t("status_unknown")}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.safeButton, { backgroundColor: isSafe ? "#4CAF50" : COLORS.primary }]}
            onPress={handleCheckIn}
          >
            <Ionicons name={isSafe ? "checkmark-circle" : "help-circle"} size={24} color="#fff" />
            <Text style={styles.safeButtonLabel}>{isSafe ? t("safe") : t("mark_safe")}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.emergencyQuickCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.emergencyQuickHeader}>
            <View>
              <Text style={[styles.emergencyQuickTitle, { color: textDark }]}>{t("emergency_quick_access")}</Text>
              <Text style={[styles.emergencyQuickSub, { color: textLight }]}>{t("immediate_help")}</Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>{t("active")}</Text>
            </View>
          </View>
          <View style={styles.emergencyActions}>
            <TouchableOpacity
              style={[styles.emergencyActionButton, styles.sosActionButton]}
              onPress={handleSOS}
              activeOpacity={0.86}
            >
              <Ionicons name="warning" size={20} color="#fff" />
              <Text style={styles.emergencyActionText}>SOS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emergencyActionButton, styles.callActionButton]}
              onPress={handleEmergencyCall}
              activeOpacity={0.86}
            >
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={styles.emergencyActionText}>{t("call_911")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emergencyActionButton, styles.hotlineActionButton]}
              onPress={() => router.push("/hotlines")}
              activeOpacity={0.86}
            >
              <Ionicons name="list" size={20} color="#fff" />
              <Text style={styles.emergencyActionText}>{t("hotlines")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── EMERGENCY ALERT ────────────────────────── */}
        {alertVisible && (
          <View style={styles.alertCard}>
            <View style={styles.alertTop}>
              <View style={styles.alertBadge}>
                <Ionicons name="warning" size={12} color="#fff" />
                <Text style={styles.alertBadgeText}>{t("emergency_active")}</Text>
              </View>
            </View>
            <View style={styles.alertTitleRow}>
              <MaterialCommunityIcons name="alarm-light" size={18} color="#fff" />
              <Text style={styles.alertTitle}>{t("emergency_alert")}</Text>
            </View>
            <Text style={styles.alertMessage}>{alertMessage}</Text>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => router.push("/evacuation")}
            >
              <Text style={styles.alertButtonText}>{t("view_evacuation_centers")}</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── ANNOUNCEMENT ───────────────────────────── */}
        {announcement?.message && (
          <View style={[styles.announcementCard, { backgroundColor: card, borderColor: border }]}>
            <View style={[styles.announcementAccent, { backgroundColor: COLORS.primary }]} />
            <Ionicons name="megaphone" size={26} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.announcementLabel, { color: textLight }]}>{t("drrmo_announcement")}</Text>
              <Text style={[styles.announcementText, { color: textDark }]}>{announcement.message}</Text>
            </View>
          </View>
        )}

        {/* ── QUICK ACCESS ───────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textDark }]}>{t("quick_access")}</Text>
          <Text style={[styles.sectionSub, { color: textLight }]}>{t("all_features")}</Text>
        </View>

        <View style={[styles.quickGrid, { paddingHorizontal: horizontalPadding, gap: quickGap }]}>
          {FEATURE_CARDS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickCard, { backgroundColor: item.color, width: quickCardWidth }]}
              onPress={() => { Haptics.selectionAsync(); router.push(item.route); }}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name={item.icon} size={26} color="#fff" style={{ marginBottom: 6 }} />
              <Text style={styles.quickLabel}>{t(item.labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── DISASTER TIPS ──────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textDark }]}>{t("disaster_tips")}</Text>
          <Text style={[styles.sectionSub, { color: textLight }]}>{t("tap_to_expand")}</Text>
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
                  <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
                </View>
                <View style={styles.disasterContent}>
                  <Text style={[styles.disasterLabel, { color: item.color }]}>{t(item.labelKey)}</Text>
                  <Text style={[styles.disasterSubLabel, { color: textLight }]}>
                    {expandedDisaster === index ? t("tap_to_collapse") : t("tap_for_quick_tip")}
                  </Text>
                </View>
                <Ionicons
                  name={expandedDisaster === index ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={textLight}
                />
              </TouchableOpacity>

              {expandedDisaster === index && (
                <View style={[styles.expandedTip, { backgroundColor: isDark ? item.darkBg : item.bg }]}>
                  <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
                  <Text style={[styles.expandedTipText, { color: item.color }]}>{t(item.tipKey)}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* ── PREPAREDNESS TIPS ──────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textDark }]}>{t("stay_prepared")}</Text>
          <Text style={[styles.sectionSub, { color: textLight }]}>{t("always_ready")}</Text>
        </View>

        <View style={[styles.prepGrid, { marginHorizontal: 20 }]}>
          {PREPAREDNESS_TIPS.map((item, index) => (
            <View key={index} style={[styles.prepCard, { backgroundColor: card, borderColor: border }]}>
              <View style={[styles.prepIconBg, { backgroundColor: item.color + "18" }]}>
                <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={[styles.prepLabel, { color: textDark }]}>{t(item.labelKey)}</Text>
              <Text style={[styles.prepDesc, { color: textLight }]}>{t(item.descKey)}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

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
              <Ionicons
                name={item.icon}
                size={22}
                color={activeNav === item.route ? COLORS.primary : textLight}
              />
            </View>
            <Text style={[
              styles.navLabel,
              { color: textLight },
              activeNav === item.route && { color: COLORS.primary, fontWeight: "bold" },
            ]}>
              {t(item.labelKey)}
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
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    elevation: 30,
    backgroundColor: COLORS.primary,
    paddingTop: 44,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 12,
  },
  floatingHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  floatingHeaderTextBlock: { flex: 1 },
  floatingHeaderTitle: { color: "#fff", fontSize: 22, fontWeight: "bold", letterSpacing: 2 },
  floatingHeaderDate: { color: "rgba(255,255,255,0.72)", fontSize: 11, marginTop: 1 },
  floatingHeaderTime: { color: "#fff", fontSize: 24, fontWeight: "300", letterSpacing: 1 },
  floatingSosButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 56,
  },
  floatingSosButtonText: { color: COLORS.primary, fontWeight: "bold", fontSize: 11, marginTop: 1 },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 55, paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 16, gap: 12,
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
  sosButtonText: { color: COLORS.primary, fontWeight: "bold", fontSize: 12, marginTop: 2 },
  clockRow: { marginBottom: 16 },
  clockTime: { color: "#fff", fontSize: 42, fontWeight: "200", letterSpacing: 2 },
  clockDate: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },
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
  safeButtonLabel: { color: "#fff", fontSize: 9, fontWeight: "bold", textAlign: "center", marginTop: 2 },
  emergencyQuickCard: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  emergencyQuickHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  emergencyQuickTitle: { fontSize: 15, fontWeight: "bold" },
  emergencyQuickSub: { fontSize: 11, marginTop: 2 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(46,125,50,0.12)",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#2E7D32" },
  liveBadgeText: { color: "#2E7D32", fontSize: 10, fontWeight: "bold" },
  emergencyActions: { flexDirection: "row", gap: 8 },
  emergencyActionButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  sosActionButton: { backgroundColor: "#B00020" },
  callActionButton: { backgroundColor: "#C62828" },
  hotlineActionButton: { backgroundColor: "#1565C0" },
  emergencyActionText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 4,
  },
  alertCard: {
    backgroundColor: "#B00020",
    marginHorizontal: 20, marginTop: 16,
    borderRadius: 20, padding: 18,
    borderWidth: 1.5, borderColor: "#FF5252", elevation: 6,
  },
  alertTop: { marginBottom: 10 },
  alertBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20, paddingHorizontal: 10,
    paddingVertical: 4, alignSelf: "flex-start",
  },
  alertBadgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  alertTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  alertTitle: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  alertMessage: { color: "rgba(255,255,255,0.9)", fontSize: 13, lineHeight: 20, marginBottom: 14 },
  alertButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10, padding: 10,
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
  },
  alertButtonText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  announcementCard: {
    marginHorizontal: 20, marginTop: 12,
    borderRadius: 16, padding: 14,
    flexDirection: "row", alignItems: "center",
    gap: 12, borderWidth: 1, overflow: "hidden",
  },
  announcementAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  announcementLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 3 },
  announcementText: { fontSize: 13, lineHeight: 18 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20, marginTop: 28, marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: "bold" },
  sectionSub: { fontSize: 12 },
  quickGrid: {
    flexDirection: "row", flexWrap: "wrap",
  },
  quickCard: {
    borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 8,
    alignItems: "center", elevation: 3,
    shadowColor: "#000", shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 }, shadowRadius: 5,
  },
  quickLabel: { fontSize: 10, fontWeight: "bold", color: "#fff", textAlign: "center" },
  disasterGrid: { paddingHorizontal: 20, gap: 8 },
  disasterCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 16, padding: 14, gap: 14,
    borderWidth: 1, elevation: 1,
  },
  disasterIconBg: {
    width: 46, height: 46, borderRadius: 13,
    justifyContent: "center", alignItems: "center",
  },
  disasterContent: { flex: 1 },
  disasterLabel: { fontWeight: "bold", fontSize: 14 },
  disasterSubLabel: { fontSize: 11, marginTop: 2 },
  expandedTip: {
    borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
    padding: 14, flexDirection: "row",
    gap: 10, alignItems: "flex-start", marginTop: -4,
  },
  expandedTipText: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: "500" },
  prepGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  prepCard: {
    width: "47%", borderRadius: 16, padding: 14,
    borderWidth: 1, elevation: 2,
  },
  prepIconBg: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: "center", alignItems: "center", marginBottom: 8,
  },
  prepLabel: { fontWeight: "bold", fontSize: 13, marginBottom: 4 },
  prepDesc: { fontSize: 11, lineHeight: 16 },
  bottomNav: {
    flexDirection: "row", borderTopWidth: 1,
    paddingBottom: 28, paddingTop: 12,
    position: "absolute", bottom: 0, left: 0, right: 0,
    elevation: 20, shadowColor: "#000",
    shadowOpacity: 0.08, shadowOffset: { width: 0, height: -2 },
  },
  navItem: { flex: 1, alignItems: "center" },
  navIconWrap: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 3 },
  navLabel: { fontSize: 10 },
  navActiveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, marginTop: 3 },
});

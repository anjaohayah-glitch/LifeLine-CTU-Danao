// app/home.js
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as BackgroundFetch from "expo-background-fetch";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { useRouter } from "expo-router";
import * as TaskManager from "expo-task-manager";
import { limitToLast, onValue, push, query, ref, set } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
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
  { icon: "mic-circle", labelKey: "voice", route: "/voiceguide", center: true },
  { icon: "partly-sunny", labelKey: "weather", route: "/weather" },
  { icon: "person", labelKey: "profile", route: "/profile" },
];

const QUICK_ACCESS = [
  { icon: "shield-account", labelKey: "admin", route: "/admin", adminOnly: true },
  { icon: "medical-bag", labelKey: "first_aid", route: "/firstaid" },
  { icon: "book-open-page-variant", labelKey: "guides", route: "/guides" },
  { icon: "clipboard-check", labelKey: "checklist", route: "/checklist" },
  { icon: "account-group", labelKey: "family_title", route: "/family" },
  { icon: "shield-alert", labelKey: "drrm", route: "/drrm" },
  { icon: "account-voice", labelKey: "voice", route: "/voiceguide" },
  { icon: "gamepad-variant", labelKey: "game", route: "/game" },
  { icon: "cog", labelKey: "settings", route: "/settings" },
];

const DISASTER_TIPS = [
  { icon: "home-flood", labelKey: "flood", color: COLORS.primary, bg: "#F7F7F7", darkBg: "#1e1e1e", tipKey: "flood_tip" },
  { icon: "earth", labelKey: "earthquake", color: COLORS.primary, bg: "#F7F7F7", darkBg: "#1e1e1e", tipKey: "earthquake_tip" },
  { icon: "weather-hurricane", labelKey: "typhoon", color: COLORS.primary, bg: "#F7F7F7", darkBg: "#1e1e1e", tipKey: "typhoon_tip" },
  { icon: "fire", labelKey: "fire", color: COLORS.primary, bg: "#F7F7F7", darkBg: "#1e1e1e", tipKey: "fire_tip" },
];

const PREPAREDNESS_TIPS = [
  { icon: "bag-personal", labelKey: "go_bag", descKey: "go_bag_desc", color: "#B00020" },
  { icon: "account-group", labelKey: "family_plan", descKey: "family_plan_desc", color: "#555555" },
  { icon: "heart-pulse", labelKey: "first_aid", descKey: "first_aid_desc", color: "#555555" },
  { icon: "map-marker-radius", labelKey: "know_routes", descKey: "know_routes_desc", color: "#555555" },
];

const LANGUAGE_OPTIONS = [
  { key: "en", code: "EN", label: "English" },
  { key: "ceb", code: "CEB", label: "Cebuano" },
  { key: "fil", code: "FIL", label: "Tagalog" },
];

const VA_QUICK_QUESTIONS = [
  "What should I do during an earthquake?",
  "What should I pack in a go bag?",
  "What should I do during a flood?",
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
  const [vaVisible, setVaVisible] = useState(false);
  const [vaListening, setVaListening] = useState(false);
  const [vaQuestion, setVaQuestion] = useState("");
  const [vaAnswer, setVaAnswer] = useState("Tap the microphone and ask me a safety question. I will answer aloud.");
  const { isAdmin } = useAdmin();
  const router = useRouter();
  const { language, updateLanguage, theme, t, voiceSpeed } = useSettings();
  const { bg, card, border, textDark, textLight } = theme;
  const isDark = theme.bg === "#121212";
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 360 ? 16 : 20;
  const quickColumns = width < 360 ? 3 : 4;
  const quickGap = 10;
  const quickCardWidth = Math.floor((width - (horizontalPadding * 2) - (quickGap * (quickColumns - 1))) / quickColumns);
  const scrollY = useRef(new Animated.Value(0)).current;
  const speechRecognitionRef = useRef(null);
  const speechSubscriptionsRef = useRef([]);
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

  useEffect(() => () => {
    speechSubscriptionsRef.current.forEach((sub) => sub.remove?.());
    speechRecognitionRef.current?.stop?.();
    Speech.stop();
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

  const speakTip = (text) => {
    Speech.stop();
    const langCode = language === "en" ? "en-US" : "fil-PH";
    const rate = voiceSpeed === "slow" ? 0.72 : voiceSpeed === "fast" ? 1.0 : 0.85;
    Speech.speak(text, { language: langCode, rate, pitch: 1.0 });
  };

  const speakVA = (text) => {
    Speech.stop();
    const langCode = language === "en" ? "en-US" : "fil-PH";
    const rate = voiceSpeed === "slow" ? 0.72 : voiceSpeed === "fast" ? 1.0 : 0.85;
    Speech.speak(text, { language: langCode, rate, pitch: 1.0 });
  };

  const getVAAnswer = (question) => {
    const q = question.toLowerCase();

    if (q.includes("earthquake") || q.includes("linog") || q.includes("lindol") || q.includes("shake")) {
      return "During an earthquake, drop to the ground, cover your head and neck under sturdy furniture, and hold on until shaking stops. Stay away from windows.";
    }
    if (q.includes("go bag") || q.includes("kit") || q.includes("pack")) {
      return "Pack water, ready-to-eat food, flashlight, batteries, first aid kit, whistle, power bank, IDs, cash, medicine, masks, clothes, and important documents.";
    }
    if (q.includes("flood") || q.includes("baha")) {
      return "During a flood, move to higher ground, avoid walking or driving through floodwater, unplug appliances if safe, and follow evacuation orders.";
    }
    if (q.includes("fire") || q.includes("sunog") || q.includes("smoke")) {
      return "During a fire, evacuate using stairs, stay low under smoke, never use elevators, and call emergency responders once you are safe.";
    }
    if (q.includes("typhoon") || q.includes("bagyo") || q.includes("storm")) {
      return "During a typhoon, stay indoors, keep away from windows, charge your phone and power bank, prepare supplies, and monitor official updates.";
    }
    if (q.includes("first aid") || q.includes("bleed") || q.includes("wound") || q.includes("burn")) {
      return "For first aid, keep the person calm. Apply firm pressure to bleeding, cool minor burns with running water, and call trained responders for serious injuries.";
    }
    if (q.includes("evacuate") || q.includes("evacuation") || q.includes("route")) {
      return "For evacuation, bring your go bag, follow official routes, avoid danger zones, help children and injured people, and check in with family after reaching safety.";
    }
    if (q.includes("sos") || q.includes("help") || q.includes("emergency")) {
      return "If you need urgent help, use the SOS button or call 911. Share your location and stay in the safest nearby place while waiting for responders.";
    }

    return "I can answer questions about earthquakes, floods, fire, typhoons, first aid, go bags, evacuation, and SOS. Try asking about one of those topics.";
  };

  const answerVAQuestion = (question = vaQuestion) => {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) {
      speakVA(vaAnswer);
      return;
    }

    const answer = getVAAnswer(cleanQuestion);
    setVaQuestion(cleanQuestion);
    setVaAnswer(answer);
    speakVA(answer);
  };

  const getSpeechRecognitionModule = () => {
    if (speechRecognitionRef.current) return speechRecognitionRef.current;
    if (Constants.appOwnership === "expo") return null;

    try {
      const { ExpoSpeechRecognitionModule } = require("expo-speech-recognition");
      speechRecognitionRef.current = ExpoSpeechRecognitionModule;
      return ExpoSpeechRecognitionModule;
    } catch (error) {
      console.log("Speech recognition unavailable:", error?.message);
      return null;
    }
  };

  const attachSpeechRecognitionListeners = (module) => {
    speechSubscriptionsRef.current.forEach((sub) => sub.remove?.());
    speechSubscriptionsRef.current = [
      module.addListener("start", () => setVaListening(true)),
      module.addListener("end", () => setVaListening(false)),
      module.addListener("result", (event) => {
        const transcript = event.results[0]?.transcript || "";
        if (!transcript) return;
        setVaQuestion(transcript);
        if (event.isFinal) {
          answerVAQuestion(transcript);
        }
      }),
      module.addListener("error", (event) => {
        setVaListening(false);
        const message = event.error === "no-speech"
          ? "I did not hear anything. Tap the microphone and try again."
          : "I could not use the microphone. You can type your question instead.";
        setVaAnswer(message);
        speakVA(message);
      }),
    ];
  };

  const openVA = () => {
    Haptics.selectionAsync();
    setVaVisible(true);
    const greeting = "Hi, I am Lifeline VA. Tap and hold nothing, just press the microphone once, speak your question, and I will answer here.";
    setVaAnswer(greeting);
    speakVA(greeting);
  };

  const closeVA = () => {
    speechRecognitionRef.current?.stop?.();
    Speech.stop();
    setVaListening(false);
    setVaVisible(false);
  };

  const startVAListening = async () => {
    Haptics.selectionAsync();
    Speech.stop();
    setVaQuestion("");
    const speechModule = getSpeechRecognitionModule();
    if (!speechModule) {
      const message = "Voice listening is not available in Expo Go. Type your question here, or use a custom development build to enable the microphone.";
      setVaAnswer(message);
      speakVA(message);
      return;
    }

    setVaAnswer("Listening...");

    attachSpeechRecognitionListeners(speechModule);

    const result = await speechModule.requestPermissionsAsync();
    if (!result.granted) {
      const message = "Microphone permission is needed for voice questions. You can still type your question.";
      setVaAnswer(message);
      speakVA(message);
      return;
    }

    speechModule.start({
      lang: language === "en" ? "en-US" : "fil-PH",
      interimResults: true,
      continuous: false,
    });
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
        <View style={[styles.languageCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.languageCardHeader}>
            <MaterialCommunityIcons name="translate" size={19} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.languageTitle, { color: textDark }]}>{t("language_label")}</Text>
              <Text style={[styles.languageSub, { color: textLight }]}>{t("easy_language_access")}</Text>
            </View>
          </View>
          <View style={styles.languageButtons}>
            {LANGUAGE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.languageButton,
                  { borderColor: border, backgroundColor: theme.surface },
                  language === option.key && styles.languageButtonActive,
                ]}
                onPress={() => updateLanguage(option.key)}
                accessibilityRole="button"
                accessibilityLabel={`Switch language to ${option.label}`}
              >
                <Text style={[styles.languageCode, language === option.key && styles.languageCodeActive]}>
                  {option.code}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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
            accessibilityRole="button"
            accessibilityLabel={isSafe ? t("marked_safe") : t("mark_safe").replace("\n", " ")}
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
              accessibilityRole="button"
              accessibilityLabel="Send SOS alert"
            >
              <Ionicons name="warning" size={20} color="#fff" />
              <Text style={styles.emergencyActionText}>SOS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emergencyActionButton, styles.callActionButton]}
              onPress={handleEmergencyCall}
              activeOpacity={0.86}
              accessibilityRole="button"
              accessibilityLabel={t("call_911")}
            >
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={styles.emergencyActionText}>{t("call_911")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emergencyActionButton, styles.hotlineActionButton]}
              onPress={() => router.push("/hotlines")}
              activeOpacity={0.86}
              accessibilityRole="button"
              accessibilityLabel={t("emergency_hotlines")}
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
              style={[styles.quickCard, { backgroundColor: card, borderColor: border, width: quickCardWidth }]}
              onPress={() => { Haptics.selectionAsync(); router.push(item.route); }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${t(item.labelKey)}. ${t("tap_to_open")}`}
            >
              <MaterialCommunityIcons name={item.icon} size={24} color={COLORS.primary} style={{ marginBottom: 6 }} />
              <Text style={[styles.quickLabel, { color: textDark }]}>{t(item.labelKey)}</Text>
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
                  <TouchableOpacity
                    style={styles.listenTipButton}
                    onPress={() => speakTip(t(item.tipKey))}
                    accessibilityRole="button"
                    accessibilityLabel={`${t("listen")}: ${t(item.labelKey)}`}
                  >
                    <Ionicons name="volume-high" size={16} color="#fff" />
                  </TouchableOpacity>
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
      <Modal visible={vaVisible} transparent animationType="fade" onRequestClose={closeVA}>
        <View style={styles.vaOverlay}>
          <View style={[styles.vaPanel, { backgroundColor: card, borderColor: border }]}>
            <View style={styles.vaHeader}>
              <View style={[styles.vaAvatar, { backgroundColor: theme.surface }]}>
                <MaterialCommunityIcons name="account-voice" size={30} color={COLORS.primary} />
              </View>
              <View style={styles.vaHeaderText}>
                <Text style={[styles.vaTitle, { color: textDark }]}>Lifeline VA</Text>
                <Text style={[styles.vaSub, { color: textLight }]}>
                  {vaListening ? "Listening now..." : "Ask by voice without leaving Home"}
                </Text>
              </View>
              <TouchableOpacity style={[styles.vaCloseButton, { backgroundColor: theme.surface }]} onPress={closeVA}>
                <Ionicons name="close" size={20} color={textDark} />
              </TouchableOpacity>
            </View>

            <View style={[styles.vaBubble, { backgroundColor: theme.surface }]}>
              <Text style={[styles.vaBubbleLabel, { color: textLight }]}>VA ANSWER</Text>
              <Text style={[styles.vaAnswerText, { color: textDark }]}>{vaAnswer}</Text>
            </View>

            {!!vaQuestion && (
              <View style={[styles.vaQuestionBubble, { borderColor: border }]}>
                <Text style={[styles.vaBubbleLabel, { color: textLight }]}>YOU ASKED</Text>
                <Text style={[styles.vaQuestionText, { color: textDark }]}>{vaQuestion}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.vaMicButton, vaListening && styles.vaMicButtonListening]}
              onPress={vaListening ? () => speechRecognitionRef.current?.stop?.() : startVAListening}
              activeOpacity={0.86}
            >
              <Ionicons name={vaListening ? "stop" : "mic"} size={34} color="#fff" />
              <Text style={styles.vaMicText}>{vaListening ? "Stop listening" : "Tap to speak"}</Text>
            </TouchableOpacity>

            <View style={[styles.vaInputRow, { backgroundColor: theme.surface, borderColor: border }]}>
              <TextInput
                style={[styles.vaInput, { color: textDark }]}
                value={vaQuestion}
                onChangeText={setVaQuestion}
                placeholder="Or type a question..."
                placeholderTextColor={textLight}
                returnKeyType="send"
                onSubmitEditing={() => answerVAQuestion()}
              />
              <TouchableOpacity style={styles.vaSendButton} onPress={() => answerVAQuestion()}>
                <Ionicons name="send" size={17} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.vaQuickRow}>
              {VA_QUICK_QUESTIONS.map((question) => (
                <TouchableOpacity
                  key={question}
                  style={[styles.vaQuickChip, { backgroundColor: theme.surface, borderColor: border }]}
                  onPress={() => answerVAQuestion(question)}
                >
                  <Text style={[styles.vaQuickText, { color: textDark }]}>{question}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <View style={[styles.bottomNav, { backgroundColor: card, borderColor: border }]}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={[styles.navItem, item.center && styles.centerNavItem]}
            onPress={() => {
              if (item.center) {
                openVA();
                return;
              }
              Haptics.selectionAsync();
              setActiveNav(item.route);
              router.push(item.route);
            }}
          >
            <View style={[
              item.center ? styles.centerNavIconWrap : styles.navIconWrap,
              activeNav === item.route && { backgroundColor: COLORS.primary + "18" },
              item.center && { backgroundColor: COLORS.primary },
            ]}>
              <Ionicons
                name={item.icon}
                size={item.center ? 32 : 22}
                color={item.center ? "#fff" : activeNav === item.route ? COLORS.primary : textLight}
              />
            </View>
            <Text style={[
              item.center ? styles.centerNavLabel : styles.navLabel,
              { color: textLight },
              activeNav === item.route && { color: COLORS.primary, fontWeight: "bold" },
              item.center && { color: COLORS.primary, fontWeight: "bold" },
            ]}>
              {t(item.labelKey)}
            </Text>
            {activeNav === item.route && !item.center && <View style={styles.navActiveDot} />}
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
    elevation: 8,
    backgroundColor: COLORS.primary,
    paddingTop: 44,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
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
  floatingHeaderTitle: { color: "#fff", fontSize: 22, fontWeight: "bold", letterSpacing: 0 },
  floatingHeaderDate: { color: "rgba(255,255,255,0.72)", fontSize: 11, marginTop: 1 },
  floatingHeaderTime: { color: "#fff", fontSize: 24, fontWeight: "300", letterSpacing: 0 },
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
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 16, gap: 12,
  },
  headerGreeting: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginBottom: 2 },
  headerTitle: { color: "#fff", fontSize: 32, fontWeight: "bold", letterSpacing: 0 },
  headerSub: { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 2 },
  sosButton: {
    backgroundColor: "#fff", borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 10,
    alignItems: "center", elevation: 1,
    shadowColor: "#000", shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
  },
  sosButtonText: { color: COLORS.primary, fontWeight: "bold", fontSize: 12, marginTop: 2 },
  clockRow: { marginBottom: 16 },
  clockTime: { color: "#fff", fontSize: 42, fontWeight: "200", letterSpacing: 0 },
  clockDate: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },
  languageCard: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  languageCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  languageTitle: { fontSize: 14, fontWeight: "bold" },
  languageSub: { fontSize: 11, marginTop: 2 },
  languageButtons: { flexDirection: "row", gap: 8 },
  languageButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  languageButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  languageCode: { color: COLORS.primary, fontSize: 14, fontWeight: "bold" },
  languageCodeActive: { color: "#fff" },
  statusCard: {
    marginHorizontal: 20, marginTop: 14,
    borderRadius: 14, padding: 18,
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", borderWidth: 1,
    elevation: 1, shadowColor: "#000",
    shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
  },
  statusCardLeft: { flex: 1 },
  statusCardLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0, marginBottom: 4 },
  statusCardName: { fontSize: 18, fontWeight: "bold", marginBottom: 6 },
  statusBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusPulseDot: { width: 7, height: 7, borderRadius: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: "600" },
  safeButton: {
    borderRadius: 16, width: 64, height: 64,
    justifyContent: "center", alignItems: "center", elevation: 1,
  },
  safeButtonLabel: { color: "#fff", fontSize: 9, fontWeight: "bold", textAlign: "center", marginTop: 2 },
  emergencyQuickCard: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
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
  hotlineActionButton: { backgroundColor: "#555555" },
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
    borderWidth: 1, borderColor: "#FF5252", elevation: 1,
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
  announcementLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0, marginBottom: 3 },
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
    borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 8,
    alignItems: "center", elevation: 0,
    borderWidth: 1,
    shadowColor: "#000", shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 0,
  },
  quickLabel: { fontSize: 10, fontWeight: "700", textAlign: "center" },
  disasterGrid: { paddingHorizontal: 20, gap: 8 },
  disasterCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, padding: 14, gap: 14,
    borderWidth: 1, elevation: 0,
  },
  disasterIconBg: {
    width: 42, height: 42, borderRadius: 10,
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
  listenTipButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  prepGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  prepCard: {
    width: "47%", borderRadius: 12, padding: 14,
    borderWidth: 1, elevation: 0,
  },
  prepIconBg: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: "center", alignItems: "center", marginBottom: 8,
  },
  prepLabel: { fontWeight: "bold", fontSize: 13, marginBottom: 4 },
  prepDesc: { fontSize: 11, lineHeight: 16 },
  vaOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    padding: 16,
  },
  vaPanel: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    paddingBottom: 20,
  },
  vaHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  vaAvatar: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  vaHeaderText: { flex: 1 },
  vaTitle: { fontSize: 18, fontWeight: "bold" },
  vaSub: { fontSize: 12, marginTop: 2 },
  vaCloseButton: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  vaBubble: { borderRadius: 14, padding: 14, marginBottom: 10 },
  vaQuestionBubble: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 12 },
  vaBubbleLabel: { fontSize: 10, fontWeight: "800", marginBottom: 5 },
  vaAnswerText: { fontSize: 14, lineHeight: 21 },
  vaQuestionText: { fontSize: 13, lineHeight: 19, fontWeight: "600" },
  vaMicButton: {
    minHeight: 74,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  vaMicButtonListening: { backgroundColor: COLORS.primaryDark },
  vaMicText: { color: "#fff", fontSize: 13, fontWeight: "bold", marginTop: 4 },
  vaInputRow: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
  },
  vaInput: { flex: 1, fontSize: 14, paddingVertical: 10 },
  vaSendButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  vaQuickRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 11 },
  vaQuickChip: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  vaQuickText: { fontSize: 11, fontWeight: "700" },
  bottomNav: {
    flexDirection: "row", borderTopWidth: 1,
    paddingBottom: 28, paddingTop: 12,
    position: "absolute", bottom: 0, left: 0, right: 0,
    elevation: 8, shadowColor: "#000",
    shadowOpacity: 0.04, shadowOffset: { width: 0, height: -2 },
  },
  navItem: { flex: 1, alignItems: "center" },
  centerNavItem: { marginTop: -28 },
  navIconWrap: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 3 },
  centerNavIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    borderWidth: 4,
    borderColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  navLabel: { fontSize: 10 },
  centerNavLabel: { fontSize: 10 },
  navActiveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, marginTop: 3 },
});

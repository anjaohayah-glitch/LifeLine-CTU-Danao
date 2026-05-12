// app/firstaid.js
import { useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useSettings } from "../context/SettingsContext";

const GUIDES = [
  {
    id: 1,
    title: "CPR Guide",
    icon: "heart-pulse",
    color: "#B00020",
    emergency: true,
    category: "critical",
    disclaimer:
      "Educational purposes only. Does not replace professional CPR training. Always call 911 first.",
    steps: [
      { icon: "eye", title: "Check Safety", desc: "Make sure the scene is safe for you and the victim." },
      { icon: "hand-wave", title: "Check Response", desc: "Tap shoulders firmly and shout 'Are you okay?'" },
      { icon: "phone", title: "Call for Help", desc: "Call 911 immediately or ask someone nearby to call." },
      { icon: "lungs", title: "Open Airway", desc: "Tilt head back gently and lift the chin to open airway." },
      { icon: "ear-hearing", title: "Check Breathing", desc: "Look, listen, and feel for breathing — no more than 10 seconds." },
      { icon: "hand-heart", title: "Chest Compressions", desc: "Place heel of hand on center of chest. Push hard and fast — at least 2 inches deep, 100–120 times per minute." },
      { icon: "weather-windy", title: "Rescue Breaths", desc: "Give 2 rescue breaths after every 30 compressions. Pinch nose, cover mouth, breathe until chest rises." },
      { icon: "repeat", title: "Repeat", desc: "Continue 30 compressions + 2 breaths until help arrives or person recovers." },
    ],
  },
  {
    id: 2,
    title: "Wound & Bleeding",
    icon: "blood-bag",
    color: "#C62828",
    emergency: false,
    category: "injury",
    steps: [
      { icon: "hand-wash", title: "Protect Yourself", desc: "Use gloves or a clean plastic bag to avoid contact with blood." },
      { icon: "hand-back-left", title: "Apply Pressure", desc: "Press firmly on the wound with a clean cloth or bandage." },
      { icon: "arrow-up-bold", title: "Elevate", desc: "Raise the injured area above heart level if possible." },
      { icon: "bandage", title: "Bandage", desc: "Once bleeding slows, wrap with a clean bandage firmly but not too tight." },
      { icon: "close-octagon", title: "Don't Remove", desc: "If cloth soaks through, add more on top — do NOT remove the first cloth." },
      { icon: "phone", title: "Seek Help", desc: "If bleeding doesn't stop after 10 minutes, call emergency services." },
    ],
  },
  {
    id: 3,
    title: "Burns Treatment",
    icon: "fire",
    color: "#E65100",
    emergency: false,
    category: "injury",
    steps: [
      { icon: "close-octagon", title: "Stop the Burning", desc: "Remove from heat source. Do NOT use ice — it damages tissue." },
      { icon: "water", title: "Cool the Burn", desc: "Run cool (not cold) water over burn for 10–20 minutes." },
      { icon: "tshirt-crew", title: "Remove Clothing", desc: "Remove clothing and jewelry near the burn — unless stuck to skin." },
      { icon: "bandage", title: "Cover the Burn", desc: "Cover loosely with a clean non-fluffy material like cling film." },
      { icon: "close-octagon", title: "Do NOT", desc: "Do NOT burst blisters or apply toothpaste, butter, or any home remedy." },
      { icon: "phone", title: "Seek Medical Help", desc: "For severe burns, burns on face/hands/feet, or burns larger than your palm — call 911." },
    ],
  },
  {
    id: 4,
    title: "Drowning Response",
    icon: "waves",
    color: "#1565C0",
    emergency: true,
    category: "critical",
    steps: [
      { icon: "phone", title: "Call for Help", desc: "Call 911 immediately. Do not enter water unless trained." },
      { icon: "lifebuoy", title: "Reach or Throw", desc: "Throw a rope, life ring, or extend a pole — do NOT jump in unless trained." },
      { icon: "lungs", title: "Check Breathing", desc: "Once out of water, check if person is breathing." },
      { icon: "heart-pulse", title: "Start CPR", desc: "If not breathing, begin CPR immediately — 30 compressions, 2 breaths." },
      { icon: "sync", title: "Recovery Position", desc: "If breathing, place on side in recovery position to prevent choking." },
      { icon: "hospital-building", title: "Keep Warm", desc: "Cover with blanket to prevent hypothermia while waiting for help." },
    ],
  },
  {
    id: 5,
    title: "Earthquake Injuries",
    icon: "earth",
    color: "#4527A0",
    emergency: false,
    category: "disaster",
    steps: [
      { icon: "check-circle", title: "Ensure Safety", desc: "Wait for shaking to stop before helping others. Watch for aftershocks." },
      { icon: "road-variant", title: "Check for Hazards", desc: "Avoid downed power lines, gas leaks, and unstable structures." },
      { icon: "blood-bag", title: "Control Bleeding", desc: "Apply firm pressure to any wounds with clean cloth immediately." },
      { icon: "bone", title: "Fractures", desc: "Do NOT move victim if spinal injury is suspected. Immobilize broken limbs." },
      { icon: "landslide", title: "Crush Injuries", desc: "Do NOT suddenly release someone trapped for long periods — call medical help first." },
      { icon: "phone", title: "Signal for Help", desc: "Tap on pipes or walls to signal rescuers. Shout only as a last resort to conserve energy." },
    ],
  },
  {
    id: 6,
    title: "Typhoon Injuries",
    icon: "weather-tornado",
    color: "#00695C",
    emergency: false,
    category: "disaster",
    steps: [
      { icon: "home", title: "Stay Inside", desc: "Do not go outside during a typhoon. Stay away from windows and doors." },
      { icon: "water", title: "Flood Wounds", desc: "Clean flood water wounds immediately — floodwater carries dangerous bacteria." },
      { icon: "bandage", title: "Wound Care", desc: "Wash wound with clean water and soap for at least 5 minutes. Cover with bandage." },
      { icon: "safety-vest", title: "Flying Debris Cuts", desc: "Apply pressure to cuts. For deep wounds, seek medical attention immediately." },
      { icon: "waves", title: "Hypothermia", desc: "If soaked and cold — remove wet clothes, wrap in dry blankets, drink warm fluids." },
      { icon: "flash", title: "Electrical Hazards", desc: "Stay away from flooded areas with electrical equipment. Never touch downed power lines." },
    ],
  },
];

const CATEGORIES = [
  { key: "all", labelKey: "all", icon: "medical-bag" },
  { key: "critical", labelKey: "critical", icon: "alarm-light" },
  { key: "injury", labelKey: "injury", icon: "bandage" },
  { key: "disaster", labelKey: "disaster", icon: "weather-tornado" },
];

export default function FirstAid() {
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [completedSteps, setCompletedSteps] = useState({});
  const [activeCategory, setActiveCategory] = useState("all");
  const { theme, t } = useSettings();
  const { bg, card, border, textDark, textMid, textLight, surface } = theme;
  const isDark = theme.bg === "#121212";

  const toggleStep = (stepIndex) => {
    setCompletedSteps((prev) => ({ ...prev, [stepIndex]: !prev[stepIndex] }));
  };
  const resetSteps = () => setCompletedSteps({});

  const filteredGuides =
    activeCategory === "all"
      ? GUIDES
      : GUIDES.filter((g) => g.category === activeCategory);

  // ── GUIDE DETAIL VIEW ──────────────────────────────────────────────────────
  if (selectedGuide) {
    const guide = GUIDES.find((g) => g.id === selectedGuide);
    const completedCount = Object.values(completedSteps).filter(Boolean).length;
    const progress = (completedCount / guide.steps.length) * 100;
    const allDone = completedCount === guide.steps.length;

    return (
      <View style={[styles.wrapper, { backgroundColor: bg }]}>

        {/* HEADER */}
        <View style={[styles.guideHeader, { backgroundColor: guide.color }]}>
          <TouchableOpacity
            onPress={() => { setSelectedGuide(null); resetSteps(); }}
            style={styles.backButton}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <MaterialCommunityIcons name={guide.icon} size={48} color="#fff" style={styles.guideHeaderIcon} />
          <Text style={styles.guideHeaderTitle}>{guide.title}</Text>
          {guide.emergency && (
            <View style={styles.emergencyBadge}>
              <MaterialCommunityIcons name="alarm-light" size={13} color="#fff" />
              <Text style={styles.emergencyBadgeText}>{t("firstaid_emergency_procedure")}</Text>
            </View>
          )}
          <View style={styles.guideHeaderStats}>
            <View style={styles.guideHeaderStat}>
              <Text style={styles.guideHeaderStatNum}>{guide.steps.length}</Text>
              <Text style={styles.guideHeaderStatLabel}>{t("steps")}</Text>
            </View>
            <View style={styles.guideHeaderStatDivider} />
            <View style={styles.guideHeaderStat}>
              <Text style={styles.guideHeaderStatNum}>{completedCount}</Text>
              <Text style={styles.guideHeaderStatLabel}>{t("done")}</Text>
            </View>
            <View style={styles.guideHeaderStatDivider} />
            <View style={styles.guideHeaderStat}>
              <Text style={styles.guideHeaderStatNum}>{Math.round(progress)}%</Text>
              <Text style={styles.guideHeaderStatLabel}>{t("progress")}</Text>
            </View>
          </View>
        </View>

        {/* DISCLAIMER */}
        {guide.disclaimer && (
          <View style={[styles.disclaimerCard, {
            backgroundColor: isDark ? "#2a2000" : "#FFF8E1",
            borderColor: isDark ? "#5a4a00" : "#FFE082",
          }]}>
            <Ionicons name="warning" size={16} color={isDark ? "#FFD54F" : "#5D4037"} style={styles.disclaimerIcon} />
            <Text style={[styles.disclaimerText, { color: isDark ? "#FFD54F" : "#5D4037" }]}>
              {guide.disclaimer}
            </Text>
          </View>
        )}

        {/* PROGRESS BAR */}
        <View style={[styles.progressContainer, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, { color: textMid }]}>
              {allDone ? "All steps complete!" : "Tap each step to mark done"}
            </Text>
            <Text style={[styles.progressCount, { color: guide.color }]}>
              {completedCount}/{guide.steps.length}
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: border }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: guide.color }]} />
          </View>
        </View>

        <ScrollView style={[styles.stepsScroll, { backgroundColor: bg }]} showsVerticalScrollIndicator={false}>
          {guide.steps.map((step, index) => {
            const done = completedSteps[index];
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.stepCard,
                  { backgroundColor: card, borderColor: border },
                  done && {
                    backgroundColor: isDark ? "#1a3a1a" : "#E8F5E9",
                    borderColor: isDark ? "#2e5a2e" : "#A5D6A7",
                  },
                ]}
                onPress={() => toggleStep(index)}
                activeOpacity={0.75}
              >
                <View style={[styles.stepBubble, { backgroundColor: done ? "#2e7d32" : guide.color }]}>
                  <Text style={styles.stepBubbleText}>
                    {done ? "" : index + 1}
                  </Text>
                </View>
                <View style={styles.stepBody}>
                  <View style={styles.stepTitleRow}>
                    <MaterialCommunityIcons name={step.icon} size={18} color={done ? "#2e7d32" : guide.color} />
                    <Text style={[styles.stepTitle, { color: done ? "#2e7d32" : textDark }]}>
                      {step.title}
                    </Text>
                  </View>
                  <Text style={[styles.stepDesc, { color: textMid }]}>{step.desc}</Text>
                </View>
                <View style={[styles.stepCheck, {
                  borderColor: done ? "#2e7d32" : border,
                  backgroundColor: done ? "#2e7d32" : "transparent",
                }]}>
                  {done && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}

          {allDone && (
            <View style={[styles.completedCard, {
              backgroundColor: isDark ? "#1a3a1a" : "#E8F5E9",
              borderColor: isDark ? "#2e5a2e" : "#A5D6A7",
            }]}>
              <Ionicons name="checkmark-circle" size={44} color="#2e7d32" />
              <Text style={styles.completedTitle}>All Steps Completed!</Text>
              <Text style={[styles.completedSub, { color: textMid }]}>
                Seek professional medical help if the situation requires it.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.hotlineCta}
            onPress={() => Linking.openURL("tel:911")}
          >
            <Ionicons name="call" size={32} color="#fff" style={styles.hotlineCtaIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.hotlineCtaLabel}>{t("emergency_hotline")}</Text>
              <Text style={styles.hotlineCtaNumber}>911</Text>
              <Text style={styles.hotlineCtaTap}>{t("call_now")}</Text>
            </View>
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  return (
    <View style={[styles.wrapper, { backgroundColor: bg }]}>

      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: COLORS.primary }]}>
        <View style={styles.headerTitleRow}>
          <MaterialCommunityIcons name="medical-bag" size={25} color="#fff" />
          <Text style={styles.headerTitle}>{t("firstaid_title")}</Text>
        </View>
        <Text style={styles.headerSub}>{t("firstaid_sub")}</Text>
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNum}>{GUIDES.length}</Text>
            <Text style={styles.headerStatLabel}>{t("guides")}</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNum}>{GUIDES.filter((g) => g.emergency).length}</Text>
            <Text style={styles.headerStatLabel}>{t("emergency")}</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNum}>Free</Text>
            <Text style={styles.headerStatLabel}>{t("offline_label")}</Text>
          </View>
        </View>
      </View>

      {/* 911 BANNER */}
      <TouchableOpacity
        style={styles.callBanner}
        onPress={() => Linking.openURL("tel:911")}
      >
        <MaterialCommunityIcons name="alarm-light" size={26} color="#fff" style={styles.callBannerIcon} />
        <View style={{ flex: 1 }}>
          <Text style={styles.callBannerText}>Life-threatening emergency?</Text>
          <Text style={styles.callBannerNumber}>Call 911 immediately</Text>
        </View>
        <Text style={styles.callBannerArrow}>→</Text>
      </TouchableOpacity>

      {/* DISCLAIMER */}
      <View style={[styles.disclaimer, {
        backgroundColor: isDark ? "#2a2000" : "#FFF8E1",
        borderColor: isDark ? "#5a4a00" : "#FFE082",
        marginHorizontal: 20,
      }]}>
        <MaterialCommunityIcons name="clipboard-text" size={16} color={isDark ? "#FFD54F" : "#5D4037"} style={styles.disclaimerIcon} />
        <Text style={[styles.disclaimerText, { color: isDark ? "#FFD54F" : "#5D4037" }]}>
          All guides are for <Text style={{ fontWeight: "bold" }}>educational purposes only</Text> and do not replace professional medical advice.
        </Text>
      </View>

      {/* CATEGORY TABS */}
      <View style={[styles.tabs, { borderColor: border }]}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.tab, activeCategory === cat.key && styles.activeTab]}
            onPress={() => setActiveCategory(cat.key)}
          >
            <View style={styles.tabInner}>
              <MaterialCommunityIcons name={cat.icon} size={14} color={activeCategory === cat.key ? COLORS.primary : textLight} />
              <Text style={[
                styles.tabText,
                { color: textLight },
                activeCategory === cat.key && styles.activeTabText,
              ]}>
                {t(cat.labelKey)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }} showsVerticalScrollIndicator={false}>
        {filteredGuides.map((guide) => (
          <TouchableOpacity
            key={guide.id}
            style={[styles.guideCard, { backgroundColor: card, borderColor: border }]}
            onPress={() => { setSelectedGuide(guide.id); resetSteps(); }}
            activeOpacity={0.8}
          >
            <View style={[styles.guideCardAccent, { backgroundColor: guide.color }]} />
            <View style={[styles.guideCardIconWrap, { backgroundColor: guide.color + "22" }]}>
              <MaterialCommunityIcons name={guide.icon} size={26} color={guide.color} />
            </View>
            <View style={styles.guideCardContent}>
              <View style={styles.guideCardTop}>
                <Text style={[styles.guideCardTitle, { color: textDark }]}>{guide.title}</Text>
                {guide.emergency && (
                  <View style={styles.emergencyPill}>
                    <MaterialCommunityIcons name="alarm-light" size={10} color="#B00020" />
                    <Text style={styles.emergencyPillText}>Emergency</Text>
                  </View>
                )}
              </View>
              <View style={styles.guideCardMeta}>
                <View style={[styles.guideCardMetaItem, { backgroundColor: surface }]}>
                  <Text style={[styles.guideCardMetaText, { color: textLight }]}>
                    {guide.steps.length} steps
                  </Text>
                </View>
                <View style={[styles.guideCardMetaItem, { backgroundColor: guide.color + "22" }]}>
                  <Text style={[styles.guideCardMetaText, { color: guide.color }]}>
                    {guide.category === "critical" ? "Critical" : guide.category === "injury" ? "Injury" : "Disaster"}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[styles.guideCardArrow, { backgroundColor: guide.color }]}>
              <Text style={styles.guideCardArrowText}>›</Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.hotlineCard}
          onPress={() => Linking.openURL("tel:09177236262")}
        >
          <Ionicons name="call" size={32} color="#fff" style={styles.hotlineIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hotlineLabel}>{t("ctu_drrmo_hotline")}</Text>
            <Text style={styles.hotlineNumber}>0917-723-6262</Text>
            <Text style={styles.hotlineTap}>{t("call_now")}</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },

  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 55, paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  headerStats: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16, padding: 12, marginTop: 16,
  },
  headerStat: { flex: 1, alignItems: "center" },
  headerStatNum: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  headerStatLabel: { color: "rgba(255,255,255,0.7)", fontSize: 10, marginTop: 2 },
  headerStatDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.2)" },

  callBanner: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#B00020",
    marginHorizontal: 20, marginTop: 16,
    borderRadius: 16, padding: 14, gap: 12,
    borderWidth: 1.5, borderColor: "#FF5252",
  },
  callBannerIcon: {},
  callBannerText: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  callBannerNumber: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  callBannerArrow: { color: "#fff", fontSize: 22, fontWeight: "bold" },

  disclaimer: {
    flexDirection: "row", alignItems: "flex-start",
    borderRadius: 12, padding: 12, gap: 8,
    marginTop: 12, borderWidth: 1, borderLeftWidth: 4,
    borderLeftColor: "#FB8C00",
  },
  disclaimerIcon: {},
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 18 },

  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginHorizontal: 20, marginTop: 14,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabInner: { flexDirection: "row", alignItems: "center", gap: 4 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 11, fontWeight: "600" },
  activeTabText: { color: COLORS.primary, fontWeight: "bold" },

  guideCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 18, marginBottom: 12,
    borderWidth: 1, overflow: "hidden",
    elevation: 2, shadowColor: "#000",
    shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
  },
  guideCardAccent: { width: 5, alignSelf: "stretch" },
  guideCardIconWrap: {
    width: 54, height: 54, borderRadius: 14,
    justifyContent: "center", alignItems: "center",
    margin: 12,
  },
  guideCardContent: { flex: 1, paddingVertical: 14, paddingRight: 8 },
  guideCardTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  guideCardTitle: { fontWeight: "bold", fontSize: 15 },
  emergencyPill: {
    backgroundColor: "#FFEBEE",
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, flexDirection: "row", alignItems: "center", gap: 3,
  },
  emergencyPillText: { color: "#B00020", fontSize: 10, fontWeight: "bold" },
  guideCardMeta: { flexDirection: "row", gap: 6 },
  guideCardMetaItem: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  guideCardMetaText: { fontSize: 11, fontWeight: "500" },
  guideCardArrow: {
    width: 36, alignSelf: "stretch",
    justifyContent: "center", alignItems: "center",
  },
  guideCardArrowText: { color: "#fff", fontSize: 20, fontWeight: "bold" },

  hotlineCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center",
    gap: 14, marginTop: 4,
  },
  hotlineIcon: {},
  hotlineLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  hotlineNumber: { color: "#fff", fontWeight: "bold", fontSize: 20, marginTop: 2 },
  hotlineTap: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 },

  guideHeader: {
    paddingTop: 55, paddingBottom: 24,
    paddingHorizontal: 24, alignItems: "center",
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  backButton: { position: "absolute", top: 52, left: 20 },
  backText: { color: "rgba(255,255,255,0.85)", fontSize: 15, fontWeight: "600" },
  guideHeaderIcon: { marginBottom: 8 },
  guideHeaderTitle: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 6 },
  emergencyBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20, paddingHorizontal: 12,
    paddingVertical: 4, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 5,
  },
  emergencyBadgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  guideHeaderStats: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16, padding: 12, marginTop: 8,
    alignSelf: "stretch",
  },
  guideHeaderStat: { flex: 1, alignItems: "center" },
  guideHeaderStatNum: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  guideHeaderStatLabel: { color: "rgba(255,255,255,0.7)", fontSize: 10, marginTop: 2 },
  guideHeaderStatDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.2)" },

  disclaimerCard: {
    flexDirection: "row", alignItems: "flex-start",
    marginHorizontal: 20, marginTop: 14,
    borderRadius: 12, padding: 12, gap: 8,
    borderWidth: 1, borderLeftWidth: 4,
    borderLeftColor: "#FB8C00",
  },

  progressContainer: {
    marginHorizontal: 20, marginTop: 12,
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressLabel: { fontSize: 12, fontWeight: "500" },
  progressCount: { fontSize: 13, fontWeight: "bold" },
  progressTrack: { height: 6, borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },

  stepsScroll: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  stepCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, gap: 12,
    elevation: 1, shadowColor: "#000",
    shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3,
  },
  stepBubble: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  stepBubbleText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  stepBody: { flex: 1 },
  stepTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 5, gap: 6 },
  stepTitle: { fontWeight: "bold", fontSize: 14 },
  stepDesc: { fontSize: 13, lineHeight: 19 },
  stepCheck: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, justifyContent: "center", alignItems: "center",
  },

  completedCard: {
    borderRadius: 16, padding: 24,
    alignItems: "center", marginBottom: 12,
    borderWidth: 1,
  },
  completedTitle: { fontWeight: "bold", fontSize: 18, color: "#2e7d32", marginTop: 10 },
  completedSub: { fontSize: 13, marginTop: 6, textAlign: "center", lineHeight: 20 },

  hotlineCta: {
    backgroundColor: "#B00020",
    borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center",
    gap: 14, marginBottom: 12,
  },
  hotlineCtaIcon: {},
  hotlineCtaLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  hotlineCtaNumber: { color: "#fff", fontWeight: "bold", fontSize: 22, marginTop: 2 },
  hotlineCtaTap: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 },
});

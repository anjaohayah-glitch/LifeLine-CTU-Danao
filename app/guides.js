// app/guides.js
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../constants/colors";
import { useSettings } from "../context/SettingsContext";

const DISASTERS = [
  {
    id: 1, title: "Earthquake", icon: "🌍", color: "#4527A0",
    phases: {
      before: [
        { icon: "🔧", tip: "Secure heavy furniture to walls to prevent tipping." },
        { icon: "🎒", tip: "Prepare a go-bag with food, water, meds & documents." },
        { icon: "📋", tip: "Create a family emergency plan with meeting points." },
        { icon: "🔌", tip: "Know how to shut off gas, water, and electricity." },
        { icon: "📻", tip: "Keep a battery-powered radio for emergency updates." },
      ],
      during: [
        { icon: "⬇️", tip: "DROP to your hands and knees immediately." },
        { icon: "🛡", tip: "COVER your head and neck under a sturdy table or desk." },
        { icon: "✊", tip: "HOLD ON until shaking stops. Do not run outside." },
        { icon: "🚫", tip: "Stay away from windows, heavy furniture, and outer walls." },
        { icon: "🚗", tip: "If in a car, pull over away from buildings and bridges." },
      ],
      after: [
        { icon: "👀", tip: "Check yourself and others for injuries before moving." },
        { icon: "🔥", tip: "Check for gas leaks — if you smell gas, leave immediately." },
        { icon: "📱", tip: "Send a text instead of calling to keep lines free." },
        { icon: "🚧", tip: "Stay away from damaged buildings and downed power lines." },
        { icon: "🌊", tip: "Move to high ground if near coast — tsunami may follow." },
      ],
    },
  },
  {
    id: 2, title: "Typhoon", icon: "🌪", color: "#1565C0",
    phases: {
      before: [
        { icon: "🏠", tip: "Reinforce your home — check roof, windows, and doors." },
        { icon: "🌿", tip: "Trim trees and secure loose objects in yard." },
        { icon: "💧", tip: "Stock at least 3 days of water and non-perishable food." },
        { icon: "🔋", tip: "Charge all devices and prepare flashlights and candles." },
        { icon: "📦", tip: "Move valuables to higher ground inside your home." },
      ],
      during: [
        { icon: "🏠", tip: "Stay indoors and away from windows and glass doors." },
        { icon: "🚫", tip: "Do NOT go outside during the eye — the storm will return." },
        { icon: "⚡", tip: "Unplug electrical appliances to avoid power surge damage." },
        { icon: "📻", tip: "Monitor updates via battery-powered radio or phone." },
        { icon: "🆘", tip: "If flooding starts, move to the highest floor immediately." },
      ],
      after: [
        { icon: "⚠️", tip: "Wait for official all-clear before going outside." },
        { icon: "💧", tip: "Avoid floodwater — it may be contaminated or electrically charged." },
        { icon: "📸", tip: "Document property damage for insurance claims." },
        { icon: "🧹", tip: "Clean and disinfect everything that got wet." },
        { icon: "🩺", tip: "Watch for signs of waterborne illness in the following days." },
      ],
    },
  },
  {
    id: 3, title: "Flood", icon: "🌊", color: "#00838F",
    phases: {
      before: [
        { icon: "🗺", tip: "Know your flood zone and nearest evacuation routes." },
        { icon: "📦", tip: "Move important documents and valuables to upper floors." },
        { icon: "🚗", tip: "Keep your vehicle fueled and parked on high ground." },
        { icon: "🧱", tip: "Use sandbags to protect doorways if flooding is expected." },
        { icon: "💊", tip: "Prepare medications and a first aid kit in your go-bag." },
      ],
      during: [
        { icon: "⬆️", tip: "Move immediately to higher ground — do not wait." },
        { icon: "🚫", tip: "Never walk or drive through floodwater — 6 inches can knock you down." },
        { icon: "⚡", tip: "Stay away from floodwater near power lines or electrical equipment." },
        { icon: "🚣", tip: "If trapped, go to roof and signal for help. Do not swim." },
        { icon: "📵", tip: "Avoid using phones except for emergencies to conserve battery." },
      ],
      after: [
        { icon: "🏠", tip: "Do not return home until authorities declare it safe." },
        { icon: "💧", tip: "Boil tap water until water supply is declared safe." },
        { icon: "🧤", tip: "Wear gloves and boots when cleaning flood-damaged areas." },
        { icon: "🦟", tip: "Remove standing water to prevent mosquito breeding." },
        { icon: "📞", tip: "Contact your insurance company and document all damage." },
      ],
    },
  },
  {
    id: 4, title: "Fire", icon: "🔥", color: "#BF360C",
    phases: {
      before: [
        { icon: "🔔", tip: "Install and regularly test smoke detectors in every room." },
        { icon: "🧯", tip: "Keep a fire extinguisher accessible and learn how to use it." },
        { icon: "🚪", tip: "Plan and practice two escape routes from every room." },
        { icon: "📍", tip: "Designate a meeting point outside your home for your family." },
        { icon: "🔌", tip: "Never leave candles, stoves, or heaters unattended." },
      ],
      during: [
        { icon: "🚨", tip: "Activate fire alarm and call 911 immediately." },
        { icon: "🚪", tip: "Feel doors before opening — if hot, use another exit." },
        { icon: "🧎", tip: "Stay low where air is cleaner — crawl if there is smoke." },
        { icon: "🚫", tip: "Never use elevators during a fire — use stairs only." },
        { icon: "🛑", tip: "Stop, Drop, and Roll if your clothes catch fire." },
      ],
      after: [
        { icon: "🚫", tip: "Do not re-enter building until fire department clears it." },
        { icon: "🏥", tip: "Seek medical attention for burns or smoke inhalation." },
        { icon: "📞", tip: "Contact insurance company and document all damage." },
        { icon: "🧹", tip: "Discard food, beverages, or medicine exposed to heat or smoke." },
        { icon: "💙", tip: "Seek counseling — fires can be traumatic. You are not alone." },
      ],
    },
  },
  {
    id: 5, title: "Landslide", icon: "⛰️", color: "#4E342E",
    phases: {
      before: [
        { icon: "🗺", tip: "Know if your area is landslide-prone — check with local government." },
        { icon: "🌧", tip: "Be extra alert during heavy or prolonged rainfall." },
        { icon: "🌿", tip: "Plant ground cover on slopes to reduce soil erosion." },
        { icon: "🚧", tip: "Watch for warning signs: cracks in ground, tilting trees." },
        { icon: "🎒", tip: "Prepare go-bag and know your evacuation route." },
      ],
      during: [
        { icon: "🏃", tip: "Evacuate immediately if you hear rumbling sounds." },
        { icon: "⬆️", tip: "Move away from the slide path — go to higher ground sideways." },
        { icon: "🚗", tip: "If driving, watch for collapsed pavement and mud on roads." },
        { icon: "🌊", tip: "Be alert for flooding — landslides can dam rivers temporarily." },
        { icon: "🪨", tip: "If caught, curl into a ball and protect your head." },
      ],
      after: [
        { icon: "🚫", tip: "Stay away from slide area — more slides may follow." },
        { icon: "⚡", tip: "Check for downed power lines and broken utility lines." },
        { icon: "🏠", tip: "Inspect your home's foundation for damage before entering." },
        { icon: "📞", tip: "Report damage to local authorities immediately." },
        { icon: "🧹", tip: "Help neighbors but only when it is safe to do so." },
      ],
    },
  },
];

const PHASE_COLORS = { before: "#1565C0", during: "#B00020", after: "#2e7d32" };
const PHASE_LABELS = { before: "📋 Before", during: "⚠️ During", after: "✅ After" };

export default function Guides() {
  const [isOnline, setIsOnline] = useState(true);
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState("before");
  const { theme } = useSettings();
  const { bg, card, border, textDark, textMid, textLight, surface } = theme;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected && state.isInternetReachable);
    });
    return () => unsubscribe();
  }, []);

  if (selectedDisaster) {
    const disaster = DISASTERS.find((d) => d.id === selectedDisaster);
    const tips = disaster.phases[selectedPhase];

    return (
      <View style={[styles.wrapper, { backgroundColor: bg }]}>

        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>📵 You are offline — Showing saved guide</Text>
          </View>
        )}

        {/* GUIDE HEADER */}
        <View style={[styles.guideHeader, { backgroundColor: disaster.color }]}>
          <TouchableOpacity onPress={() => setSelectedDisaster(null)} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.guideIcon}>{disaster.icon}</Text>
          <Text style={styles.guideTitle}>{disaster.title}</Text>
          <Text style={styles.guideSubtitle}>What to do before, during & after</Text>
        </View>

        {/* PHASE TABS */}
        <View style={[styles.phaseTabs, { borderColor: border }]}>
          {["before", "during", "after"].map((phase) => (
            <TouchableOpacity
              key={phase}
              style={[
                styles.phaseTab,
                { borderColor: border },
                selectedPhase === phase && { backgroundColor: PHASE_COLORS[phase], borderColor: PHASE_COLORS[phase] },
              ]}
              onPress={() => setSelectedPhase(phase)}
            >
              <Text style={[
                styles.phaseTabText,
                { color: textMid },
                selectedPhase === phase && { color: "#fff" },
              ]}>
                {PHASE_LABELS[phase]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* PHASE LABEL */}
        <View style={[styles.phaseLabelRow, { backgroundColor: PHASE_COLORS[selectedPhase] + "22" }]}>
          <Text style={[styles.phaseLabel, { color: PHASE_COLORS[selectedPhase] }]}>
            {selectedPhase === "before" ? "Prepare before disaster strikes" :
             selectedPhase === "during" ? "Stay safe during the disaster" :
             "Recover safely after the disaster"}
          </Text>
        </View>

        {/* TIPS */}
        <ScrollView style={[styles.tipsContainer, { backgroundColor: bg }]}>
          {tips.map((tip, index) => (
            <View key={index} style={[
              styles.tipCard,
              { backgroundColor: card, borderLeftColor: PHASE_COLORS[selectedPhase] },
            ]}>
              <View style={[styles.tipIconBox, { backgroundColor: PHASE_COLORS[selectedPhase] + "22" }]}>
                <Text style={styles.tipEmoji}>{tip.icon}</Text>
              </View>
              <View style={styles.tipContent}>
                <Text style={[styles.tipNumber, { color: textLight }]}>Step {index + 1}</Text>
                <Text style={[styles.tipText, { color: textDark }]}>{tip.tip}</Text>
              </View>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: bg }]}>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>📵 You are offline — Guides available below</Text>
        </View>
      )}

      <ScrollView style={[styles.container, { backgroundColor: bg }]}>
        <Text style={styles.header}>📚 Disaster Guides</Text>
        <Text style={[styles.subHeader, { color: textLight }]}>
          {isOnline ? "🟢 Online" : "🔴 Offline"} — All guides available anytime
        </Text>

        {!isOnline && (
          <View style={[styles.offlineCard, {
            backgroundColor: theme.bg === "#121212" ? "#2a1a00" : "#FFF3E0",
            borderColor: theme.bg === "#121212" ? "#5a3a00" : "#FFE0B2",
          }]}>
            <Text style={styles.offlineCardIcon}>💡</Text>
            <View style={styles.offlineCardContent}>
              <Text style={styles.offlineCardTitle}>Offline Mode Active</Text>
              <Text style={[styles.offlineCardDesc, { color: textMid }]}>
                SOS and live features are unavailable. All disaster guides are still accessible below.
              </Text>
            </View>
          </View>
        )}

        {DISASTERS.map((disaster) => (
          <TouchableOpacity
            key={disaster.id}
            style={[styles.disasterCard, { backgroundColor: card, borderLeftColor: disaster.color }]}
            onPress={() => { setSelectedDisaster(disaster.id); setSelectedPhase("before"); }}
          >
            <View style={[styles.disasterIconBox, { backgroundColor: disaster.color + "20" }]}>
              <Text style={styles.disasterEmoji}>{disaster.icon}</Text>
            </View>
            <View style={styles.disasterContent}>
              <Text style={[styles.disasterTitle, { color: textDark }]}>{disaster.title}</Text>
              <View style={styles.phaseRow}>
                {["before", "during", "after"].map((phase) => (
                  <View key={phase} style={[styles.phasePill, { backgroundColor: PHASE_COLORS[phase] }]}>
                    <Text style={styles.phasePillText}>{phase}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Text style={[styles.arrow, { color: textLight }]}>›</Text>
          </TouchableOpacity>
        ))}

        <View style={[styles.noteCard, { backgroundColor: card, borderColor: border }]}>
          <Text style={styles.noteIcon}>📵</Text>
          <Text style={[styles.noteText, { color: textMid }]}>
            These guides are fully available even without internet connection.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, padding: 20 },
  offlineBanner: { backgroundColor: "#E65100", padding: 10, alignItems: "center" },
  offlineText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  header: { fontSize: 26, fontWeight: "bold", color: COLORS.primary, textAlign: "center", marginTop: 50, marginBottom: 5 },
  subHeader: { textAlign: "center", marginBottom: 20 },
  offlineCard: { flexDirection: "row", borderRadius: 12, padding: 15, marginBottom: 20, borderWidth: 1, alignItems: "center" },
  offlineCardIcon: { fontSize: 30, marginRight: 12 },
  offlineCardContent: { flex: 1 },
  offlineCardTitle: { fontWeight: "bold", color: "#E65100", fontSize: 14 },
  offlineCardDesc: { fontSize: 12, marginTop: 3 },
  disasterCard: { flexDirection: "row", alignItems: "center", borderRadius: 15, padding: 15, marginBottom: 12, borderLeftWidth: 5, elevation: 3, shadowColor: "#000", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  disasterIconBox: { width: 60, height: 60, borderRadius: 18, justifyContent: "center", alignItems: "center", marginRight: 14 },
  disasterEmoji: { fontSize: 30 },
  disasterContent: { flex: 1 },
  disasterTitle: { fontWeight: "bold", fontSize: 17, marginBottom: 8 },
  phaseRow: { flexDirection: "row", gap: 6 },
  phasePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  phasePillText: { color: "#fff", fontSize: 10, fontWeight: "bold", textTransform: "capitalize" },
  arrow: { fontSize: 26 },
  noteCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 15, marginTop: 5, borderWidth: 1 },
  noteIcon: { fontSize: 24, marginRight: 12 },
  noteText: { flex: 1, fontSize: 13 },
  guideHeader: { padding: 25, paddingTop: 55, alignItems: "center", borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  backButton: { position: "absolute", top: 50, left: 20 },
  backText: { color: "rgba(255,255,255,0.85)", fontSize: 16 },
  guideIcon: { fontSize: 55, marginBottom: 8 },
  guideTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  guideSubtitle: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 },
  phaseTabs: { flexDirection: "row", padding: 15, gap: 8, borderBottomWidth: 1 },
  phaseTab: { flex: 1, paddingVertical: 10, borderRadius: 25, alignItems: "center", borderWidth: 1.5 },
  phaseTabText: { fontWeight: "bold", fontSize: 12 },
  phaseLabelRow: { padding: 12, alignItems: "center" },
  phaseLabel: { fontSize: 13, fontWeight: "600" },
  tipsContainer: { flex: 1, padding: 15 },
  tipCard: { flexDirection: "row", borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  tipIconBox: { width: 46, height: 46, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 12 },
  tipEmoji: { fontSize: 24 },
  tipContent: { flex: 1 },
  tipNumber: { fontSize: 11, marginBottom: 3 },
  tipText: { fontSize: 14, lineHeight: 20 },
});
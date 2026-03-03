// app/firstaid.js
import { useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const GUIDES = [
  {
    id: 1,
    title: "CPR Guide",
    icon: "❤️",
    color: "#B00020",
    emergency: true,
    steps: [
      { icon: "👀", title: "Check Safety", desc: "Make sure the scene is safe for you and the victim." },
      { icon: "👋", title: "Check Response", desc: "Tap shoulders firmly and shout 'Are you okay?'" },
      { icon: "📞", title: "Call for Help", desc: "Call 911 immediately or ask someone nearby to call." },
      { icon: "🫁", title: "Open Airway", desc: "Tilt head back gently and lift the chin to open airway." },
      { icon: "👂", title: "Check Breathing", desc: "Look, listen, and feel for breathing for no more than 10 seconds." },
      { icon: "🤲", title: "Chest Compressions", desc: "Place heel of hand on center of chest. Push hard and fast — at least 2 inches deep, 100-120 times per minute." },
      { icon: "💨", title: "Rescue Breaths", desc: "Give 2 rescue breaths after every 30 compressions. Pinch nose, cover mouth, breathe until chest rises." },
      { icon: "🔁", title: "Repeat", desc: "Continue 30 compressions + 2 breaths until help arrives or person recovers." },
    ],
  },
  {
    id: 2,
    title: "Wound & Bleeding",
    icon: "🩸",
    color: "#C62828",
    emergency: false,
    steps: [
      { icon: "🧤", title: "Protect Yourself", desc: "Use gloves or a clean plastic bag to avoid contact with blood." },
      { icon: "🫸", title: "Apply Pressure", desc: "Press firmly on the wound with a clean cloth or bandage." },
      { icon: "⬆️", title: "Elevate", desc: "Raise the injured area above heart level if possible." },
      { icon: "🩹", title: "Bandage", desc: "Once bleeding slows, wrap with a clean bandage firmly but not too tight." },
      { icon: "🚫", title: "Don't Remove", desc: "If cloth soaks through, add more on top — do NOT remove the first cloth." },
      { icon: "📞", title: "Seek Help", desc: "If bleeding doesn't stop after 10 minutes, call emergency services." },
    ],
  },
  {
    id: 3,
    title: "Burns Treatment",
    icon: "🔥",
    color: "#E65100",
    emergency: false,
    steps: [
      { icon: "🚫", title: "Stop the Burning", desc: "Remove from heat source. Do NOT use ice — it damages tissue." },
      { icon: "💧", title: "Cool the Burn", desc: "Run cool (not cold) water over burn for 10-20 minutes." },
      { icon: "👕", title: "Remove Clothing", desc: "Remove clothing and jewelry near the burn — unless stuck to skin." },
      { icon: "🩹", title: "Cover the Burn", desc: "Cover loosely with a clean non-fluffy material like cling film." },
      { icon: "🚫", title: "Do NOT", desc: "Do NOT burst blisters, apply toothpaste, butter, or any home remedy." },
      { icon: "📞", title: "Seek Medical Help", desc: "For severe burns, burns on face/hands/feet, or burns larger than palm — call 911." },
    ],
  },
  {
    id: 4,
    title: "Drowning Response",
    icon: "🌊",
    color: "#1565C0",
    emergency: true,
    steps: [
      { icon: "📞", title: "Call for Help", desc: "Call 911 immediately. Do not enter water unless trained to do so." },
      { icon: "🪢", title: "Reach or Throw", desc: "Throw a rope, life ring, or extend a pole — do NOT jump in unless trained." },
      { icon: "🫁", title: "Check Breathing", desc: "Once out of water, check if person is breathing." },
      { icon: "❤️", title: "Start CPR", desc: "If not breathing, begin CPR immediately — 30 compressions, 2 breaths." },
      { icon: "🔄", title: "Recovery Position", desc: "If breathing, place on side in recovery position to prevent choking." },
      { icon: "🏥", title: "Keep Warm", desc: "Cover with blanket to prevent hypothermia while waiting for help." },
    ],
  },
  {
    id: 5,
    title: "Earthquake Injuries",
    icon: "🌍",
    color: "#4527A0",
    emergency: false,
    steps: [
      { icon: "✅", title: "Ensure Safety", desc: "Wait for shaking to stop before helping others. Watch for aftershocks." },
      { icon: "🚧", title: "Check for Hazards", desc: "Avoid downed power lines, gas leaks, and unstable structures." },
      { icon: "🩸", title: "Control Bleeding", desc: "Apply firm pressure to any wounds with clean cloth immediately." },
      { icon: "🦴", title: "Fractures", desc: "Do NOT move victim if spinal injury is suspected. Immobilize broken limbs." },
      { icon: "🪨", title: "Crush Injuries", desc: "Do NOT suddenly release someone trapped for long periods — call medical help first." },
      { icon: "📞", title: "Signal for Help", desc: "Tap on pipes or walls to signal rescuers. Shout only as last resort to conserve energy." },
    ],
  },
  {
    id: 6,
    title: "Typhoon Injuries",
    icon: "🌪",
    color: "#00695C",
    emergency: false,
    steps: [
      { icon: "🏠", title: "Stay Inside", desc: "Do not go outside during a typhoon. Stay away from windows and doors." },
      { icon: "💧", title: "Flood Wounds", desc: "Clean flood water wounds immediately — floodwater carries dangerous bacteria." },
      { icon: "🩹", title: "Wound Care", desc: "Wash wound with clean water and soap for at least 5 minutes. Cover with bandage." },
      { icon: "🦺", title: "Flying Debris Cuts", desc: "Apply pressure to cuts. For deep wounds, seek medical attention immediately." },
      { icon: "🌊", title: "Hypothermia", desc: "If soaked and cold — remove wet clothes, wrap in dry blankets, drink warm fluids." },
      { icon: "⚡", title: "Electrical Hazards", desc: "Stay away from flooded areas with electrical equipment. Never touch downed power lines." },
    ],
  },
];

export default function FirstAid() {
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [completedSteps, setCompletedSteps] = useState({});

  const toggleStep = (stepIndex) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepIndex]: !prev[stepIndex],
    }));
  };

  const resetSteps = () => setCompletedSteps({});

  if (selectedGuide) {
    const guide = GUIDES.find((g) => g.id === selectedGuide);
    const completedCount = Object.values(completedSteps).filter(Boolean).length;
    const progress = (completedCount / guide.steps.length) * 100;

    return (
      <View style={styles.wrapper}>

        {/* GUIDE HEADER */}
        <View style={[styles.guideHeader, { backgroundColor: guide.color }]}>
          <TouchableOpacity onPress={() => { setSelectedGuide(null); resetSteps(); }} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.guideIcon}>{guide.icon}</Text>
          <Text style={styles.guideHeaderTitle}>{guide.title}</Text>
          {guide.emergency && (
            <View style={styles.emergencyBadge}>
              <Text style={styles.emergencyBadgeText}>🚨 EMERGENCY PROCEDURE</Text>
            </View>
          )}
        </View>

        {/* PROGRESS BAR */}
        <View style={styles.progressContainer}>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>Progress</Text>
            <Text style={styles.progressText}>{completedCount}/{guide.steps.length} steps</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: guide.color }]} />
          </View>
        </View>

        <ScrollView style={styles.stepsContainer}>
          {guide.steps.map((step, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.stepCard,
                completedSteps[index] && { backgroundColor: "#e8f5e9", borderColor: "#a5d6a7" },
              ]}
              onPress={() => toggleStep(index)}
            >
              <View style={styles.stepLeft}>
                <View style={[styles.stepNumber, { backgroundColor: completedSteps[index] ? "#2e7d32" : guide.color }]}>
                  <Text style={styles.stepNumberText}>
                    {completedSteps[index] ? "✓" : index + 1}
                  </Text>
                </View>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepTitleRow}>
                  <Text style={styles.stepIcon}>{step.icon}</Text>
                  <Text style={[styles.stepTitle, completedSteps[index] && { color: "#2e7d32" }]}>
                    {step.title}
                  </Text>
                </View>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* COMPLETED MESSAGE */}
          {completedCount === guide.steps.length && (
            <View style={styles.completedCard}>
              <Text style={styles.completedIcon}>✅</Text>
              <Text style={styles.completedText}>All steps completed!</Text>
              <Text style={styles.completedSub}>Seek professional medical help if needed.</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🩺 First Aid Guide</Text>
      <Text style={styles.subHeader}>Tap a topic to see step-by-step instructions</Text>

      {/* EMERGENCY CALL BANNER */}
      <View style={styles.callBanner}>
        <Text style={styles.callText}>⚠️ For life-threatening emergencies always call</Text>
        <Text style={styles.callNumber}>📞 911</Text>
      </View>

      {/* GUIDE CARDS */}
      {GUIDES.map((guide) => (
        <TouchableOpacity
          key={guide.id}
          style={[styles.guideCard, { borderLeftColor: guide.color }]}
          onPress={() => { setSelectedGuide(guide.id); resetSteps(); }}
        >
          <View style={[styles.guideCardIcon, { backgroundColor: guide.color + "22" }]}>
            <Text style={styles.guideCardEmoji}>{guide.icon}</Text>
          </View>
          <View style={styles.guideCardContent}>
            <Text style={styles.guideCardTitle}>{guide.title}</Text>
            <Text style={styles.guideCardSteps}>{guide.steps.length} steps</Text>
            {guide.emergency && (
              <Text style={styles.emergencyLabel}>🚨 Emergency</Text>
            )}
          </View>
          <Text style={styles.guideCardArrow}>›</Text>
        </TouchableOpacity>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  wrapper: { flex: 1, backgroundColor: "#fff" },
  header: { fontSize: 26, fontWeight: "bold", color: "#B00020", textAlign: "center", marginTop: 50, marginBottom: 5 },
  subHeader: { textAlign: "center", color: "#888", fontSize: 13, marginBottom: 20 },
  callBanner: {
    backgroundColor: "#B00020", borderRadius: 12,
    padding: 15, alignItems: "center", marginBottom: 20,
  },
  callText: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  callNumber: { color: "#fff", fontWeight: "bold", fontSize: 22, marginTop: 4 },
  guideCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 12, padding: 15,
    marginBottom: 12, borderLeftWidth: 5,
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 4,
  },
  guideCardIcon: { width: 55, height: 55, borderRadius: 15, justifyContent: "center", alignItems: "center", marginRight: 15 },
  guideCardEmoji: { fontSize: 28 },
  guideCardContent: { flex: 1 },
  guideCardTitle: { fontWeight: "bold", fontSize: 16, color: "#222" },
  guideCardSteps: { color: "#888", fontSize: 12, marginTop: 2 },
  emergencyLabel: { color: "#B00020", fontSize: 12, fontWeight: "bold", marginTop: 3 },
  guideCardArrow: { fontSize: 24, color: "#ccc" },
  guideHeader: { padding: 25, paddingTop: 55, alignItems: "center" },
  backButton: { position: "absolute", top: 50, left: 20 },
  backText: { color: "rgba(255,255,255,0.85)", fontSize: 16 },
  guideIcon: { fontSize: 50, marginBottom: 8 },
  guideHeaderTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  emergencyBadge: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8 },
  emergencyBadgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  progressContainer: { padding: 15, backgroundColor: "#f9f9f9", borderBottomWidth: 1, borderColor: "#eee" },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressText: { fontSize: 12, color: "#555" },
  progressBar: { height: 6, backgroundColor: "#eee", borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },
  stepsContainer: { flex: 1, padding: 15 },
  stepCard: {
    flexDirection: "row", backgroundColor: "#fff", borderRadius: 12,
    padding: 15, marginBottom: 10, borderWidth: 1, borderColor: "#eee",
    elevation: 1, shadowColor: "#000", shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 }, shadowRadius: 2,
  },
  stepLeft: { marginRight: 12 },
  stepNumber: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  stepNumberText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  stepContent: { flex: 1 },
  stepTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  stepIcon: { fontSize: 18, marginRight: 6 },
  stepTitle: { fontWeight: "bold", fontSize: 15, color: "#222" },
  stepDesc: { color: "#555", fontSize: 13, lineHeight: 20 },
  completedCard: { backgroundColor: "#e8f5e9", borderRadius: 12, padding: 20, alignItems: "center", marginTop: 10 },
  completedIcon: { fontSize: 40 },
  completedText: { fontWeight: "bold", fontSize: 18, color: "#2e7d32", marginTop: 8 },
  completedSub: { color: "#555", fontSize: 13, marginTop: 4, textAlign: "center" },
});
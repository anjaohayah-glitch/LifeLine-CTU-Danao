// app/checklist.js
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { useSettings } from "../context/SettingsContext";

const CHECKLISTS = [
  {
    id: "gobag", title: "🎒 Go Bag Checklist", color: "#B00020",
    description: "Essential items to prepare before any disaster",
    items: [
      "Bottled water (at least 3 liters per person)",
      "Non-perishable food (3-day supply)",
      "Flashlight with extra batteries",
      "First aid kit",
      "Whistle to signal for help",
      "Dust mask or N95 respirator",
      "Plastic sheeting and duct tape",
      "Moist towelettes and garbage bags",
      "Wrench or pliers to turn off utilities",
      "Manual can opener",
      "Local maps (printed)",
      "Cell phone with chargers and backup battery",
      "Important documents (IDs, insurance, passports)",
      "Emergency cash (small bills)",
      "Extra clothing and sturdy shoes",
      "Blanket or sleeping bag",
      "Prescription medications (7-day supply)",
      "Infant formula or baby supplies if needed",
      "Pet food and supplies if needed",
    ],
  },
  {
    id: "home", title: "🏠 Home Safety Checklist", color: "#1565C0",
    description: "Make your home safer before disaster strikes",
    items: [
      "Smoke detectors installed in every room",
      "Fire extinguisher accessible and charged",
      "Carbon monoxide detector installed",
      "Heavy furniture secured to walls",
      "Water heater strapped to wall studs",
      "Know how to shut off gas, water, electricity",
      "Clear gutters and drains regularly",
      "Trim trees near your home",
      "Reinforce garage doors",
      "Store flammable materials safely",
      "Check roof for loose or damaged shingles",
      "Seal cracks in walls and foundation",
      "Install storm shutters on windows",
      "Keep emergency supplies accessible",
      "Create a family emergency plan",
    ],
  },
  {
    id: "evacuation", title: "🚗 Evacuation Checklist", color: "#2e7d32",
    description: "Be ready to evacuate within minutes",
    items: [
      "Know your evacuation routes (at least 2)",
      "Identify nearest evacuation center",
      "Keep vehicle fuel tank at least half full",
      "Go bag packed and ready to grab",
      "Important documents in waterproof bag",
      "Notify family members of evacuation plan",
      "Arrange transportation if no vehicle",
      "Know pet-friendly evacuation shelters",
      "Turn off gas, water, electricity before leaving",
      "Lock your home before evacuating",
      "Take medications and medical equipment",
      "Bring phone charger and power bank",
      "Follow official evacuation orders",
      "Never drive through floodwater",
      "Check in with family after reaching safety",
    ],
  },
  {
    id: "school", title: "🏫 CTU Danao Campus Checklist", color: "#4527A0",
    description: "Campus-specific preparedness for students & staff",
    items: [
      "Know all campus emergency exits",
      "Locate nearest campus evacuation area",
      "Save CTU Danao DRRMO contact number",
      "Know location of campus first aid station",
      "Attend campus earthquake/fire drills",
      "Know the campus alarm signal meanings",
      "Identify safe spots in each classroom",
      "Know where fire extinguishers are located",
      "Save emergency contacts in your phone",
      "Know buddy system during emergencies",
      "Report hazards to campus security",
      "Keep important IDs always accessible",
      "Know assembly areas for each building",
      "Follow campus DRRMO announcements",
      "Join campus disaster response training",
    ],
  },
  {
    id: "medical", title: "💊 Medical Emergency Checklist", color: "#00695C",
    description: "Medical supplies and preparations",
    items: [
      "First aid kit stocked and accessible",
      "Prescription medications (7-day supply)",
      "Blood type card in wallet",
      "Medical history document prepared",
      "Allergy information written and stored",
      "Emergency contact numbers saved",
      "CPR knowledge — consider taking a course",
      "Thermometer and blood pressure monitor",
      "Sterile bandages and gauze",
      "Antiseptic wipes and solution",
      "Pain relievers (paracetamol, ibuprofen)",
      "Oral rehydration salts (ORS packets)",
      "Scissors and tweezers in kit",
      "Rubber gloves (at least 2 pairs)",
      "Emergency whistle attached to bag",
    ],
  },
];

export default function Checklist() {
  const [selectedList, setSelectedList] = useState(null);
  const [checked, setChecked] = useState({});
  const [savedProgress, setSavedProgress] = useState({});
  const { theme } = useSettings();
  const { bg, card, border, textDark, textMid, textLight, surface } = theme;

  useEffect(() => { loadProgress(); }, []);

  const loadProgress = async () => {
    try {
      const saved = await AsyncStorage.getItem("checklistProgress");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedProgress(parsed);
        setChecked(parsed);
      }
    } catch (error) { console.log(error); }
  };

  const saveProgress = async (newChecked) => {
    try {
      await AsyncStorage.setItem("checklistProgress", JSON.stringify(newChecked));
      setSavedProgress(newChecked);
    } catch (error) { console.log(error); }
  };

  const toggleItem = (listId, itemIndex) => {
    const key = `${listId}_${itemIndex}`;
    const newChecked = { ...checked, [key]: !checked[key] };
    setChecked(newChecked);
    saveProgress(newChecked);
  };

  const getProgress = (listId, totalItems) => {
    const done = Array.from({ length: totalItems }, (_, i) =>
      checked[`${listId}_${i}`]
    ).filter(Boolean).length;
    return { done, total: totalItems, percent: (done / totalItems) * 100 };
  };

  const resetList = (listId, totalItems) => {
    Alert.alert("Reset Checklist", "Clear all checks for this list?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset", style: "destructive",
        onPress: () => {
          const newChecked = { ...checked };
          Array.from({ length: totalItems }, (_, i) => { delete newChecked[`${listId}_${i}`]; });
          setChecked(newChecked);
          saveProgress(newChecked);
        },
      },
    ]);
  };

  if (selectedList) {
    const list = CHECKLISTS.find((l) => l.id === selectedList);
    const { done, total, percent } = getProgress(list.id, list.items.length);

    return (
      <View style={[styles.wrapper, { backgroundColor: bg }]}>

        {/* HEADER */}
        <View style={[styles.detailHeader, { backgroundColor: list.color }]}>
          <TouchableOpacity onPress={() => setSelectedList(null)} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.detailTitle}>{list.title}</Text>
          <Text style={styles.detailDesc}>{list.description}</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>{done}/{total} completed</Text>
              <Text style={styles.progressText}>{Math.round(percent)}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${percent}%` }]} />
            </View>
          </View>
        </View>

        {/* RESET BUTTON */}
        <TouchableOpacity
          style={[styles.resetButton, { borderColor: border }]}
          onPress={() => resetList(list.id, list.items.length)}
        >
          <Text style={[styles.resetText, { color: textMid }]}>🔄 Reset Checklist</Text>
        </TouchableOpacity>

        <ScrollView style={[styles.itemsContainer, { backgroundColor: bg }]}>
          {list.items.map((item, index) => {
            const key = `${list.id}_${index}`;
            const isChecked = !!checked[key];
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.itemCard,
                  { backgroundColor: card, borderColor: border },
                  isChecked && { backgroundColor: surface, borderColor: border },
                ]}
                onPress={() => toggleItem(list.id, index)}
              >
                <View style={[
                  styles.checkbox,
                  { borderColor: list.color },
                  isChecked && { backgroundColor: list.color },
                ]}>
                  {isChecked && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[
                  styles.itemText,
                  { color: textDark },
                  isChecked && { color: textLight, textDecorationLine: "line-through" },
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}

          {done === total && (
            <View style={[styles.completedCard, { borderColor: list.color, backgroundColor: surface }]}>
              <Text style={styles.completedIcon}>🎉</Text>
              <Text style={[styles.completedTitle, { color: list.color }]}>Checklist Complete!</Text>
              <Text style={[styles.completedSub, { color: textMid }]}>Great job! You are well prepared.</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]}>
      <Text style={styles.header}>✅ Preparedness Checklists</Text>
      <Text style={[styles.subHeader, { color: textLight }]}>
        Track your disaster readiness — progress saves automatically
      </Text>

      {CHECKLISTS.map((list) => {
        const { done, total, percent } = getProgress(list.id, list.items.length);
        return (
          <TouchableOpacity
            key={list.id}
            style={[styles.listCard, { backgroundColor: card, borderLeftColor: list.color }]}
            onPress={() => setSelectedList(list.id)}
          >
            <View style={styles.listCardTop}>
              <Text style={[styles.listTitle, { color: textDark }]}>{list.title}</Text>
              <Text style={[styles.listPercent, { color: list.color }]}>{Math.round(percent)}%</Text>
            </View>
            <Text style={[styles.listDesc, { color: textMid }]}>{list.description}</Text>
            <View style={[styles.miniProgressBar, { backgroundColor: border }]}>
              <View style={[styles.miniProgressFill, { width: `${percent}%`, backgroundColor: list.color }]} />
            </View>
            <Text style={[styles.listCount, { color: textLight }]}>{done}/{total} items completed</Text>
          </TouchableOpacity>
        );
      })}

      {/* OVERALL PROGRESS */}
      <View style={[styles.overallCard, { backgroundColor: card, borderColor: border }]}>
        <Text style={[styles.overallTitle, { color: textDark }]}>📊 Overall Preparedness</Text>
        {(() => {
          const totalAll = CHECKLISTS.reduce((acc, l) => acc + l.items.length, 0);
          const doneAll = CHECKLISTS.reduce((acc, l) => {
            return acc + l.items.filter((_, i) => checked[`${l.id}_${i}`]).length;
          }, 0);
          const pct = Math.round((doneAll / totalAll) * 100);
          return (
            <>
              <Text style={styles.overallPercent}>{pct}% Ready</Text>
              <View style={[styles.overallBar, { backgroundColor: border }]}>
                <View style={[styles.overallFill, { width: `${pct}%` }]} />
              </View>
              <Text style={[styles.overallCount, { color: textLight }]}>{doneAll} of {totalAll} total items completed</Text>
            </>
          );
        })()}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  wrapper: { flex: 1 },
  header: { fontSize: 26, fontWeight: "bold", color: COLORS.primary, textAlign: "center", marginTop: 50, marginBottom: 5 },
  subHeader: { textAlign: "center", fontSize: 13, marginBottom: 25 },
  listCard: { borderRadius: 15, padding: 18, marginBottom: 14, borderLeftWidth: 5, elevation: 3, shadowColor: "#000", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  listCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  listTitle: { fontWeight: "bold", fontSize: 16, flex: 1 },
  listPercent: { fontWeight: "bold", fontSize: 18 },
  listDesc: { fontSize: 12, marginTop: 4, marginBottom: 10 },
  miniProgressBar: { height: 6, borderRadius: 3, marginBottom: 6 },
  miniProgressFill: { height: 6, borderRadius: 3 },
  listCount: { fontSize: 11 },
  overallCard: { borderRadius: 15, padding: 20, marginTop: 5, borderWidth: 1, alignItems: "center" },
  overallTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 8 },
  overallPercent: { fontSize: 32, fontWeight: "bold", color: COLORS.primary },
  overallBar: { width: "100%", height: 10, borderRadius: 5, marginVertical: 10 },
  overallFill: { height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  overallCount: { fontSize: 13 },
  detailHeader: { padding: 20, paddingTop: 55, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  backButton: { marginBottom: 10 },
  backText: { color: "rgba(255,255,255,0.85)", fontSize: 16 },
  detailTitle: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  detailDesc: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginBottom: 15 },
  progressContainer: {},
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressText: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  progressBar: { height: 8, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 4 },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: "#fff" },
  resetButton: { alignSelf: "flex-end", margin: 15, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  resetText: { fontSize: 13 },
  itemsContainer: { flex: 1, paddingHorizontal: 15 },
  itemCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, elevation: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2 },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, justifyContent: "center", alignItems: "center", marginRight: 12 },
  checkmark: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  itemText: { flex: 1, fontSize: 14, lineHeight: 20 },
  completedCard: { alignItems: "center", padding: 25, borderRadius: 15, borderWidth: 2, marginTop: 10 },
  completedIcon: { fontSize: 45 },
  completedTitle: { fontSize: 20, fontWeight: "bold", marginTop: 10 },
  completedSub: { fontSize: 13, marginTop: 5 },
});
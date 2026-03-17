// app/hotlines.js
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSettings } from "../context/SettingsContext";

const HOTLINES = [
  {
    category: "🚨 National Emergency",
    items: [
      { name: "National Emergency Hotline", number: "911", description: "Police, Fire, Medical" },
      { name: "Philippine Red Cross", number: "143", description: "Disaster response & relief" },
      { name: "NDRRMC Operations Center", number: "02-8911-5061", description: "National disaster risk reduction" },
    ],
  },
  {
    category: "🏥 Medical",
    items: [
      { name: "DOH Emergency Hotline", number: "1555", description: "Department of Health" },
      { name: "Emergency Medical Services", number: "0917-898-7272", description: "Ambulance & medical response" },
      { name: "Philippine General Hospital", number: "02-8554-8400", description: "24/7 emergency services" },
    ],
  },
  {
    category: "🌊 Disaster & Weather",
    items: [
      { name: "PAGASA Weather Hotline", number: "02-8284-0800", description: "Weather forecasts & typhoon updates" },
      { name: "PHIVOLCS", number: "02-8426-1468", description: "Earthquake & volcano monitoring" },
      { name: "Mines and Geosciences Bureau", number: "02-8920-9286", description: "Landslide & ground hazards" },
    ],
  },
  {
    category: "🚒 Local — Danao City",
    items: [
      { name: "Danao City Disaster Risk Reduction", number: "0917-723-6262", description: "Local DRRMO" },
      { name: "Danao City Police Station", number: "032-200-3701", description: "Local police emergency" },
      { name: "Danao City Fire Station", number: "032-200-3700", description: "Fire & rescue" },
      { name: "Danao City Health Office", number: "032-200-3705", description: "Local health emergency" },
    ],
  },
  {
    category: "⚡ Utilities",
    items: [
      { name: "VECO / Meralco Emergency", number: "1-800-10-MERALCO", description: "Power outage & electrical emergency" },
      { name: "MCWD Water Emergency", number: "032-232-3587", description: "Water supply emergency" },
    ],
  },
];

export default function Hotlines() {
  const { theme } = useSettings();
  const { bg, card, border, textDark, textLight } = theme;

  const handleCall = (number) => { Linking.openURL(`tel:${number}`); };

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]}>
      <Text style={styles.header}>📞 Emergency Hotlines</Text>
      <Text style={[styles.subHeader, { color: textLight }]}>Tap any number to call directly</Text>

      {HOTLINES.map((section, sIndex) => (
        <View key={sIndex} style={styles.section}>
          <Text style={[styles.categoryTitle, { borderColor: theme.bg === "#121212" ? "#5a2020" : "#ffcccc" }]}>
            {section.category}
          </Text>
          {section.items.map((item, iIndex) => (
            <TouchableOpacity
              key={iIndex}
              style={[styles.card, {
                backgroundColor: theme.bg === "#121212" ? "#2a1010" : "#fff0f0",
                borderColor: theme.bg === "#121212" ? "#5a2020" : "#ffcccc",
              }]}
              onPress={() => handleCall(item.number)}
            >
              <View style={styles.cardLeft}>
                <Text style={[styles.name, { color: textDark }]}>{item.name}</Text>
                <Text style={[styles.description, { color: textLight }]}>{item.description}</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.number}>{item.number}</Text>
                <View style={styles.callBadge}>
                  <Text style={styles.callText}>📲 Call</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { fontSize: 26, fontWeight: "bold", color: "#B00020", textAlign: "center", marginTop: 50, marginBottom: 5 },
  subHeader: { textAlign: "center", fontSize: 13, marginBottom: 25 },
  section: { marginBottom: 20 },
  categoryTitle: { fontSize: 16, fontWeight: "bold", color: "#B00020", marginBottom: 10, borderBottomWidth: 1, paddingBottom: 5 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLeft: { flex: 1, paddingRight: 10 },
  name: { fontWeight: "bold", fontSize: 14 },
  description: { fontSize: 12, marginTop: 3 },
  cardRight: { alignItems: "flex-end" },
  number: { fontWeight: "bold", color: "#B00020", fontSize: 13 },
  callBadge: { backgroundColor: "#B00020", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 5 },
  callText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
});
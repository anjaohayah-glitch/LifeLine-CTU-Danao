// app/hotlines.js
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSettings } from "../context/SettingsContext";

const HOTLINES = [
  {
    category: "National Emergency",
    icon: "alarm-light",
    items: [
      { name: "National Emergency Hotline", number: "911", description: "Police, Fire, Medical" },
      { name: "Philippine Red Cross", number: "143", description: "Disaster response & relief" },
      { name: "NDRRMC Operations Center", number: "02-8911-5061", description: "National disaster risk reduction" },
    ],
  },
  {
    category: "Medical",
    icon: "hospital-building",
    items: [
      { name: "DOH Emergency Hotline", number: "1555", description: "Department of Health" },
      { name: "Emergency Medical Services", number: "0917-898-7272", description: "Ambulance & medical response" },
      { name: "Philippine General Hospital", number: "02-8554-8400", description: "24/7 emergency services" },
    ],
  },
  {
    category: "Disaster & Weather",
    icon: "weather-lightning-rainy",
    items: [
      { name: "PAGASA Weather Hotline", number: "02-8284-0800", description: "Weather forecasts & typhoon updates" },
      { name: "PHIVOLCS", number: "02-8426-1468", description: "Earthquake & volcano monitoring" },
      { name: "Mines and Geosciences Bureau", number: "02-8920-9286", description: "Landslide & ground hazards" },
    ],
  },
  {
    category: "Local - Danao City",
    icon: "fire-truck",
    items: [
      { name: "Danao City Disaster Risk Reduction", number: "0917-723-6262", description: "Local DRRMO" },
      { name: "Danao City Police Station", number: "032-200-3701", description: "Local police emergency" },
      { name: "Danao City Fire Station", number: "032-200-3700", description: "Fire & rescue" },
      { name: "Danao City Health Office", number: "032-200-3705", description: "Local health emergency" },
    ],
  },
  {
    category: "Utilities",
    icon: "flash",
    items: [
      { name: "VECO / Meralco Emergency", number: "1-800-10-MERALCO", description: "Power outage & electrical emergency" },
      { name: "MCWD Water Emergency", number: "032-232-3587", description: "Water supply emergency" },
    ],
  },
];

export default function Hotlines() {
  const { theme, t } = useSettings();
  const { bg, textDark, textLight } = theme;

  const handleCall = (number) => { Linking.openURL(`tel:${number}`); };

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.headerRow}>
        <Ionicons name="call" size={28} color="#B00020" />
        <Text style={styles.header}>{t("emergency_hotlines")}</Text>
      </View>
      <Text style={[styles.subHeader, { color: textLight }]}>{t("tap_number_call")}</Text>

      {HOTLINES.map((section, sIndex) => (
        <View key={sIndex} style={styles.section}>
          <View style={[styles.categoryTitleRow, { borderColor: theme.bg === "#121212" ? "#5a2020" : "#ffcccc" }]}>
            <MaterialCommunityIcons name={section.icon} size={18} color="#B00020" />
            <Text style={styles.categoryTitle}>{section.category}</Text>
          </View>
          {section.items.map((item, iIndex) => (
            <TouchableOpacity
              key={iIndex}
              style={[styles.card, {
                backgroundColor: theme.bg === "#121212" ? "#1e1e1e" : "#ffffff",
                borderColor: theme.bg === "#121212" ? "#333333" : "#e0e0e0",
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
                  <Ionicons name="call" size={12} color="#fff" />
                  <Text style={styles.callText}>{t("call")}</Text>
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
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 50, marginBottom: 5 },
  header: { fontSize: 26, fontWeight: "bold", color: "#B00020", textAlign: "center" },
  subHeader: { textAlign: "center", fontSize: 13, marginBottom: 25 },
  section: { marginBottom: 20 },
  categoryTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, borderBottomWidth: 1, paddingBottom: 5 },
  categoryTitle: { fontSize: 16, fontWeight: "bold", color: "#B00020" },
  card: { borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLeft: { flex: 1, paddingRight: 10 },
  name: { fontWeight: "bold", fontSize: 14 },
  description: { fontSize: 12, marginTop: 3 },
  cardRight: { alignItems: "flex-end" },
  number: { fontWeight: "bold", color: "#B00020", fontSize: 13 },
  callBadge: { backgroundColor: "#B00020", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 5, flexDirection: "row", alignItems: "center", gap: 4 },
  callText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
});

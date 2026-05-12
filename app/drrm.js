// app/drrm.js
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

const SAFE_ZONES = [
  { id: 1, name: "CTU Danao Main Building", description: "Primary evacuation assembly area", latitude: 10.5167, longitude: 124.0333, type: "primary", capacity: "500+ persons" },
  { id: 2, name: "CTU Danao Covered Court", description: "Secondary evacuation center", latitude: 10.5172, longitude: 124.0338, type: "primary", capacity: "300+ persons" },
  { id: 3, name: "CTU Danao Open Grounds", description: "Earthquake assembly point", latitude: 10.5162, longitude: 124.0328, type: "assembly", capacity: "1000+ persons" },
  { id: 4, name: "CTU Danao Gymnasium", description: "Typhoon & flood shelter", latitude: 10.5175, longitude: 124.0325, type: "primary", capacity: "400+ persons" },
  { id: 5, name: "CTU Danao Gate 1 Assembly", description: "Fire emergency assembly point", latitude: 10.5158, longitude: 124.0340, type: "assembly", capacity: "200+ persons" },
];

const HAZARD_ZONES = [
  { id: 1, name: "Flood Risk Area", description: "Low-lying area near river" },
  { id: 2, name: "Landslide Risk Area", description: "Steep slope near barangay" },
  { id: 3, name: "Fire Hazard Zone", description: "High density area near market" },
];

const DRRM_CONTENT = [
  {
    id: 1, title: "What is DRRM?", icon: "book-open-page-variant", color: "#1565C0",
    content: [
      { heading: "Definition", text: "Disaster Risk Reduction and Management (DRRM) is the systematic approach to identifying, assessing, and reducing risks of disaster. It aims to reduce socioeconomic vulnerabilities and deal with environmental and other hazards." },
      { heading: "Republic Act 10121", text: "The Philippine DRRM Act of 2010 (RA 10121) provides for the development of policies and plans to strengthen disaster risk reduction and management in the Philippines." },
      { heading: "4 Thematic Areas", text: "1. Disaster Prevention & Mitigation\n2. Disaster Preparedness\n3. Disaster Response\n4. Disaster Rehabilitation & Recovery" },
    ],
  },
  {
    id: 2, title: "DRRM in Campus", icon: "school", color: "#4527A0",
    content: [
      { heading: "Campus DRRMO", text: "CTU Danao has a designated Disaster Risk Reduction and Management Office (DRRMO) responsible for coordinating disaster preparedness, response, and recovery activities within the campus." },
      { heading: "Student Responsibilities", text: "Every student is expected to:\n• Know campus emergency exits\n• Attend disaster drills\n• Report hazards immediately\n• Follow DRRMO instructions\n• Help classmates during emergencies" },
      { heading: "Faculty Responsibilities", text: "Faculty members serve as first responders in classrooms, guiding students to safety and accounting for all persons during evacuations." },
    ],
  },
  {
    id: 3, title: "Disaster Risk Cycle", icon: "sync", color: "#00695C",
    content: [
      { heading: "Prevention", text: "Actions taken to avoid existing and new disaster risks. Includes building codes, land-use planning, and environmental protection measures." },
      { heading: "Mitigation", text: "Measures to lessen the impact of disasters. Examples: flood control systems, earthquake-resistant buildings, fire sprinkler systems." },
      { heading: "Preparedness", text: "Activities that build capacity to respond effectively. Includes drills, training, early warning systems, and emergency planning." },
      { heading: "Response", text: "Actions taken immediately before, during, and after a disaster. Includes evacuation, search & rescue, and emergency medical services." },
      { heading: "Recovery", text: "Restoring and improving livelihoods and health after a disaster. Includes rebuilding infrastructure and psychological support." },
    ],
  },
  {
    id: 4, title: "Early Warning Systems", icon: "alert", color: "#E65100",
    content: [
      { heading: "PAGASA Signals", text: "Signal #1: Winds 60-89 km/h\nSignal #2: Winds 90-120 km/h\nSignal #3: Winds 121-170 km/h\nSignal #4: Winds 171-220 km/h\nSignal #5: Winds above 220 km/h" },
      { heading: "Earthquake Intensity Scale", text: "Intensity I-II: Scarcely perceptible\nIntensity III-IV: Slightly strong\nIntensity V: Strong\nIntensity VI-VII: Very Strong\nIntensity VIII+: Destructive" },
      { heading: "Flood Warning Levels", text: "Level 1 (Advisory): Flooding possible in low areas\nLevel 2 (Warning): Flooding expected\nLevel 3 (Critical): Evacuation recommended" },
    ],
  },
  {
    id: 5, title: "Community Resilience", icon: "arm-flex", color: "#B00020",
    content: [
      { heading: "What is Resilience?", text: "Community resilience is the ability of a community to withstand, adapt to, and recover from adversity, trauma, tragedy, or significant sources of stress." },
      { heading: "Building Resilience", text: "• Stay informed about local hazards\n• Participate in community drills\n• Help neighbors prepare\n• Support local DRRM programs\n• Share knowledge with others" },
      { heading: "Role of Technology", text: "Mobile apps like LIFELINE play a critical role in modern disaster management by providing real-time alerts, offline guides, and communication tools to communities." },
    ],
  },
];

export default function DRRM() {
  const [activeTab, setActiveTab] = useState("map");
  const [selectedContent, setSelectedContent] = useState(null);
  const { theme, t } = useSettings();
  const { bg, card, border, textDark, textMid, textLight } = theme;

  return (
    <View style={[styles.wrapper, { backgroundColor: bg }]}>

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <MaterialCommunityIcons name="shield-home" size={24} color="#fff" />
          <Text style={styles.headerTitle}>{t("drrm_safe_zones")}</Text>
        </View>
        <Text style={styles.headerSub}>{t("drrm_sub")}</Text>
      </View>

      {/* TABS */}
      <View style={[styles.tabs, { borderColor: border }]}>
        {[
          { key: "map", label: t("safe_zones"), icon: "map" },
          { key: "awareness", label: t("drrm_awareness"), icon: "book-open-variant" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => { setActiveTab(tab.key); setSelectedContent(null); }}
          >
            <View style={styles.tabInner}>
              <MaterialCommunityIcons name={tab.icon} size={16} color={activeTab === tab.key ? COLORS.primary : textLight} />
              <Text style={[styles.tabText, { color: textLight }, activeTab === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* SAFE ZONES TAB */}
      {activeTab === "map" && (
        <ScrollView style={[styles.container, { backgroundColor: bg }]}>

          <TouchableOpacity
            style={[styles.openMapCard, { backgroundColor: card, borderColor: border }]}
            onPress={() => Linking.openURL("https://www.google.com/maps/search/?api=1&query=CTU+Danao+Campus+Cebu")}
          >
            <MaterialCommunityIcons name="map" size={35} color={COLORS.primary} style={styles.openMapIcon} />
            <View style={styles.openMapContent}>
              <Text style={styles.openMapTitle}>{t("view_ctu_maps")}</Text>
              <Text style={[styles.openMapDesc, { color: textLight }]}>{t("see_campus_layout")}</Text>
            </View>
            <Text style={[styles.openMapArrow, { color: textLight }]}>›</Text>
          </TouchableOpacity>

          <View style={styles.sectionTitleRow}>
            <Ionicons name="location" size={18} color={textDark} />
            <Text style={[styles.sectionTitle, { color: textDark }]}>{t("ctu_safe_zones")}</Text>
          </View>
          {SAFE_ZONES.map((zone) => (
            <TouchableOpacity
              key={zone.id}
              style={[styles.zoneCard, { backgroundColor: card, borderColor: border }]}
              onPress={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${zone.latitude},${zone.longitude}&travelmode=walking`;
                Linking.openURL(url);
              }}
            >
              <View style={[styles.zoneIconBox, {
                backgroundColor: zone.type === "primary"
                  ? (theme.bg === "#121212" ? "#1a3a1a" : "#e8f5e9")
                  : (theme.bg === "#121212" ? "#0d2137" : "#e3f2fd")
              }]}>
                <MaterialCommunityIcons name={zone.type === "primary" ? "home" : "flag"} size={24} color={zone.type === "primary" ? "#2e7d32" : "#1565C0"} />
              </View>
              <View style={styles.zoneInfo}>
                <Text style={[styles.zoneName, { color: textDark }]}>{zone.name}</Text>
                <Text style={[styles.zoneDesc, { color: textLight }]}>{zone.description}</Text>
                <View style={styles.zoneCapacityRow}>
                  <Ionicons name="people" size={12} color={textLight} />
                  <Text style={[styles.zoneCapacity, { color: textLight }]}>{zone.capacity}</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="map-marker-path" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          ))}

          <View style={styles.sectionTitleRow}>
            <Ionicons name="warning" size={18} color={textDark} />
            <Text style={[styles.sectionTitle, { color: textDark }]}>{t("hazard_zones")}</Text>
          </View>
          {HAZARD_ZONES.map((zone) => (
            <View key={zone.id} style={[styles.hazardCard, {
              backgroundColor: theme.bg === "#121212" ? "#2a1010" : "#fff3f3",
              borderColor: theme.bg === "#121212" ? "#5a2020" : "#ffcccc",
            }]}>
              <View style={styles.hazardDot} />
              <View style={styles.hazardInfo}>
                <Text style={[styles.hazardName, { color: textDark }]}>{zone.name}</Text>
                <Text style={[styles.hazardDesc, { color: textLight }]}>{zone.description}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.hotlineCard} onPress={() => Linking.openURL("tel:09177236262")}>
            <Ionicons name="call" size={35} color="#fff" style={styles.hotlineIcon} />
            <View style={styles.hotlineInfo}>
              <Text style={styles.hotlineTitle}>{t("ctu_drrmo_hotline")}</Text>
              <Text style={styles.hotlineNumber}>0917-723-6262</Text>
              <Text style={styles.hotlineTap}>{t("call_now")}</Text>
            </View>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* DRRM AWARENESS TAB */}
      {activeTab === "awareness" && (
        <View style={{ flex: 1 }}>
          {selectedContent ? (
            <ScrollView style={[styles.container, { backgroundColor: bg }]}>
              <TouchableOpacity style={styles.backButton} onPress={() => setSelectedContent(null)}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
              <View style={[styles.contentHeader, { backgroundColor: selectedContent.color }]}>
                <MaterialCommunityIcons name={selectedContent.icon} size={45} color="#fff" style={styles.contentHeaderIcon} />
                <Text style={styles.contentHeaderTitle}>{selectedContent.title}</Text>
              </View>
              {selectedContent.content.map((section, index) => (
                <View key={index} style={[styles.contentSection, { backgroundColor: card, borderColor: border }]}>
                  <Text style={[styles.contentHeading, { color: selectedContent.color }]}>{section.heading}</Text>
                  <Text style={[styles.contentText, { color: textMid }]}>{section.text}</Text>
                </View>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          ) : (
            <ScrollView style={[styles.container, { backgroundColor: bg }]}>
              <Text style={[styles.awarenessIntro, { color: textMid }]}>
                Learn about Disaster Risk Reduction and Management to stay informed and prepared.
              </Text>
              {DRRM_CONTENT.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.awarenessCard, { backgroundColor: card, borderLeftColor: item.color }]}
                  onPress={() => setSelectedContent(item)}
                >
                  <View style={[styles.awarenessIcon, { backgroundColor: item.color + "20" }]}>
                    <MaterialCommunityIcons name={item.icon} size={28} color={item.color} />
                  </View>
                  <View style={styles.awarenessContent}>
                    <Text style={[styles.awarenessTitle, { color: textDark }]}>{item.title}</Text>
                    <Text style={[styles.awarenessSub, { color: textLight }]}>{item.content.length} topics • Tap to read</Text>
                  </View>
                  <Text style={[styles.awarenessArrow, { color: textLight }]}>›</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={styles.hotlineCard} onPress={() => Linking.openURL("tel:09177236262")}>
                <Ionicons name="call" size={35} color="#fff" style={styles.hotlineIcon} />
                <View style={styles.hotlineInfo}>
                  <Text style={styles.hotlineTitle}>{t("ctu_drrmo_hotline")}</Text>
                  <Text style={styles.hotlineNumber}>0917-723-6262</Text>
                  <Text style={styles.hotlineTap}>{t("call_now")}</Text>
                </View>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  header: { backgroundColor: COLORS.primary, paddingTop: 55, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, marginBottom: 5 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, marginHorizontal: 20, marginTop: 10, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14 },
  activeTabText: { color: COLORS.primary, fontWeight: "bold" },
  container: { flex: 1, paddingHorizontal: 20 },
  openMapCard: { flexDirection: "row", alignItems: "center", borderRadius: 15, padding: 15, marginBottom: 20, marginTop: 10, borderWidth: 1, elevation: 2 },
  openMapIcon: { marginRight: 12 },
  openMapContent: { flex: 1 },
  openMapTitle: { fontWeight: "bold", color: COLORS.primary, fontSize: 14 },
  openMapDesc: { fontSize: 12, marginTop: 3 },
  openMapArrow: { fontSize: 22 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, marginTop: 5 },
  sectionTitle: { fontSize: 16, fontWeight: "bold" },
  zoneCard: { flexDirection: "row", alignItems: "center", borderRadius: 15, padding: 14, marginBottom: 10, elevation: 3, shadowColor: "#000", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, borderWidth: 1 },
  zoneIconBox: { width: 46, height: 46, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 12 },
  zoneInfo: { flex: 1 },
  zoneName: { fontWeight: "bold", fontSize: 13 },
  zoneDesc: { fontSize: 11, marginTop: 2 },
  zoneCapacityRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  zoneCapacity: { fontSize: 11 },
  hazardCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1 },
  hazardDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary, marginRight: 12 },
  hazardInfo: { flex: 1 },
  hazardName: { fontWeight: "bold", fontSize: 13 },
  hazardDesc: { fontSize: 12, marginTop: 2 },
  hotlineCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.primary, borderRadius: 15, padding: 16, marginTop: 15, marginBottom: 10 },
  hotlineIcon: { marginRight: 14 },
  hotlineInfo: { flex: 1 },
  hotlineTitle: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  hotlineNumber: { color: "#fff", fontWeight: "bold", fontSize: 18, marginTop: 2 },
  hotlineTap: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 },
  awarenessIntro: { fontSize: 13, lineHeight: 20, marginBottom: 20, textAlign: "center", marginTop: 10 },
  awarenessCard: { flexDirection: "row", alignItems: "center", borderRadius: 15, padding: 15, marginBottom: 12, borderLeftWidth: 5, elevation: 3, shadowColor: "#000", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  awarenessIcon: { width: 55, height: 55, borderRadius: 15, justifyContent: "center", alignItems: "center", marginRight: 14 },
  awarenessContent: { flex: 1 },
  awarenessTitle: { fontWeight: "bold", fontSize: 15 },
  awarenessSub: { fontSize: 12, marginTop: 3 },
  awarenessArrow: { fontSize: 24 },
  backButton: { marginBottom: 15, marginTop: 5 },
  backText: { color: COLORS.primary, fontSize: 16, fontWeight: "bold" },
  contentHeader: { borderRadius: 15, padding: 20, alignItems: "center", marginBottom: 20 },
  contentHeaderIcon: { marginBottom: 8 },
  contentHeaderTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  contentSection: { borderRadius: 12, padding: 15, marginBottom: 12, borderWidth: 1 },
  contentHeading: { fontWeight: "bold", fontSize: 15, marginBottom: 8 },
  contentText: { fontSize: 14, lineHeight: 22 },
});

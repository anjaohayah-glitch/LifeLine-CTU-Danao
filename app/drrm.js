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
import { COLORS } from "../constants/colors";

const SAFE_ZONES = [
  {
    id: 1,
    name: "CTU Danao Main Building",
    description: "Primary evacuation assembly area",
    latitude: 10.5167,
    longitude: 124.0333,
    type: "primary",
    capacity: "500+ persons",
  },
  {
    id: 2,
    name: "CTU Danao Covered Court",
    description: "Secondary evacuation center",
    latitude: 10.5172,
    longitude: 124.0338,
    type: "primary",
    capacity: "300+ persons",
  },
  {
    id: 3,
    name: "CTU Danao Open Grounds",
    description: "Earthquake assembly point",
    latitude: 10.5162,
    longitude: 124.0328,
    type: "assembly",
    capacity: "1000+ persons",
  },
  {
    id: 4,
    name: "CTU Danao Gymnasium",
    description: "Typhoon & flood shelter",
    latitude: 10.5175,
    longitude: 124.0325,
    type: "primary",
    capacity: "400+ persons",
  },
  {
    id: 5,
    name: "CTU Danao Gate 1 Assembly",
    description: "Fire emergency assembly point",
    latitude: 10.5158,
    longitude: 124.0340,
    type: "assembly",
    capacity: "200+ persons",
  },
];

const HAZARD_ZONES = [
  { id: 1, name: "Flood Risk Area", description: "Low-lying area near river" },
  { id: 2, name: "Landslide Risk Area", description: "Steep slope near barangay" },
  { id: 3, name: "Fire Hazard Zone", description: "High density area near market" },
];

const DRRM_CONTENT = [
  {
    id: 1,
    title: "What is DRRM?",
    icon: "📖",
    color: "#1565C0",
    content: [
      {
        heading: "Definition",
        text: "Disaster Risk Reduction and Management (DRRM) is the systematic approach to identifying, assessing, and reducing risks of disaster. It aims to reduce socioeconomic vulnerabilities and deal with environmental and other hazards.",
      },
      {
        heading: "Republic Act 10121",
        text: "The Philippine DRRM Act of 2010 (RA 10121) provides for the development of policies and plans to strengthen disaster risk reduction and management in the Philippines.",
      },
      {
        heading: "4 Thematic Areas",
        text: "1. Disaster Prevention & Mitigation\n2. Disaster Preparedness\n3. Disaster Response\n4. Disaster Rehabilitation & Recovery",
      },
    ],
  },
  {
    id: 2,
    title: "DRRM in Campus",
    icon: "🏫",
    color: "#4527A0",
    content: [
      {
        heading: "Campus DRRMO",
        text: "CTU Danao has a designated Disaster Risk Reduction and Management Office (DRRMO) responsible for coordinating disaster preparedness, response, and recovery activities within the campus.",
      },
      {
        heading: "Student Responsibilities",
        text: "Every student is expected to:\n• Know campus emergency exits\n• Attend disaster drills\n• Report hazards immediately\n• Follow DRRMO instructions\n• Help classmates during emergencies",
      },
      {
        heading: "Faculty Responsibilities",
        text: "Faculty members serve as first responders in classrooms, guiding students to safety and accounting for all persons during evacuations.",
      },
    ],
  },
  {
    id: 3,
    title: "Disaster Risk Cycle",
    icon: "🔄",
    color: "#00695C",
    content: [
      {
        heading: "Prevention",
        text: "Actions taken to avoid existing and new disaster risks. Includes building codes, land-use planning, and environmental protection measures.",
      },
      {
        heading: "Mitigation",
        text: "Measures to lessen the impact of disasters. Examples: flood control systems, earthquake-resistant buildings, fire sprinkler systems.",
      },
      {
        heading: "Preparedness",
        text: "Activities that build capacity to respond effectively. Includes drills, training, early warning systems, and emergency planning.",
      },
      {
        heading: "Response",
        text: "Actions taken immediately before, during, and after a disaster. Includes evacuation, search & rescue, and emergency medical services.",
      },
      {
        heading: "Recovery",
        text: "Restoring and improving livelihoods and health after a disaster. Includes rebuilding infrastructure and psychological support.",
      },
    ],
  },
  {
    id: 4,
    title: "Early Warning Systems",
    icon: "⚠️",
    color: "#E65100",
    content: [
      {
        heading: "PAGASA Signals",
        text: "Signal #1: Winds 60-89 km/h\nSignal #2: Winds 90-120 km/h\nSignal #3: Winds 121-170 km/h\nSignal #4: Winds 171-220 km/h\nSignal #5: Winds above 220 km/h",
      },
      {
        heading: "Earthquake Intensity Scale",
        text: "Intensity I-II: Scarcely perceptible\nIntensity III-IV: Slightly strong\nIntensity V: Strong\nIntensity VI-VII: Very Strong\nIntensity VIII+: Destructive",
      },
      {
        heading: "Flood Warning Levels",
        text: "Level 1 (Advisory): Flooding possible in low areas\nLevel 2 (Warning): Flooding expected\nLevel 3 (Critical): Evacuation recommended",
      },
    ],
  },
  {
    id: 5,
    title: "Community Resilience",
    icon: "💪",
    color: "#B00020",
    content: [
      {
        heading: "What is Resilience?",
        text: "Community resilience is the ability of a community to withstand, adapt to, and recover from adversity, trauma, tragedy, or significant sources of stress.",
      },
      {
        heading: "Building Resilience",
        text: "• Stay informed about local hazards\n• Participate in community drills\n• Help neighbors prepare\n• Support local DRRM programs\n• Share knowledge with others",
      },
      {
        heading: "Role of Technology",
        text: "Mobile apps like LIFELINE play a critical role in modern disaster management by providing real-time alerts, offline guides, and communication tools to communities.",
      },
    ],
  },
];

export default function DRRM() {
  const [activeTab, setActiveTab] = useState("map");
  const [selectedContent, setSelectedContent] = useState(null);

  return (
    <View style={styles.wrapper}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛡 DRRM & Safe Zones</Text>
        <Text style={styles.headerSub}>CTU Danao Campus Safety Information</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        {[
          { key: "map", label: "🗺 Safe Zones" },
          { key: "awareness", label: "📚 DRRM Awareness" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => { setActiveTab(tab.key); setSelectedContent(null); }}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 🗺 SAFE ZONES TAB */}
      {activeTab === "map" && (
        <ScrollView style={styles.container}>

          {/* OPEN MAP BUTTON */}
          <TouchableOpacity
            style={styles.openMapCard}
            onPress={() => Linking.openURL("https://www.google.com/maps/search/?api=1&query=CTU+Danao+Campus+Cebu")}
          >
            <Text style={styles.openMapIcon}>🗺</Text>
            <View style={styles.openMapContent}>
              <Text style={styles.openMapTitle}>View CTU Danao on Google Maps</Text>
              <Text style={styles.openMapDesc}>See campus layout and safe zones</Text>
            </View>
            <Text style={styles.openMapArrow}>›</Text>
          </TouchableOpacity>

          {/* SAFE ZONES */}
          <Text style={styles.sectionTitle}>📍 CTU Danao Safe Zones</Text>
          {SAFE_ZONES.map((zone) => (
            <TouchableOpacity
              key={zone.id}
              style={styles.zoneCard}
              onPress={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${zone.latitude},${zone.longitude}&travelmode=walking`;
                Linking.openURL(url);
              }}
            >
              <View style={[
                styles.zoneIconBox,
                { backgroundColor: zone.type === "primary" ? "#e8f5e9" : "#e3f2fd" }
              ]}>
                <Text style={styles.zoneIcon}>
                  {zone.type === "primary" ? "🏠" : "🚩"}
                </Text>
              </View>
              <View style={styles.zoneInfo}>
                <Text style={styles.zoneName}>{zone.name}</Text>
                <Text style={styles.zoneDesc}>{zone.description}</Text>
                <Text style={styles.zoneCapacity}>👥 {zone.capacity}</Text>
              </View>
              <Text style={styles.zoneArrow}>🗺</Text>
            </TouchableOpacity>
          ))}

          {/* HAZARD ZONES */}
          <Text style={styles.sectionTitle}>⚠️ Hazard Zones</Text>
          {HAZARD_ZONES.map((zone) => (
            <View key={zone.id} style={styles.hazardCard}>
              <View style={styles.hazardDot} />
              <View style={styles.hazardInfo}>
                <Text style={styles.hazardName}>{zone.name}</Text>
                <Text style={styles.hazardDesc}>{zone.description}</Text>
              </View>
            </View>
          ))}

          {/* DRRMO HOTLINE */}
          <TouchableOpacity
            style={styles.hotlineCard}
            onPress={() => Linking.openURL("tel:09177236262")}
          >
            <Text style={styles.hotlineIcon}>📞</Text>
            <View style={styles.hotlineInfo}>
              <Text style={styles.hotlineTitle}>CTU Danao DRRMO Hotline</Text>
              <Text style={styles.hotlineNumber}>0917-723-6262</Text>
              <Text style={styles.hotlineTap}>Tap to call</Text>
            </View>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* 📚 DRRM AWARENESS TAB */}
      {activeTab === "awareness" && (
        <View style={{ flex: 1 }}>
          {selectedContent ? (
            <ScrollView style={styles.container}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setSelectedContent(null)}
              >
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
              <View style={[styles.contentHeader, { backgroundColor: selectedContent.color }]}>
                <Text style={styles.contentHeaderIcon}>{selectedContent.icon}</Text>
                <Text style={styles.contentHeaderTitle}>{selectedContent.title}</Text>
              </View>
              {selectedContent.content.map((section, index) => (
                <View key={index} style={styles.contentSection}>
                  <Text style={[styles.contentHeading, { color: selectedContent.color }]}>
                    {section.heading}
                  </Text>
                  <Text style={styles.contentText}>{section.text}</Text>
                </View>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          ) : (
            <ScrollView style={styles.container}>
              <Text style={styles.awarenessIntro}>
                Learn about Disaster Risk Reduction and Management to stay informed and prepared.
              </Text>
              {DRRM_CONTENT.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.awarenessCard, { borderLeftColor: item.color }]}
                  onPress={() => setSelectedContent(item)}
                >
                  <View style={[styles.awarenessIcon, { backgroundColor: item.color + "20" }]}>
                    <Text style={styles.awarenessEmoji}>{item.icon}</Text>
                  </View>
                  <View style={styles.awarenessContent}>
                    <Text style={styles.awarenessTitle}>{item.title}</Text>
                    <Text style={styles.awarenessSub}>
                      {item.content.length} topics • Tap to read
                    </Text>
                  </View>
                  <Text style={styles.awarenessArrow}>›</Text>
                </TouchableOpacity>
              ))}

              {/* DRRMO HOTLINE */}
              <TouchableOpacity
                style={styles.hotlineCard}
                onPress={() => Linking.openURL("tel:09177236262")}
              >
                <Text style={styles.hotlineIcon}>📞</Text>
                <View style={styles.hotlineInfo}>
                  <Text style={styles.hotlineTitle}>CTU Danao DRRMO Hotline</Text>
                  <Text style={styles.hotlineNumber}>0917-723-6262</Text>
                  <Text style={styles.hotlineTap}>Tap to call</Text>
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
  wrapper: { flex: 1, backgroundColor: "#fff" },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 55, paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 5,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1, borderColor: COLORS.border,
    marginHorizontal: 20, marginTop: 10, marginBottom: 10,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  activeTab: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, color: COLORS.textLight },
  activeTabText: { color: COLORS.primary, fontWeight: "bold" },
  container: { flex: 1, paddingHorizontal: 20 },
  openMapCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.surface, borderRadius: 15,
    padding: 15, marginBottom: 20, marginTop: 10,
    borderWidth: 1, borderColor: COLORS.border,
    elevation: 2,
  },
  openMapIcon: { fontSize: 35, marginRight: 12 },
  openMapContent: { flex: 1 },
  openMapTitle: { fontWeight: "bold", color: COLORS.primary, fontSize: 14 },
  openMapDesc: { color: COLORS.textLight, fontSize: 12, marginTop: 3 },
  openMapArrow: { fontSize: 22, color: "#aaa" },
  sectionTitle: {
    fontSize: 16, fontWeight: "bold",
    color: COLORS.textDark, marginBottom: 10, marginTop: 5,
  },
  zoneCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 15,
    padding: 14, marginBottom: 10,
    elevation: 3, shadowColor: "#000",
    shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4, borderWidth: 1, borderColor: COLORS.border,
  },
  zoneIconBox: {
    width: 46, height: 46, borderRadius: 14,
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  zoneIcon: { fontSize: 22 },
  zoneInfo: { flex: 1 },
  zoneName: { fontWeight: "bold", fontSize: 13, color: COLORS.textDark },
  zoneDesc: { color: COLORS.textLight, fontSize: 11, marginTop: 2 },
  zoneCapacity: { color: COLORS.textLight, fontSize: 11, marginTop: 2 },
  zoneArrow: { fontSize: 20 },
  hazardCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff3f3", borderRadius: 12,
    padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: "#ffcccc",
  },
  hazardDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: COLORS.primary, marginRight: 12,
  },
  hazardInfo: { flex: 1 },
  hazardName: { fontWeight: "bold", color: COLORS.textDark, fontSize: 13 },
  hazardDesc: { color: COLORS.textLight, fontSize: 12, marginTop: 2 },
  hotlineCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.primary, borderRadius: 15,
    padding: 16, marginTop: 15, marginBottom: 10,
  },
  hotlineIcon: { fontSize: 35, marginRight: 14 },
  hotlineInfo: { flex: 1 },
  hotlineTitle: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  hotlineNumber: { color: "#fff", fontWeight: "bold", fontSize: 18, marginTop: 2 },
  hotlineTap: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 },
  awarenessIntro: {
    color: COLORS.textMid, fontSize: 13,
    lineHeight: 20, marginBottom: 20,
    textAlign: "center", marginTop: 10,
  },
  awarenessCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 15,
    padding: 15, marginBottom: 12, borderLeftWidth: 5,
    elevation: 3, shadowColor: "#000",
    shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  awarenessIcon: {
    width: 55, height: 55, borderRadius: 15,
    justifyContent: "center", alignItems: "center", marginRight: 14,
  },
  awarenessEmoji: { fontSize: 28 },
  awarenessContent: { flex: 1 },
  awarenessTitle: { fontWeight: "bold", fontSize: 15, color: COLORS.textDark },
  awarenessSub: { color: COLORS.textLight, fontSize: 12, marginTop: 3 },
  awarenessArrow: { fontSize: 24, color: "#ccc" },
  backButton: { marginBottom: 15, marginTop: 5 },
  backText: { color: COLORS.primary, fontSize: 16, fontWeight: "bold" },
  contentHeader: {
    borderRadius: 15, padding: 20,
    alignItems: "center", marginBottom: 20,
  },
  contentHeaderIcon: { fontSize: 45, marginBottom: 8 },
  contentHeaderTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  contentSection: {
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 15, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  contentHeading: { fontWeight: "bold", fontSize: 15, marginBottom: 8 },
  contentText: { color: COLORS.textMid, fontSize: 14, lineHeight: 22 },
});
// app/evacuation.js
import * as Location from "expo-location";
import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { COLORS } from "../constants/colors";
import { useSettings } from "../context/SettingsContext";
import { db } from "../firebase";

const EVACUATION_CENTERS = [
  { id: 1, name: "CTU Danao Campus", description: "Main evacuation center — Sabang, Danao City", latitude: 10.50339, longitude: 124.02917, type: "primary", capacity: "500+" },
  { id: 2, name: "Danao City Hall", description: "Secondary evacuation center", latitude: 10.5228, longitude: 124.0277, type: "primary", capacity: "300+" },
  { id: 3, name: "Danao Sports Complex", description: "Large capacity center", latitude: 10.5189, longitude: 124.0298, type: "primary", capacity: "1000+" },
  { id: 4, name: "Danao Elementary School", description: "Community evacuation point", latitude: 10.5215, longitude: 124.0265, type: "secondary", capacity: "200+" },
  { id: 5, name: "Poblacion Barangay Hall", description: "Local evacuation point", latitude: 10.5241, longitude: 124.0252, type: "secondary", capacity: "100+" },
];

const DANGER_ZONES = [
  { id: 1, name: "Flood Zone A", description: "Low-lying area near Danao River", risk: "HIGH" },
  { id: 2, name: "Landslide Risk Area", description: "Steep slope near Brgy. Beatty", risk: "MEDIUM" },
];

const EVACUATION_TIPS = [
  "Follow official evacuation orders immediately",
  "Bring your go-bag with essentials",
  "Help elderly and disabled neighbors",
  "Never drive through floodwater",
  "Check in with family after reaching safety",
];

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function Evacuation() {
  const [userLocation, setUserLocation] = useState(null);
  const [nearestCenter, setNearestCenter] = useState(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState("");
  const [sortedCenters, setSortedCenters] = useState(EVACUATION_CENTERS);
  const [locationLoading, setLocationLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("centers");
  const { theme } = useSettings();
  const { bg, card, border, textDark, textMid, textLight, surface } = theme;

  useEffect(() => {
    const alertRef = ref(db, "emergencyAlert");
    const unsubscribe = onValue(alertRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setIsEmergency(data.active === true);
        setEmergencyMessage(data.message || "State of Emergency declared!");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") { setLocationLoading(false); return; }
        const location = await Location.getCurrentPositionAsync({});
        const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
        setUserLocation(coords);
        const centersWithDistance = EVACUATION_CENTERS.map((center) => {
          const distKm = getDistance(coords.latitude, coords.longitude, center.latitude, center.longitude);
          return { ...center, distanceKm: distKm, distanceM: (distKm * 1000).toFixed(0) };
        }).sort((a, b) => a.distanceKm - b.distanceKm);
        setSortedCenters(centersWithDistance);
        setNearestCenter(centersWithDistance[0]);
      } catch (error) {
        console.error("Location error:", error);
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  const handleDirections = (center) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${center.latitude},${center.longitude}&travelmode=walking`;
    Linking.openURL(url);
  };

  const openAllCentersMap = () => {
    Linking.openURL(`https://www.google.com/maps/search/evacuation+centers+near+Danao+City`);
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: bg }]}>

      {/* ── HEADER ─────────────────────────────────── */}
      <View style={[styles.header, isEmergency && styles.headerEmergency]}>
        {isEmergency && (
          <View style={styles.emergencyPulse}>
            <Text style={styles.emergencyPulseText}>⚠️ EMERGENCY MODE ACTIVE</Text>
          </View>
        )}
        <Text style={styles.headerTitle}>
          {isEmergency ? "🚨 EVACUATION ALERT" : "🗺 Evacuation Centers"}
        </Text>
        <Text style={styles.headerSub}>
          {isEmergency ? "State of Emergency — Evacuate Now!" : "Danao City Safe Zones & Evacuation Guide"}
        </Text>
        {!isEmergency && (
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatNum}>{EVACUATION_CENTERS.length}</Text>
              <Text style={styles.headerStatLabel}>Safe Zones</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatNum}>{DANGER_ZONES.length}</Text>
              <Text style={styles.headerStatLabel}>Danger Zones</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatNum}>24/7</Text>
              <Text style={styles.headerStatLabel}>Monitoring</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── EMERGENCY BANNER ───────────────────────── */}
      {isEmergency && (
        <View style={styles.emergencyBanner}>
          <View style={styles.emergencyBannerTop}>
            <Text style={styles.emergencyBannerIcon}>🚨</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyBannerTitle}>STATE OF EMERGENCY</Text>
              <Text style={styles.emergencyBannerMsg}>{emergencyMessage}</Text>
            </View>
          </View>
          <Text style={styles.emergencyBannerInstr}>
            Proceed IMMEDIATELY to the nearest evacuation center below
          </Text>
        </View>
      )}

      {/* ── NEAREST CENTER CARD ────────────────────── */}
      {nearestCenter ? (
        <View style={[
          styles.nearestCard,
          { backgroundColor: isEmergency ? "#B71C1C" : card, borderColor: isEmergency ? "#FF5252" : border }
        ]}>
          <View style={styles.nearestTop}>
            <View style={styles.nearestBadge}>
              <Text style={[styles.nearestBadgeText, { color: isEmergency ? "#fff" : COLORS.primary }]}>
                {isEmergency ? "🚨 GO HERE NOW" : "📍 NEAREST"}
              </Text>
            </View>
            <Text style={[styles.nearestDist, { color: isEmergency ? "rgba(255,255,255,0.8)" : textLight }]}>
              ~{nearestCenter.distanceM}m away
            </Text>
          </View>
          <Text style={[styles.nearestName, { color: isEmergency ? "#fff" : textDark }]}>
            {nearestCenter.name}
          </Text>
          <Text style={[styles.nearestDesc, { color: isEmergency ? "rgba(255,255,255,0.75)" : textMid }]}>
            {nearestCenter.description}
          </Text>
          <View style={styles.nearestMeta}>
            <View style={[styles.nearestMetaItem, { backgroundColor: isEmergency ? "rgba(255,255,255,0.15)" : surface }]}>
              <Text style={[styles.nearestMetaText, { color: isEmergency ? "#fff" : textMid }]}>
                👥 {nearestCenter.capacity} persons
              </Text>
            </View>
            <View style={[styles.nearestMetaItem, { backgroundColor: isEmergency ? "rgba(255,255,255,0.15)" : surface }]}>
              <Text style={[styles.nearestMetaText, { color: isEmergency ? "#fff" : textMid }]}>
                🏠 {nearestCenter.type === "primary" ? "Primary" : "Secondary"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.directionsButton, { backgroundColor: isEmergency ? "#fff" : COLORS.primary }]}
            onPress={() => handleDirections(nearestCenter)}
          >
            <Text style={[styles.directionsText, { color: isEmergency ? "#B71C1C" : "#fff" }]}>
              🗺 START NAVIGATION
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.locatingCard, { backgroundColor: card, borderColor: border }]}>
          <Text style={styles.locatingIcon}>📡</Text>
          <Text style={[styles.locatingTitle, { color: textDark }]}>
            {locationLoading ? "Calculating nearest safe zone..." : "Location Unavailable"}
          </Text>
          <Text style={[styles.locatingDesc, { color: textLight }]}>
            Allow location access for accurate results
          </Text>
        </View>
      )}

      {/* ── TABS ───────────────────────────────────── */}
      <View style={[styles.tabs, { borderColor: border }]}>
        {[
          { key: "centers", label: "🏠 Centers" },
          { key: "danger", label: "⚠️ Danger Zones" },
          { key: "tips", label: "💡 Tips" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, { color: textLight }, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={[styles.container, { backgroundColor: bg }]} showsVerticalScrollIndicator={false}>

        {/* ── CENTERS TAB ────────────────────────────── */}
        {activeTab === "centers" && (
          <>
            {/* Open all on map */}
            <TouchableOpacity
              style={[styles.mapCard, { backgroundColor: card, borderColor: border }]}
              onPress={openAllCentersMap}
            >
              <Text style={styles.mapCardIcon}>🗺</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.mapCardTitle, { color: textDark }]}>View All on Google Maps</Text>
                <Text style={[styles.mapCardDesc, { color: textLight }]}>See all safe zones near Danao City</Text>
              </View>
              <Text style={[styles.mapCardArrow, { color: COLORS.primary }]}>→</Text>
            </TouchableOpacity>

            {/* Centers list */}
            {sortedCenters.map((center, index) => (
              <View key={center.id} style={[styles.centerCard, { backgroundColor: card, borderColor: border }]}>
                <View style={[styles.centerRank, { backgroundColor: index === 0 ? COLORS.primary : (center.type === "primary" ? "#2e7d32" : "#1565C0") }]}>
                  <Text style={styles.centerRankText}>
                    {index === 0 ? "⭐" : `#${index + 1}`}
                  </Text>
                </View>
                <View style={styles.centerInfo}>
                  <View style={styles.centerNameRow}>
                    <Text style={[styles.centerName, { color: textDark }]}>{center.name}</Text>
                    <View style={[styles.centerTypeBadge, { backgroundColor: center.type === "primary" ? "#E8F5E9" : "#E3F2FD" }]}>
                      <Text style={[styles.centerTypeText, { color: center.type === "primary" ? "#2e7d32" : "#1565C0" }]}>
                        {center.type === "primary" ? "Primary" : "Secondary"}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.centerDesc, { color: textLight }]}>{center.description}</Text>
                  <View style={styles.centerMeta}>
                    <Text style={styles.centerDistance}>
                      📏 {center.distanceM ? `${center.distanceM}m` : "--"} away
                    </Text>
                    <Text style={[styles.centerCapacity, { color: textLight }]}>
                      👥 {center.capacity} persons
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.goButton, { backgroundColor: index === 0 ? COLORS.primary : "#2e7d32" }]}
                  onPress={() => handleDirections(center)}
                >
                  <Text style={styles.goButtonText}>GO</Text>
                  <Text style={styles.goButtonArrow}>→</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* ── DANGER ZONES TAB ───────────────────────── */}
        {activeTab === "danger" && (
          <>
            <View style={styles.dangerHeader}>
              <Text style={styles.dangerHeaderIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dangerHeaderTitle, { color: textDark }]}>Avoid These Areas</Text>
                <Text style={[styles.dangerHeaderDesc, { color: textLight }]}>
                  Stay away from these zones during emergencies
                </Text>
              </View>
            </View>

            {DANGER_ZONES.map((zone) => (
              <View key={zone.id} style={[styles.dangerCard, {
                backgroundColor: theme.bg === "#121212" ? "#2a1010" : "#FFF5F5",
                borderColor: theme.bg === "#121212" ? "#5a2020" : "#FFCDD2",
              }]}>
                <View style={styles.dangerCardTop}>
                  <Text style={styles.dangerIcon}>🚫</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dangerName, { color: COLORS.primary }]}>{zone.name}</Text>
                    <Text style={[styles.dangerDesc, { color: textMid }]}>{zone.description}</Text>
                  </View>
                  <View style={[styles.riskBadge, { backgroundColor: zone.risk === "HIGH" ? "#FFEBEE" : "#FFF8E1" }]}>
                    <Text style={[styles.riskText, { color: zone.risk === "HIGH" ? "#C62828" : "#F57F17" }]}>
                      {zone.risk}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            <View style={[styles.dangerNote, { backgroundColor: card, borderColor: border }]}>
              <Text style={styles.dangerNoteIcon}>ℹ️</Text>
              <Text style={[styles.dangerNoteText, { color: textMid }]}>
                Danger zones are identified by local DRRMO. Always follow official evacuation orders and avoid these areas during disasters.
              </Text>
            </View>
          </>
        )}

        {/* ── TIPS TAB ───────────────────────────────── */}
        {activeTab === "tips" && (
          <>
            <View style={[styles.tipsHeader, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.tipsHeaderIcon}>💡</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipsHeaderTitle}>Evacuation Tips</Text>
                <Text style={styles.tipsHeaderSub}>Follow these during emergencies</Text>
              </View>
            </View>

            {EVACUATION_TIPS.map((tip, index) => (
              <View key={index} style={[styles.tipCard, { backgroundColor: card, borderColor: border }]}>
                <View style={[styles.tipNumber, { backgroundColor: COLORS.primary }]}>
                  <Text style={styles.tipNumberText}>{index + 1}</Text>
                </View>
                <Text style={[styles.tipText, { color: textDark }]}>{tip}</Text>
              </View>
            ))}

            {/* DRRMO Hotline */}
            <TouchableOpacity
              style={styles.hotlineCard}
              onPress={() => Linking.openURL("tel:09177236262")}
            >
              <Text style={styles.hotlineIcon}>📞</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.hotlineLabel}>CTU Danao DRRMO Hotline</Text>
                <Text style={styles.hotlineNumber}>0917-723-6262</Text>
                <Text style={styles.hotlineTap}>Tap to call</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },

  // ── HEADER ──────────────────────────────────────────
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 55, paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerEmergency: { backgroundColor: "#B71C1C" },
  emergencyPulse: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20, paddingHorizontal: 12,
    paddingVertical: 5, alignSelf: "flex-start",
    marginBottom: 10,
  },
  emergencyPulseText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 4 },
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

  // ── EMERGENCY BANNER ────────────────────────────────
  emergencyBanner: {
    backgroundColor: "#B71C1C",
    marginHorizontal: 20, marginTop: 12,
    borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: "#FF5252",
  },
  emergencyBannerTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  emergencyBannerIcon: { fontSize: 28 },
  emergencyBannerTitle: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  emergencyBannerMsg: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  emergencyBannerInstr: { color: "#FFCDD2", fontSize: 12, fontStyle: "italic", textAlign: "center" },

  // ── NEAREST CARD ────────────────────────────────────
  nearestCard: {
    marginHorizontal: 20, marginTop: 16,
    borderRadius: 20, padding: 18,
    borderWidth: 1.5, elevation: 6,
    shadowColor: "#000", shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 8,
  },
  nearestTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  nearestBadge: { backgroundColor: "rgba(176,0,32,0.1)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  nearestBadgeText: { fontSize: 11, fontWeight: "bold" },
  nearestDist: { fontSize: 12, fontWeight: "600" },
  nearestName: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  nearestDesc: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  nearestMeta: { flexDirection: "row", gap: 8, marginBottom: 14 },
  nearestMetaItem: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  nearestMetaText: { fontSize: 12, fontWeight: "500" },
  directionsButton: { borderRadius: 14, padding: 14, alignItems: "center" },
  directionsText: { fontWeight: "bold", fontSize: 14, letterSpacing: 0.5 },

  // ── LOCATING ────────────────────────────────────────
  locatingCard: {
    marginHorizontal: 20, marginTop: 16,
    borderRadius: 16, padding: 20,
    alignItems: "center", borderWidth: 1,
    borderStyle: "dashed",
  },
  locatingIcon: { fontSize: 35, marginBottom: 8 },
  locatingTitle: { fontWeight: "bold", fontSize: 14, marginBottom: 4 },
  locatingDesc: { fontSize: 12, textAlign: "center" },

  // ── TABS ────────────────────────────────────────────
  tabs: {
    flexDirection: "row", borderBottomWidth: 1,
    marginHorizontal: 20, marginTop: 16,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  activeTab: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 12, fontWeight: "600" },
  activeTabText: { color: COLORS.primary, fontWeight: "bold" },

  // ── CONTAINER ───────────────────────────────────────
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },

  // ── MAP CARD ────────────────────────────────────────
  mapCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 16, padding: 14,
    marginBottom: 16, borderWidth: 1, gap: 12,
  },
  mapCardIcon: { fontSize: 30 },
  mapCardTitle: { fontWeight: "bold", fontSize: 14 },
  mapCardDesc: { fontSize: 12, marginTop: 2 },
  mapCardArrow: { fontSize: 20, fontWeight: "bold" },

  // ── CENTER CARD ─────────────────────────────────────
  centerCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 16, padding: 14,
    marginBottom: 12, borderWidth: 1,
    elevation: 2, shadowColor: "#000",
    shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 },
    gap: 12,
  },
  centerRank: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  centerRankText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  centerInfo: { flex: 1 },
  centerNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  centerName: { fontWeight: "bold", fontSize: 13, flex: 1 },
  centerTypeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  centerTypeText: { fontSize: 10, fontWeight: "bold" },
  centerDesc: { fontSize: 11, marginBottom: 6 },
  centerMeta: { flexDirection: "row", gap: 12 },
  centerDistance: { fontSize: 11, color: "#2e7d32", fontWeight: "bold" },
  centerCapacity: { fontSize: 11 },
  goButton: {
    borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, alignItems: "center",
  },
  goButtonText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  goButtonArrow: { color: "#fff", fontSize: 10 },

  // ── DANGER ZONES ────────────────────────────────────
  dangerHeader: {
    flexDirection: "row", alignItems: "center",
    gap: 12, marginBottom: 16, padding: 14,
  },
  dangerHeaderIcon: { fontSize: 30 },
  dangerHeaderTitle: { fontWeight: "bold", fontSize: 16 },
  dangerHeaderDesc: { fontSize: 12, marginTop: 2 },
  dangerCard: {
    borderRadius: 16, padding: 14,
    marginBottom: 12, borderWidth: 1,
  },
  dangerCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  dangerIcon: { fontSize: 24 },
  dangerName: { fontWeight: "bold", fontSize: 14, marginBottom: 3 },
  dangerDesc: { fontSize: 12 },
  riskBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  riskText: { fontSize: 10, fontWeight: "bold" },
  dangerNote: {
    borderRadius: 14, padding: 14,
    flexDirection: "row", gap: 10,
    alignItems: "flex-start", borderWidth: 1,
    marginTop: 4,
  },
  dangerNoteIcon: { fontSize: 20 },
  dangerNoteText: { flex: 1, fontSize: 13, lineHeight: 20 },

  // ── TIPS ────────────────────────────────────────────
  tipsHeader: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 16, padding: 16, gap: 12,
    marginBottom: 16,
  },
  tipsHeaderIcon: { fontSize: 30 },
  tipsHeaderTitle: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  tipsHeaderSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
  tipCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, gap: 14,
  },
  tipNumber: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  tipNumberText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  tipText: { flex: 1, fontSize: 14, lineHeight: 20 },
  hotlineCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center",
    gap: 14, marginTop: 8,
  },
  hotlineIcon: { fontSize: 32 },
  hotlineLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  hotlineNumber: { color: "#fff", fontWeight: "bold", fontSize: 20, marginTop: 2 },
  hotlineTap: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 },
});
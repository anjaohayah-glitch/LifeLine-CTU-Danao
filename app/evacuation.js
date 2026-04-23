import * as Location from "expo-location";
import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { COLORS } from "../constants/colors";
import { useSettings } from "../context/SettingsContext";
import { db } from "../firebase";

const EVACUATION_CENTERS = [
  { id: 1, name: "CTU Danao Campus", description: "Main evacuation center — Sabang, Danao City", latitude: 10.50339, longitude: 124.02917, type: "primary" },
  { id: 2, name: "Danao City Hall", description: "Secondary evacuation center", latitude: 10.5228, longitude: 124.0277, type: "primary" },
  { id: 3, name: "Danao Sports Complex", description: "Large capacity center", latitude: 10.5189, longitude: 124.0298, type: "primary" },
  { id: 4, name: "Danao Elementary School", description: "Community evacuation point", latitude: 10.5215, longitude: 124.0265, type: "secondary" },
  { id: 5, name: "Poblacion Barangay Hall", description: "Local evacuation point", latitude: 10.5241, longitude: 124.0252, type: "secondary" },
];

const DANGER_ZONES = [
  { id: 1, name: "Flood Zone A", description: "Low-lying area near Danao River" },
  { id: 2, name: "Landslide Risk Area", description: "Steep slope near Brgy. Beatty" },
];

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

export default function Evacuation() {
  const [userLocation, setUserLocation] = useState(null);
  const [nearestCenter, setNearestCenter] = useState(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState("");
  const [sortedCenters, setSortedCenters] = useState(EVACUATION_CENTERS);
  const [locationLoading, setLocationLoading] = useState(true);
  
  const { theme } = useSettings();
  const { bg, card, border, textDark, textMid, textLight, surface } = theme;

  // Listen for Emergency Alerts
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

  // Handle Real-time Location and Sorting
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationLoading(false);
          return;
        }
        
        const location = await Location.getCurrentPositionAsync({});
        const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
        setUserLocation(coords);

        const centersWithDistance = EVACUATION_CENTERS.map((center) => {
          const distKm = getDistance(coords.latitude, coords.longitude, center.latitude, center.longitude);
          return {
            ...center,
            distanceKm: distKm,
            distanceM: (distKm * 1000).toFixed(0),
          };
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
    const latLng = `${center.latitude},${center.longitude}`;
    const label = encodeURIComponent(center.name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latLng}`,
      android: `geo:0,0?q=${latLng}(${label})`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latLng}`);
    });
  };

  const openAllCentersMap = () => {
    Linking.openURL(`https://www.google.com/maps/search/evacuation+centers+near+Danao+City`);
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: bg }]}>
      <View style={[styles.header, isEmergency && styles.headerEmergency]}>
        <Text style={styles.headerTitle}>{isEmergency ? "🚨 EVACUATION ALERT" : "🗺 Evacuation Centers"}</Text>
        <Text style={styles.headerSub}>{isEmergency ? "State of Emergency — Evacuate Now!" : "Danao City Evacuation Guide"}</Text>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {isEmergency && (
          <View style={styles.emergencyBanner}>
            <Text style={styles.emergencyTitle}>🚨 STATE OF EMERGENCY 🚨</Text>
            <Text style={styles.emergencyMsg}>{emergencyMessage}</Text>
            <Text style={styles.emergencyInstr}>Proceed IMMEDIATELY to the nearest evacuation center!</Text>
          </View>
        )}

        {nearestCenter ? (
          <View style={[styles.nearestCard, { backgroundColor: isEmergency ? '#ffebee' : surface, borderColor: isEmergency ? COLORS.primary : border }]}>
            <Text style={[styles.nearestLabel, { color: textMid }]}>📍 RECOMMENDED NEAREST CENTER</Text>
            <Text style={[styles.nearestName, { color: isEmergency ? COLORS.primary : textDark }]}>{nearestCenter.name}</Text>
            <Text style={[styles.nearestDesc, { color: textMid }]}>{nearestCenter.description}</Text>
            <Text style={[styles.nearestDistance, { color: COLORS.primary }]}>📐 ~{nearestCenter.distanceM}m away</Text>
            <View style={styles.nearestButtons}>
              <TouchableOpacity style={[styles.directionsButton, { backgroundColor: isEmergency ? COLORS.primary : '#2e7d32' }]} onPress={() => handleDirections(nearestCenter)}>
                <Text style={styles.directionsText}>START NAVIGATION</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.locatingCard, { backgroundColor: card, borderColor: border }]}>
            <Text style={styles.locatingTitle}>{locationLoading ? "📡 Calculating nearest safe zone..." : "Location Unavailable"}</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.openMapCard, { backgroundColor: card, borderColor: border }]} onPress={openAllCentersMap}>
          <Text style={styles.openMapIcon}>🗺</Text>
          <View style={styles.openMapContent}>
            <Text style={[styles.openMapTitle, { color: textDark }]}>View All Centers on Map</Text>
            <Text style={[styles.openMapDesc, { color: textLight }]}>See all designated Danao City safe zones</Text>
          </View>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: textDark }]}>🏠 Designated Centers</Text>
        {sortedCenters.map((center) => (
          <View key={center.id} style={[styles.centerCard, { backgroundColor: card, borderColor: border }]}>
            <View style={styles.centerInfo}>
              <Text style={[styles.centerName, { color: textDark }]}>{center.name}</Text>
              <Text style={[styles.centerDesc, { color: textLight }]}>{center.description}</Text>
              <Text style={styles.centerDistance}>📏 {center.distanceM ? `${center.distanceM}m` : '--'} away</Text>
            </View>
            <TouchableOpacity style={styles.smallDirections} onPress={() => handleDirections(center)}>
              <Text style={styles.smallDirectionsText}>GO →</Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: textDark }]}>⚠️ Danger Zones</Text>
        {DANGER_ZONES.map((zone) => (
          <View key={zone.id} style={[styles.dangerCard, { backgroundColor: bg === "#121212" ? "#2a1010" : "#fff0f0" }]}>
            <Text style={styles.dangerIcon}>🛑</Text>
            <View style={styles.dangerInfo}>
              <Text style={[styles.dangerName, { color: COLORS.danger }]}>{zone.name}</Text>
              <Text style={[styles.dangerDesc, { color: textLight }]}>{zone.description}</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  header: { backgroundColor: COLORS.primary, paddingTop: 60, paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerEmergency: { backgroundColor: "#B71C1C" },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  headerSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 5 },
  container: { flex: 1, paddingHorizontal: 20 },
  emergencyBanner: { backgroundColor: "#B71C1C", borderRadius: 15, padding: 15, marginTop: 15, borderWidth: 2, borderColor: "#FF5252" },
  emergencyTitle: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  emergencyMsg: { color: "#fff", textAlign: "center", marginTop: 5 },
  emergencyInstr: { color: "#FFCDD2", fontSize: 11, textAlign: "center", marginTop: 5, fontStyle: 'italic' },
  nearestCard: { borderRadius: 20, padding: 20, marginTop: 15, elevation: 5, borderWidth: 1 },
  nearestLabel: { fontSize: 10, fontWeight: 'bold', marginBottom: 5 },
  nearestName: { fontSize: 20, fontWeight: "bold" },
  nearestDesc: { fontSize: 13, marginTop: 5 },
  nearestDistance: { fontSize: 14, fontWeight: 'bold', marginTop: 10 },
  nearestButtons: { marginTop: 15 },
  directionsButton: { padding: 15, borderRadius: 12, alignItems: "center" },
  directionsText: { color: "#fff", fontWeight: "bold" },
  locatingCard: { padding: 20, borderRadius: 15, marginTop: 15, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1 },
  locatingTitle: { fontSize: 13, fontWeight: 'bold' },
  openMapCard: { flexDirection: "row", alignItems: "center", padding: 15, borderRadius: 15, marginTop: 15, borderWidth: 1 },
  openMapIcon: { fontSize: 30, marginRight: 15 },
  openMapContent: { flex: 1 },
  openMapTitle: { fontWeight: "bold", fontSize: 15 },
  openMapDesc: { fontSize: 11 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginTop: 25, marginBottom: 15 },
  centerCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, marginBottom: 10, borderWidth: 1 },
  centerInfo: { flex: 1 },
  centerName: { fontWeight: 'bold', fontSize: 14 },
  centerDesc: { fontSize: 11, marginTop: 2 },
  centerDistance: { fontSize: 12, marginTop: 5, fontWeight: 'bold', color: '#2e7d32' },
  smallDirections: { backgroundColor: '#2e7d32', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10 },
  smallDirectionsText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  dangerCard: { flexDirection: "row", alignItems: "center", padding: 15, borderRadius: 15, marginBottom: 10 },
  dangerIcon: { fontSize: 20, marginRight: 15 },
  dangerName: { fontWeight: 'bold', fontSize: 14 },
  dangerDesc: { fontSize: 11 },
});
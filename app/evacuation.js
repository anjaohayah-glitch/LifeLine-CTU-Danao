// app/evacuation.js
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../constants/colors";

const EVACUATION_CENTERS = [
  {
    id: 1,
    name: "CTU Danao Campus",
    description: "Main evacuation center — Sabang, Danao City",
    latitude: 10.5031973,
    longitude: 124.0301323,
    type: "primary",
  },
  {
    id: 2,
    name: "Danao City Hall",
    description: "Secondary evacuation center",
    latitude: 10.5228,
    longitude: 124.0277,
    type: "primary",
  },
  {
    id: 3,
    name: "Danao Sports Complex",
    description: "Large capacity center",
    latitude: 10.5189,
    longitude: 124.0298,
    type: "primary",
  },
  {
    id: 4,
    name: "Danao Elementary School",
    description: "Community evacuation point",
    latitude: 10.5215,
    longitude: 124.0265,
    type: "secondary",
  },
  {
    id: 5,
    name: "Poblacion Barangay Hall",
    description: "Local evacuation point",
    latitude: 10.5241,
    longitude: 124.0252,
    type: "secondary",
  },
];

const DANGER_ZONES = [
  { id: 1, name: "Flood Zone A", description: "Low-lying area near river" },
  { id: 2, name: "Landslide Risk Area", description: "Steep slope near barangay" },
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

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Location access is required to find nearest center.");
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(coords);

        let nearest = null;
        let minDistance = Infinity;
        EVACUATION_CENTERS.forEach((center) => {
          const distance = getDistance(coords.latitude, coords.longitude, center.latitude, center.longitude);
          if (distance < minDistance) {
            minDistance = distance;
            nearest = { ...center, distance: (distance * 1000).toFixed(0) };
          }
        });
        setNearestCenter(nearest);
      } catch (error) {
        console.log("Location error:", error);
      }
    })();
  }, []);

  const handleDirections = (center) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${center.latitude},${center.longitude}&travelmode=walking`;
    Linking.openURL(url);
  };

  const openMapView = (center) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${center.latitude},${center.longitude}`;
    Linking.openURL(url);
  };

  const openAllCentersMap = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=evacuation+center+danao+cebu`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.wrapper}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🗺 Evacuation Centers</Text>
        <Text style={styles.headerSub}>Danao City Evacuation Guide</Text>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* NEAREST CENTER */}
        {nearestCenter ? (
          <View style={styles.nearestCard}>
            <Text style={styles.nearestLabel}>📍 Nearest Evacuation Center</Text>
            <Text style={styles.nearestName}>{nearestCenter.name}</Text>
            <Text style={styles.nearestDesc}>{nearestCenter.description}</Text>
            <Text style={styles.nearestDistance}>
              ~{nearestCenter.distance}m away from you
            </Text>
            <View style={styles.nearestButtons}>
              <TouchableOpacity
                style={styles.directionsButton}
                onPress={() => handleDirections(nearestCenter)}
              >
                <Text style={styles.directionsText}>🗺 Get Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.viewMapButton}
                onPress={() => openMapView(nearestCenter)}
              >
                <Text style={styles.viewMapText}>📍 View on Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.locatingCard}>
            <Text style={styles.locatingIcon}>📡</Text>
            <View style={styles.locatingContent}>
              <Text style={styles.locatingTitle}>Finding your location...</Text>
              <Text style={styles.locatingDesc}>
                Allow location access to find the nearest evacuation center
              </Text>
            </View>
          </View>
        )}

        {/* OPEN ALL ON MAP */}
        <TouchableOpacity style={styles.openMapCard} onPress={openAllCentersMap}>
          <Text style={styles.openMapIcon}>🗺</Text>
          <View style={styles.openMapContent}>
            <Text style={styles.openMapTitle}>View All Centers on Google Maps</Text>
            <Text style={styles.openMapDesc}>
              Opens Google Maps with evacuation centers nearby
            </Text>
          </View>
          <Text style={styles.openMapArrow}>›</Text>
        </TouchableOpacity>

        {/* PRIMARY CENTERS */}
        <Text style={styles.sectionTitle}>🏠 Primary Centers</Text>
        {EVACUATION_CENTERS.filter((c) => c.type === "primary").map((center) => (
          <View key={center.id} style={styles.centerCard}>
            <View style={styles.centerTop}>
              <View style={styles.centerIconBox}>
                <Text style={styles.centerIcon}>🏠</Text>
              </View>
              <View style={styles.centerInfo}>
                <Text style={styles.centerName}>{center.name}</Text>
                <Text style={styles.centerDesc}>{center.description}</Text>
                {userLocation && (
                  <Text style={styles.centerDistance}>
                    📏 {(getDistance(
                      userLocation.latitude,
                      userLocation.longitude,
                      center.latitude,
                      center.longitude
                    ) * 1000).toFixed(0)}m away
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.centerButtons}>
              <TouchableOpacity
                style={styles.smallDirections}
                onPress={() => handleDirections(center)}
              >
                <Text style={styles.smallDirectionsText}>🗺 Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallView}
                onPress={() => openMapView(center)}
              >
                <Text style={styles.smallViewText}>📍 View</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* SECONDARY CENTERS */}
        <Text style={styles.sectionTitle}>🔵 Secondary Centers</Text>
        {EVACUATION_CENTERS.filter((c) => c.type === "secondary").map((center) => (
          <View key={center.id} style={[styles.centerCard, { borderLeftColor: "#1565C0" }]}>
            <View style={styles.centerTop}>
              <View style={[styles.centerIconBox, { backgroundColor: "#e3f2fd" }]}>
                <Text style={styles.centerIcon}>🏫</Text>
              </View>
              <View style={styles.centerInfo}>
                <Text style={styles.centerName}>{center.name}</Text>
                <Text style={styles.centerDesc}>{center.description}</Text>
                {userLocation && (
                  <Text style={styles.centerDistance}>
                    📏 {(getDistance(
                      userLocation.latitude,
                      userLocation.longitude,
                      center.latitude,
                      center.longitude
                    ) * 1000).toFixed(0)}m away
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.centerButtons}>
              <TouchableOpacity
                style={[styles.smallDirections, { backgroundColor: "#1565C0" }]}
                onPress={() => handleDirections(center)}
              >
                <Text style={styles.smallDirectionsText}>🗺 Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallView}
                onPress={() => openMapView(center)}
              >
                <Text style={styles.smallViewText}>📍 View</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* DANGER ZONES */}
        <Text style={styles.sectionTitle}>⚠️ Danger Zones — Avoid These Areas</Text>
        {DANGER_ZONES.map((zone) => (
          <View key={zone.id} style={styles.dangerCard}>
            <Text style={styles.dangerIcon}>🔴</Text>
            <View style={styles.dangerInfo}>
              <Text style={styles.dangerName}>{zone.name}</Text>
              <Text style={styles.dangerDesc}>{zone.description}</Text>
            </View>
          </View>
        ))}

        {/* TIPS */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Evacuation Tips</Text>
          {[
            "Follow official evacuation orders immediately",
            "Bring your go-bag with essentials",
            "Help elderly and disabled neighbors",
            "Never drive through floodwater",
            "Check in with family after reaching safety",
          ].map((tip, index) => (
            <View key={index} style={styles.tipRow}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    marginBottom: 15,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 },
  container: { flex: 1, paddingHorizontal: 20 },
  nearestCard: {
    backgroundColor: "#e8f5e9", borderRadius: 15,
    padding: 16, marginBottom: 15,
    borderWidth: 1, borderColor: "#a5d6a7",
  },
  nearestLabel: { fontSize: 12, color: "#555", marginBottom: 4 },
  nearestName: { fontSize: 18, fontWeight: "bold", color: "#2e7d32" },
  nearestDesc: { color: "#555", fontSize: 13, marginTop: 2 },
  nearestDistance: {
    color: "#2e7d32", fontSize: 13,
    marginTop: 4, fontWeight: "bold",
  },
  nearestButtons: { flexDirection: "row", gap: 10, marginTop: 12 },
  directionsButton: {
    flex: 1, backgroundColor: "#2e7d32",
    padding: 12, borderRadius: 10, alignItems: "center",
  },
  directionsText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  viewMapButton: {
    flex: 1, backgroundColor: "#1565C0",
    padding: 12, borderRadius: 10, alignItems: "center",
  },
  viewMapText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  locatingCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.surface, borderRadius: 15,
    padding: 15, marginBottom: 15,
    borderWidth: 1, borderColor: COLORS.border,
  },
  locatingIcon: { fontSize: 35, marginRight: 12 },
  locatingContent: { flex: 1 },
  locatingTitle: { fontWeight: "bold", color: COLORS.textDark, fontSize: 14 },
  locatingDesc: { color: COLORS.textLight, fontSize: 12, marginTop: 3 },
  openMapCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.surface, borderRadius: 15,
    padding: 15, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border,
    elevation: 2,
  },
  openMapIcon: { fontSize: 35, marginRight: 12 },
  openMapContent: { flex: 1 },
  openMapTitle: { fontWeight: "bold", color: COLORS.primary, fontSize: 14 },
  openMapDesc: { color: COLORS.textLight, fontSize: 12, marginTop: 3 },
  openMapArrow: { fontSize: 26, color: "#aaa" },
  sectionTitle: {
    fontSize: 16, fontWeight: "bold",
    color: COLORS.textDark, marginBottom: 10, marginTop: 5,
  },
  centerCard: {
    backgroundColor: "#fff", borderRadius: 15,
    padding: 14, marginBottom: 12,
    borderLeftWidth: 5, borderLeftColor: "#2e7d32",
    elevation: 3, shadowColor: "#000",
    shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  centerTop: {
    flexDirection: "row", alignItems: "center", marginBottom: 10,
  },
  centerIconBox: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: "#e8f5e9",
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  centerIcon: { fontSize: 22 },
  centerInfo: { flex: 1 },
  centerName: { fontWeight: "bold", fontSize: 14, color: COLORS.textDark },
  centerDesc: { color: COLORS.textLight, fontSize: 12, marginTop: 2 },
  centerDistance: {
    color: "#2e7d32", fontSize: 12,
    marginTop: 3, fontWeight: "bold",
  },
  centerButtons: { flexDirection: "row", gap: 8 },
  smallDirections: {
    backgroundColor: "#2e7d32", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  smallDirectionsText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  smallView: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  smallViewText: { color: COLORS.textMid, fontSize: 12, fontWeight: "bold" },
  dangerCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff0f0", borderRadius: 12,
    padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: "#ffcccc",
  },
  dangerIcon: { fontSize: 24, marginRight: 12 },
  dangerInfo: { flex: 1 },
  dangerName: { fontWeight: "bold", fontSize: 14, color: COLORS.primary },
  dangerDesc: { color: COLORS.textLight, fontSize: 12, marginTop: 2 },
  tipsCard: {
    backgroundColor: COLORS.surface, borderRadius: 15,
    padding: 16, marginTop: 5,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tipsTitle: {
    fontWeight: "bold", fontSize: 15,
    color: COLORS.textDark, marginBottom: 12,
  },
  tipRow: { flexDirection: "row", marginBottom: 8 },
  tipBullet: {
    color: COLORS.primary, fontWeight: "bold",
    marginRight: 8, fontSize: 16,
  },
  tipText: { flex: 1, color: COLORS.textMid, fontSize: 13, lineHeight: 20 },
});
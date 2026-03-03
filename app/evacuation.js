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
import MapView, { Circle, Marker } from "react-native-maps";

const EVACUATION_CENTERS = [
  {
    id: 1,
    name: "CTU Danao Campus",
    description: "Main evacuation center",
    latitude: 10.5167,
    longitude: 124.0333,
    type: "primary",
  },
  {
    id: 2,
    name: "Danao City Hall",
    description: "Secondary evacuation center",
    latitude: 10.5210,
    longitude: 124.0280,
    type: "primary",
  },
  {
    id: 3,
    name: "Danao Sports Complex",
    description: "Large capacity center",
    latitude: 10.5190,
    longitude: 124.0310,
    type: "primary",
  },
  {
    id: 4,
    name: "Danao Elementary School",
    description: "Community evacuation point",
    latitude: 10.5145,
    longitude: 124.0355,
    type: "secondary",
  },
  {
    id: 5,
    name: "Poblacion Barangay Hall",
    description: "Local evacuation point",
    latitude: 10.5230,
    longitude: 124.0260,
    type: "secondary",
  },
];

const DANGER_ZONES = [
  {
    id: 1,
    name: "Flood Zone A",
    latitude: 10.5155,
    longitude: 124.0290,
    radius: 300,
  },
  {
    id: 2,
    name: "Landslide Risk Area",
    latitude: 10.5200,
    longitude: 124.0370,
    radius: 200,
  },
];

export default function Evacuation() {
  const [userLocation, setUserLocation] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [nearestCenter, setNearestCenter] = useState(null);

  // 📍 Get user location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is required.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(coords);
      findNearestCenter(coords);
    })();
  }, []);

  // 📏 Find nearest evacuation center
  const findNearestCenter = (coords) => {
    let nearest = null;
    let minDistance = Infinity;

    EVACUATION_CENTERS.forEach((center) => {
      const distance = getDistance(
        coords.latitude,
        coords.longitude,
        center.latitude,
        center.longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearest = { ...center, distance: (distance * 1000).toFixed(0) };
      }
    });

    setNearestCenter(nearest);
  };

  // 📐 Haversine distance formula (returns km)
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

  // 🗺 Open Google Maps directions
  const handleDirections = (center) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${center.latitude},${center.longitude}&travelmode=walking`;
    Linking.openURL(url);
  };

  const initialRegion = {
    latitude: 10.5190,
    longitude: 124.0310,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.header}>🗺 Evacuation Map</Text>

      {/* MAP */}
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* EVACUATION CENTER PINS */}
        {EVACUATION_CENTERS.map((center) => (
          <Marker
            key={center.id}
            coordinate={{ latitude: center.latitude, longitude: center.longitude }}
            title={center.name}
            description={center.description}
            pinColor={center.type === "primary" ? "#2e7d32" : "#1565C0"}
            onPress={() => setSelectedCenter(center)}
          />
        ))}

        {/* DANGER ZONES */}
        {DANGER_ZONES.map((zone) => (
          <Circle
            key={zone.id}
            center={{ latitude: zone.latitude, longitude: zone.longitude }}
            radius={zone.radius}
            fillColor="rgba(176, 0, 32, 0.2)"
            strokeColor="rgba(176, 0, 32, 0.8)"
            strokeWidth={2}
          />
        ))}
      </MapView>

      {/* LEGEND */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#2e7d32" }]} />
          <Text style={styles.legendText}>Primary Center</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#1565C0" }]} />
          <Text style={styles.legendText}>Secondary Center</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#B00020" }]} />
          <Text style={styles.legendText}>Danger Zone</Text>
        </View>
      </View>

      <ScrollView style={styles.bottomSheet}>

        {/* NEAREST CENTER */}
        {nearestCenter && (
          <View style={styles.nearestCard}>
            <Text style={styles.nearestTitle}>📍 Nearest Evacuation Center</Text>
            <Text style={styles.nearestName}>{nearestCenter.name}</Text>
            <Text style={styles.nearestDistance}>~{nearestCenter.distance}m away</Text>
            <TouchableOpacity
              style={styles.directionsButton}
              onPress={() => handleDirections(nearestCenter)}
            >
              <Text style={styles.directionsText}>🗺 Get Directions</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SELECTED CENTER DETAIL */}
        {selectedCenter && (
          <View style={styles.selectedCard}>
            <Text style={styles.selectedTitle}>{selectedCenter.name}</Text>
            <Text style={styles.selectedDesc}>{selectedCenter.description}</Text>
            <Text style={styles.selectedType}>
              {selectedCenter.type === "primary" ? "🟢 Primary Center" : "🔵 Secondary Center"}
            </Text>
            <TouchableOpacity
              style={styles.directionsButton}
              onPress={() => handleDirections(selectedCenter)}
            >
              <Text style={styles.directionsText}>🗺 Get Directions</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ALL CENTERS LIST */}
        <Text style={styles.listTitle}>All Evacuation Centers</Text>
        {EVACUATION_CENTERS.map((center) => (
          <TouchableOpacity
            key={center.id}
            style={styles.centerCard}
            onPress={() => {
              setSelectedCenter(center);
              handleDirections(center);
            }}
          >
            <View style={styles.centerRow}>
              <Text style={styles.centerName}>{center.name}</Text>
              <Text style={styles.centerType}>
                {center.type === "primary" ? "🟢" : "🔵"}
              </Text>
            </View>
            <Text style={styles.centerDesc}>{center.description}</Text>
          </TouchableOpacity>
        ))}

        {/* DANGER ZONES LIST */}
        <Text style={styles.listTitle}>⚠️ Danger Zones</Text>
        {DANGER_ZONES.map((zone) => (
          <View key={zone.id} style={styles.dangerCard}>
            <Text style={styles.dangerName}>🔴 {zone.name}</Text>
            <Text style={styles.dangerDesc}>Radius: {zone.radius}m — Avoid this area</Text>
          </View>
        ))}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#B00020",
    textAlign: "center",
    marginTop: 50,
    marginBottom: 10,
  },
  map: {
    width: "100%",
    height: 300,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 15,
    paddingVertical: 8,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 11,
    color: "#555",
  },
  bottomSheet: {
    flex: 1,
    padding: 15,
  },
  nearestCard: {
    backgroundColor: "#e8f5e9",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#a5d6a7",
  },
  nearestTitle: {
    fontSize: 12,
    color: "#555",
    marginBottom: 4,
  },
  nearestName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2e7d32",
  },
  nearestDistance: {
    color: "#555",
    fontSize: 13,
    marginTop: 2,
  },
  directionsButton: {
    backgroundColor: "#2e7d32",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  directionsText: {
    color: "#fff",
    fontWeight: "bold",
  },
  selectedCard: {
    backgroundColor: "#e3f2fd",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#90caf9",
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1565C0",
  },
  selectedDesc: {
    color: "#555",
    marginTop: 4,
  },
  selectedType: {
    marginTop: 6,
    fontSize: 13,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#B00020",
    marginBottom: 10,
    marginTop: 5,
  },
  centerCard: {
    backgroundColor: "#fff0f0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ffcccc",
  },
  centerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  centerName: {
    fontWeight: "bold",
    fontSize: 14,
    flex: 1,
  },
  centerType: {
    fontSize: 16,
  },
  centerDesc: {
    color: "#666",
    fontSize: 12,
    marginTop: 3,
  },
  dangerCard: {
    backgroundColor: "#fff0f0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ffcccc",
  },
  dangerName: {
    fontWeight: "bold",
    fontSize: 14,
  },
  dangerDesc: {
    color: "#666",
    fontSize: 12,
    marginTop: 3,
  },
});
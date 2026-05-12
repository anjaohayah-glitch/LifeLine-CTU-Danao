import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";

export default function Preparedness() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Disaster Preparedness</Text>

      <TouchableOpacity style={styles.card} onPress={() => router.push("/earthquake")}>
        <MaterialCommunityIcons name="earth" size={22} color="#fff" />
        <Text style={styles.cardText}>Earthquake Safety</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push("/typhoon")}>
        <MaterialCommunityIcons name="weather-tornado" size={22} color="#fff" />
        <Text style={styles.cardText}>Typhoon Preparedness</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push("/fire")}>
        <MaterialCommunityIcons name="fire" size={22} color="#fff" />
        <Text style={styles.cardText}>Fire Evacuation</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push("/contacts")}>
        <Ionicons name="call" size={22} color="#fff" />
        <Text style={styles.cardText}>CTU Emergency Contacts</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 30,
    textAlign: "center",
  },
  card: {
    backgroundColor: COLORS.primary,
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

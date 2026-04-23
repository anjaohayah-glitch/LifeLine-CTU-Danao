// app/profile.js
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { onValue, ref, set } from "firebase/database";
import { useEffect, useState } from "react";
import { CTU_ACADEMIC_DATA } from "../constants/AcademicData";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../constants/colors";
import { useSettings } from "../context/SettingsContext";
import { auth, db } from "../firebase";

export default function Profile() {
  const router = useRouter();
  const user = auth.currentUser;
  const { theme } = useSettings();
  const { bg, card, border, textDark, textMid, textLight, surface } = theme;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [barangay, setBarangay] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [photoURL, setPhotoURL] = useState(null);
  const [editing, setEditing] = useState(false);
  const [addressPublic, setAddressPublic] = useState(true);
  const [liveAddress, setLiveAddress] = useState(null);

  useEffect(() => {
    if (!user) return;
    const profileRef = ref(db, "users/" + user.uid);
    const unsubscribe = onValue(profileRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setName(data.fullName || data.name || "");
        setPhone(data.phone || "");
        setBarangay(data.barangay || "");
        setEmergencyContact(data.emergencyNumber || data.emergencyContact || "");
        setEmergencyName(data.emergencyName || "");
        setPhotoURL(data.photoURL || null);
        setAddressPublic(data.addressPublic !== false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const location = await Location.getCurrentPositionAsync({});
        const geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (geocode.length > 0) {
          const g = geocode[0];
          setLiveAddress([g.street, g.district, g.city, g.region].filter(Boolean).join(", "));
        }
      } catch (e) {}
    })();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    try {
      await set(ref(db, "users/" + user.uid), {
        fullName: name, email: user.email,
        phone, barangay, addressPublic,
        emergencyContact, emergencyName,
        emergencyNumber: emergencyContact, photoURL,
      });
      setEditing(false);
      Alert.alert("Saved! ✅", "Your profile has been updated.");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Photo library access is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1],
      quality: 0.5, base64: true,
    });
    if (!result.canceled) {
      setPhotoURL("data:image/jpeg;base64," + result.assets[0].base64);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout", style: "destructive",
        onPress: async () => {
          await signOut(auth);
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 My Profile</Text>
        <Text style={styles.headerSub}>{user?.email}</Text>
      </View>

      {/* PROFILE PHOTO */}
      <View style={styles.photoSection}>
        <TouchableOpacity onPress={editing ? handlePickPhoto : null}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoInitial}>
                {name ? name[0].toUpperCase() : "?"}
              </Text>
            </View>
          )}
          {editing && (
            <View style={styles.photoEditBadge}>
              <Text style={styles.photoEditText}>✏️</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={[styles.photoName, { color: textDark }]}>{name || "Your Name"}</Text>
        <Text style={[styles.photoEmail, { color: textLight }]}>{user?.email}</Text>
      </View>

      {/* LIVE ADDRESS */}
      {liveAddress && (
        <View style={[styles.liveAddressCard, { backgroundColor: card, borderColor: border }]}>
          <Text style={styles.liveAddressIcon}>📍</Text>
          <View style={styles.liveAddressContent}>
            <Text style={styles.liveAddressLabel}>Current Location</Text>
            <Text style={[styles.liveAddressText, { color: textMid }]}>{liveAddress}</Text>
          </View>
        </View>
      )}

      {/* ADDRESS PRIVACY */}
      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={[styles.cardTitle, { color: textDark }]}>🔒 Address Privacy</Text>
        <View style={styles.privacyRow}>
          <View style={styles.privacyLeft}>
            <Text style={[styles.privacyLabel, { color: textDark }]}>
              {addressPublic ? "🌐 Address is Public" : "🔒 Address is Private"}
            </Text>
            <Text style={[styles.privacyDesc, { color: textLight }]}>
              {addressPublic
                ? "Your contacts can see your address"
                : "Only you can see your address"}
            </Text>
          </View>
          <Switch
            value={addressPublic}
            onValueChange={(val) => {
              setAddressPublic(val);
              if (!editing) {
                set(ref(db, "users/" + user.uid + "/addressPublic"), val);
              }
            }}
            trackColor={{ false: "#ddd", true: COLORS.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* PROFILE FIELDS */}
      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={[styles.cardTitle, { color: textDark }]}>👤 Personal Information</Text>

        {[
          { label: "Full Name", value: name, setter: setName, placeholder: "Enter your name", editable: true },
          { label: "Email", value: user?.email, setter: null, placeholder: "", editable: false },
          { label: "Phone Number", value: phone, setter: setPhone, placeholder: "Enter phone number", editable: true, keyboard: "phone-pad" },
          { label: "Barangay / Address", value: barangay, setter: setBarangay, placeholder: "Enter your address", editable: true },
        ].map((field, i) => (
          <View key={i}>
            <Text style={[styles.label, { color: textLight }]}>{field.label}</Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: border, color: textDark },
                (!editing || !field.editable) && { backgroundColor: surface, color: textLight },
              ]}
              value={field.value}
              onChangeText={field.setter || undefined}
              placeholder={field.placeholder}
              placeholderTextColor={textLight}
              editable={editing && field.editable}
              keyboardType={field.keyboard || "default"}
            />
          </View>
        ))}
      </View>

      {/* EMERGENCY CONTACT */}
      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={[styles.cardTitle, { color: textDark }]}>🆘 Emergency Contact</Text>

        <Text style={[styles.label, { color: textLight }]}>Contact Name</Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: border, color: textDark },
            !editing && { backgroundColor: surface, color: textLight },
          ]}
          value={emergencyName}
          onChangeText={setEmergencyName}
          placeholder="e.g. Juan Dela Cruz"
          placeholderTextColor={textLight}
          editable={editing}
        />

        <Text style={[styles.label, { color: textLight }]}>Contact Number</Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: border, color: textDark },
            !editing && { backgroundColor: surface, color: textLight },
          ]}
          value={emergencyContact}
          onChangeText={setEmergencyContact}
          placeholder="e.g. 09171234567"
          placeholderTextColor={textLight}
          keyboardType="phone-pad"
          editable={editing}
        />
      </View>

      {/* BUTTONS */}
      {editing ? (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => setEditing(false)}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
          >
            <Text style={styles.buttonText}>💾 Save</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.editButton]}
          onPress={() => setEditing(true)}
        >
          <Text style={styles.buttonText}>✏️ Edit Profile</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, styles.logoutButton]}
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>🚪 Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 55, paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 },
  photoSection: { alignItems: "center", marginBottom: 20 },
  photo: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primary },
  photoPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, justifyContent: "center", alignItems: "center" },
  photoInitial: { color: "#fff", fontSize: 40, fontWeight: "bold" },
  photoEditBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#fff", borderRadius: 12, padding: 2, borderWidth: 1, borderColor: COLORS.primary },
  photoEditText: { fontSize: 14 },
  photoName: { fontWeight: "bold", fontSize: 18, marginTop: 10 },
  photoEmail: { fontSize: 13, marginTop: 3 },
  liveAddressCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 12, marginHorizontal: 20, marginBottom: 15, borderWidth: 1 },
  liveAddressIcon: { fontSize: 24, marginRight: 10 },
  liveAddressContent: { flex: 1 },
  liveAddressLabel: { fontWeight: "bold", color: "#2e7d32", fontSize: 12 },
  liveAddressText: { fontSize: 12, marginTop: 2 },
  card: { borderRadius: 15, padding: 16, marginHorizontal: 20, marginBottom: 15, borderWidth: 1 },
  cardTitle: { fontWeight: "bold", fontSize: 15, marginBottom: 14 },
  privacyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  privacyLeft: { flex: 1 },
  privacyLabel: { fontWeight: "bold", fontSize: 14 },
  privacyDesc: { fontSize: 12, marginTop: 2 },
  label: { fontSize: 12, marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1.5, borderRadius: 10, padding: 12, fontSize: 14 },
  buttonRow: { flexDirection: "row", gap: 10, marginHorizontal: 20, marginBottom: 10 },
  button: { flex: 1, padding: 15, borderRadius: 12, alignItems: "center", marginHorizontal: 20, marginBottom: 10 },
  editButton: { backgroundColor: "#1565C0" },
  saveButton: { backgroundColor: "#2e7d32" },
  cancelButton: { backgroundColor: "#888" },
  logoutButton: { backgroundColor: COLORS.primary, marginBottom: 10 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
// app/profile.js
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { onValue, ref, set } from "firebase/database";
import { useEffect, useState } from "react";
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

const ROLES = {
  student: { label: "Student", icon: "🎓" },
  faculty: { label: "Faculty Staff", icon: "👨‍🏫" },
};

export default function Profile() {
  const router = useRouter();
  const user = auth.currentUser;
  const { theme } = useSettings();
  const { bg, card, border, textDark, textMid, textLight, surface } = theme;
  const isDark = theme.bg === "#121212";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [barangay, setBarangay] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [photoURL, setPhotoURL] = useState(null);
  const [editing, setEditing] = useState(false);
  const [addressPublic, setAddressPublic] = useState(true);
  const [liveAddress, setLiveAddress] = useState(null);
  const [role, setRole] = useState("");
  const [college, setCollege] = useState("");
  const [program, setProgram] = useState("");
  const [yearLevel, setYearLevel] = useState("");

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onValue(ref(db, "users/" + user.uid), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setName(data.fullName || data.name || "");
        setPhone(data.phone || "");
        setBarangay(data.barangay || "");
        setEmergencyContact(data.emergencyNumber || data.emergencyContact || "");
        setEmergencyName(data.emergencyName || "");
        setPhotoURL(data.photoURL || null);
        setAddressPublic(data.addressPublic !== false);
        setRole(data.role || "");
        setCollege(data.college || "");
        setProgram(data.program || "");
        setYearLevel(data.yearLevel || "");
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
        emergencyNumber: emergencyContact,
        photoURL, role, college, program, yearLevel,
      });
      setEditing(false);
      Alert.alert("Saved! ✅", "Your profile has been updated.");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission Denied", "Photo library access is required."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true,
    });
    if (!result.canceled) setPhotoURL("data:image/jpeg;base64," + result.assets[0].base64);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => { await signOut(auth); router.replace("/login"); } },
    ]);
  };

  const Field = ({ label, value, setter, placeholder, keyboard, editable = true }) => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: textLight }]}>{label}</Text>
      <TextInput
        style={[
          styles.fieldInput,
          { borderColor: border, color: textDark, backgroundColor: editing && editable ? (isDark ? "#1e1e1e" : "#fff") : surface },
        ]}
        value={value}
        onChangeText={setter}
        placeholder={placeholder}
        placeholderTextColor={textLight}
        editable={editing && editable}
        keyboardType={keyboard || "default"}
      />
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} showsVerticalScrollIndicator={false}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 My Profile</Text>
        <Text style={styles.headerSub}>Manage your personal information</Text>
        {role ? (
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>
              {ROLES[role]?.icon} {ROLES[role]?.label}
            </Text>
          </View>
        ) : null}
      </View>

      {/* PHOTO + NAME */}
      <View style={[styles.photoCard, { backgroundColor: card, borderColor: border }]}>
        <TouchableOpacity onPress={editing ? handlePickPhoto : null} style={styles.photoWrap}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoInitial}>{name ? name[0].toUpperCase() : "?"}</Text>
            </View>
          )}
          {editing && (
            <View style={styles.photoBadge}>
              <Text style={styles.photoBadgeText}>✏️</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.photoInfo}>
          <Text style={[styles.photoName, { color: textDark }]}>{name || "Your Name"}</Text>
          <Text style={[styles.photoEmail, { color: textLight }]}>{user?.email}</Text>
          {college ? (
            <Text style={[styles.photoCollege, { color: textMid }]}>🏫 {college}</Text>
          ) : null}
          {program ? (
            <Text style={[styles.photoProgram, { color: textMid }]}>📚 {program} {yearLevel ? `· ${yearLevel}` : ""}</Text>
          ) : null}
        </View>
      </View>

      {/* LIVE LOCATION */}
      {liveAddress && (
        <View style={[styles.sectionCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.sectionCardTop}>
            <Text style={styles.sectionCardIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionCardTitle, { color: "#2e7d32" }]}>Current Location</Text>
              <Text style={[styles.sectionCardDesc, { color: textMid }]}>{liveAddress}</Text>
            </View>
          </View>
        </View>
      )}

      {/* ADDRESS PRIVACY */}
      <View style={[styles.sectionCard, { backgroundColor: card, borderColor: border }]}>
        <View style={styles.sectionCardTop}>
          <Text style={styles.sectionCardIcon}>🔒</Text>
          <Text style={[styles.sectionCardTitle, { color: textDark }]}>Address Privacy</Text>
        </View>
        <View style={[styles.privacyRow, { backgroundColor: isDark ? "#1a1a1a" : surface, borderColor: border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.privacyLabel, { color: textDark }]}>
              {addressPublic ? "🌐 Address is Public" : "🔒 Address is Private"}
            </Text>
            <Text style={[styles.privacyDesc, { color: textLight }]}>
              {addressPublic ? "Your contacts can see your address" : "Only you can see your address"}
            </Text>
          </View>
          <Switch
            value={addressPublic}
            onValueChange={(val) => {
              setAddressPublic(val);
              if (!editing) set(ref(db, "users/" + user.uid + "/addressPublic"), val);
            }}
            trackColor={{ false: "#ccc", true: COLORS.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* PERSONAL INFO */}
      <View style={[styles.sectionCard, { backgroundColor: card, borderColor: border }]}>
        <View style={styles.sectionCardTop}>
          <Text style={styles.sectionCardIcon}>👤</Text>
          <Text style={[styles.sectionCardTitle, { color: textDark }]}>Personal Information</Text>
        </View>
        <Field label="Full Name" value={name} setter={setName} placeholder="Enter your name" />
        <Field label="Email" value={user?.email} placeholder="" editable={false} />
        <Field label="Phone Number" value={phone} setter={setPhone} placeholder="Enter phone number" keyboard="phone-pad" />
        <Field label="Barangay / Address" value={barangay} setter={setBarangay} placeholder="Enter your address" />
      </View>

      {/* EMERGENCY CONTACT */}
      <View style={[styles.sectionCard, { backgroundColor: card, borderColor: border }]}>
        <View style={styles.sectionCardTop}>
          <Text style={styles.sectionCardIcon}>🆘</Text>
          <Text style={[styles.sectionCardTitle, { color: textDark }]}>Emergency Contact</Text>
        </View>
        <Field label="Contact Name" value={emergencyName} setter={setEmergencyName} placeholder="e.g. Juan Dela Cruz" />
        <Field label="Contact Number" value={emergencyContact} setter={setEmergencyContact} placeholder="e.g. 09171234567" keyboard="phone-pad" />
      </View>

      {/* EDIT / SAVE BUTTONS */}
      {editing ? (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: isDark ? "#333" : "#90A4AE", flex: 0.4 }]}
            onPress={() => setEditing(false)}
          >
            <Text style={styles.btnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#2e7d32", flex: 1 }]}
            onPress={handleSave}
          >
            <Text style={styles.btnText}>💾 Save Changes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.btn, styles.btnFull, { backgroundColor: "#1565C0" }]}
          onPress={() => setEditing(true)}
        >
          <Text style={styles.btnText}>✏️ Edit Profile</Text>
        </TouchableOpacity>
      )}

      {/* LOGOUT */}
      <TouchableOpacity
        style={[styles.btn, styles.btnFull, { backgroundColor: COLORS.primary }]}
        onPress={handleLogout}
      >
        <Text style={styles.btnText}>🚪 Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // HEADER
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 55, paddingBottom: 24, paddingHorizontal: 24,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    marginBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  rolePill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20, paddingHorizontal: 12,
    paddingVertical: 5, alignSelf: "flex-start", marginTop: 10,
  },
  rolePillText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  // PHOTO CARD
  photoCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 20, marginBottom: 12,
    borderRadius: 20, padding: 16, borderWidth: 1, gap: 16,
    elevation: 2, shadowColor: "#000",
    shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
  },
  photoWrap: { position: "relative" },
  photo: { width: 80, height: 80, borderRadius: 22, borderWidth: 2, borderColor: COLORS.primary },
  photoPlaceholder: { width: 80, height: 80, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: "center", alignItems: "center" },
  photoInitial: { color: "#fff", fontSize: 34, fontWeight: "bold" },
  photoBadge: { position: "absolute", bottom: -2, right: -2, backgroundColor: "#fff", borderRadius: 10, padding: 3, borderWidth: 1.5, borderColor: COLORS.primary },
  photoBadgeText: { fontSize: 12 },
  photoInfo: { flex: 1 },
  photoName: { fontWeight: "bold", fontSize: 17, marginBottom: 2 },
  photoEmail: { fontSize: 12, marginBottom: 4 },
  photoCollege: { fontSize: 11, marginBottom: 2 },
  photoProgram: { fontSize: 11 },

  // SECTION CARD
  sectionCard: {
    marginHorizontal: 20, marginBottom: 12,
    borderRadius: 18, padding: 16, borderWidth: 1,
  },
  sectionCardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  sectionCardIcon: { fontSize: 20 },
  sectionCardTitle: { fontWeight: "bold", fontSize: 15 },
  sectionCardDesc: { fontSize: 12, marginTop: 2 },

  // PRIVACY ROW
  privacyRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, padding: 12, borderWidth: 1,
  },
  privacyLabel: { fontWeight: "600", fontSize: 13 },
  privacyDesc: { fontSize: 11, marginTop: 2 },

  // FIELD
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: "600", marginBottom: 5, letterSpacing: 0.3 },
  fieldInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },

  // BUTTONS
  buttonRow: { flexDirection: "row", gap: 10, marginHorizontal: 20, marginBottom: 10 },
  btn: { padding: 15, borderRadius: 14, alignItems: "center", elevation: 2, shadowColor: "#000", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  btnFull: { marginHorizontal: 20, marginBottom: 10 },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
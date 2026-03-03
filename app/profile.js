import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { onValue, ref, set } from "firebase/database";
import { useEffect, useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, db } from "../firebase";

export default function Profile() {
  const router = useRouter();
  const user = auth.currentUser;

  const [name, setName] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [photoURL, setPhotoURL] = useState(null);
  const [editing, setEditing] = useState(false);

  // 🔥 Load profile from Firebase
  useEffect(() => {
    if (!user) return;
    const profileRef = ref(db, "users/" + user.uid);
    const unsubscribe = onValue(profileRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setName(data.name || "");
        setEmergencyContact(data.emergencyContact || "");
        setEmergencyName(data.emergencyName || "");
        setPhotoURL(data.photoURL || null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 💾 Save profile to Firebase
  const handleSave = async () => {
    if (!user) return;
    try {
      await set(ref(db, "users/" + user.uid), {
        name,
        email: user.email,
        emergencyContact,
        emergencyName,
        photoURL,
      });
      setEditing(false);
      Alert.alert("Saved!", "Your profile has been updated.");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  // 🖼 Pick profile photo
  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Photo library access is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled) {
      const base64Photo = "data:image/jpeg;base64," + result.assets[0].base64;
      setPhotoURL(base64Photo);
    }
  };

  // 🚪 Logout
  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await signOut(auth);
          router.replace("/");
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>

      {/* HEADER */}
      <Text style={styles.header}>👤 My Profile</Text>

      {/* PROFILE PHOTO */}
      <View style={styles.photoContainer}>
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
        <Text style={styles.emailText}>{user?.email}</Text>
      </View>

      {/* PROFILE FIELDS */}
      <View style={styles.card}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={[styles.input, !editing && styles.inputDisabled]}
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          editable={editing}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={user?.email}
          editable={false}
        />
      </View>

      {/* EMERGENCY CONTACT */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🆘 Emergency Contact</Text>

        <Text style={styles.label}>Contact Name</Text>
        <TextInput
          style={[styles.input, !editing && styles.inputDisabled]}
          value={emergencyName}
          onChangeText={setEmergencyName}
          placeholder="e.g. Juan Dela Cruz"
          editable={editing}
        />

        <Text style={styles.label}>Contact Number</Text>
        <TextInput
          style={[styles.input, !editing && styles.inputDisabled]}
          value={emergencyContact}
          onChangeText={setEmergencyContact}
          placeholder="e.g. 09171234567"
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

      {/* LOGOUT */}
      <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
        <Text style={styles.buttonText}>🚪 Logout</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#B00020",
    textAlign: "center",
    marginTop: 50,
    marginBottom: 20,
  },
  photoContainer: {
    alignItems: "center",
    marginBottom: 25,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#B00020",
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#B00020",
    justifyContent: "center",
    alignItems: "center",
  },
  photoInitial: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "bold",
  },
  photoEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 2,
    borderWidth: 1,
    borderColor: "#B00020",
  },
  photoEditText: {
    fontSize: 14,
  },
  emailText: {
    color: "#555",
    marginTop: 10,
    fontSize: 14,
  },
  card: {
    backgroundColor: "#fff0f0",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ffcccc",
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 15,
    color: "#B00020",
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#B00020",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  inputDisabled: {
    backgroundColor: "#f5f5f5",
    borderColor: "#ddd",
    color: "#999",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  editButton: {
    backgroundColor: "#1565C0",
  },
  saveButton: {
    backgroundColor: "#2e7d32",
  },
  cancelButton: {
    backgroundColor: "#888",
  },
  logoutButton: {
    backgroundColor: "#B00020",
    marginBottom: 40,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});
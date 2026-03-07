// app/settings.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword, updateProfile } from "firebase/auth";
import { useState } from "react";
import {
  Alert,
  Modal,
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
import { auth } from "../firebase";

export default function Settings() {
  const router = useRouter();
  const {
    language, updateLanguage,
    darkMode, updateDarkMode,
    notifications, updateNotifications,
    voiceSpeed, updateVoiceSpeed,
    theme,
  } = useSettings();

  const [profileModal, setProfileModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [privacyModal, setPrivacyModal] = useState(false);
  const [aboutModal, setAboutModal] = useState(false);

  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert("Error", "Display name cannot be empty.");
      return;
    }
    try {
      setSaving(true);
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      setProfileModal(false);
      Alert.alert("Success ✅", "Profile updated successfully!");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    try {
      setSaving(true);
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Success ✅", "Password changed successfully!");
    } catch (error) {
      if (error.code === "auth/wrong-password") {
        Alert.alert("Error", "Current password is incorrect.");
      } else {
        Alert.alert("Error", error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await signOut(auth);
            await AsyncStorage.removeItem("userUID"); // ✅ Clear saved session
            router.replace("/login");
          },
        },
      ]
    );
  };

  const LANGUAGES = [
    { key: "en", label: "English", flag: "🇺🇸" },
    { key: "ceb", label: "Cebuano", flag: "🇵🇭" },
    { key: "fil", label: "Filipino", flag: "🇵🇭" },
  ];

  const VOICE_SPEEDS = [
    { key: "slow", label: "Slow", icon: "🐢" },
    { key: "normal", label: "Normal", icon: "🚶" },
    { key: "fast", label: "Fast", icon: "🏃" },
  ];

  // Dynamic styles based on dark mode
  const bg = theme.bg;
  const card = theme.card;
  const border = theme.border;
  const textDark = theme.textDark;
  const textLight = theme.textLight;
  const textMid = theme.textMid;
  const surface = theme.surface;

  return (
    <View style={[styles.wrapper, { backgroundColor: bg }]}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚙️ Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* USER CARD */}
        <View style={[styles.userCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {auth.currentUser?.displayName?.[0]?.toUpperCase() || "U"}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: textDark }]}>
              {auth.currentUser?.displayName || "User"}
            </Text>
            <Text style={[styles.userEmail, { color: textLight }]}>
              {auth.currentUser?.email}
            </Text>
          </View>
        </View>

        {/* 🌐 LANGUAGE */}
        <View style={[styles.section, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textDark }]}>🌐 Language</Text>
          <Text style={[styles.sectionNote, { color: textLight }]}>
            {language === "en" ? "App language: English" : language === "ceb" ? "App language: Cebuano" : "App language: Filipino"}
          </Text>
          <View style={styles.langButtons}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.key}
                style={[
                  styles.langButton,
                  { borderColor: border, backgroundColor: card },
                  language === lang.key && styles.langButtonActive,
                ]}
                onPress={() => updateLanguage(lang.key)}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langLabel, { color: textMid }, language === lang.key && { color: "#fff" }]}>
                  {lang.label}
                </Text>
                {language === lang.key && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 🔔 NOTIFICATIONS */}
        <View style={[styles.section, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textDark }]}>🔔 Notifications</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🚨</Text>
              <View>
                <Text style={[styles.settingLabel, { color: textDark }]}>Emergency Alerts</Text>
                <Text style={[styles.settingDesc, { color: textLight }]}>Receive real-time disaster alerts</Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={(val) => updateNotifications(val)}
              trackColor={{ false: "#ddd", true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* 🌙 DARK MODE */}
        <View style={[styles.section, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textDark }]}>🌙 Appearance</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>{darkMode ? "🌙" : "☀️"}</Text>
              <View>
                <Text style={[styles.settingLabel, { color: textDark }]}>Dark Mode</Text>
                <Text style={[styles.settingDesc, { color: textLight }]}>
                  {darkMode ? "Dark theme enabled" : "Light theme enabled"}
                </Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={(val) => updateDarkMode(val)}
              trackColor={{ false: "#ddd", true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* 🔊 VOICE SPEED */}
        <View style={[styles.section, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textDark }]}>🔊 Voice Guide Speed</Text>
          <View style={styles.speedButtons}>
            {VOICE_SPEEDS.map((speed) => (
              <TouchableOpacity
                key={speed.key}
                style={[
                  styles.speedButton,
                  { borderColor: border, backgroundColor: card },
                  voiceSpeed === speed.key && styles.speedButtonActive,
                ]}
                onPress={() => updateVoiceSpeed(speed.key)}
              >
                <Text style={styles.speedIcon}>{speed.icon}</Text>
                <Text style={[styles.speedLabel, { color: textMid }, voiceSpeed === speed.key && { color: "#fff" }]}>
                  {speed.label}
                </Text>
                {voiceSpeed === speed.key && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 👤 ACCOUNT */}
        <View style={[styles.section, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textDark }]}>👤 Account</Text>
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: border }]} onPress={() => setProfileModal(true)}>
            <Text style={styles.menuIcon}>✏️</Text>
            <View style={styles.menuContent}>
              <Text style={[styles.menuLabel, { color: textDark }]}>Edit Display Name</Text>
              <Text style={[styles.menuDesc, { color: textLight }]}>Update your name in the app</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setPasswordModal(true)}>
            <Text style={styles.menuIcon}>🔑</Text>
            <View style={styles.menuContent}>
              <Text style={[styles.menuLabel, { color: textDark }]}>Change Password</Text>
              <Text style={[styles.menuDesc, { color: textLight }]}>Update your account password</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ℹ️ INFO */}
        <View style={[styles.section, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textDark }]}>ℹ️ Information</Text>
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: border }]} onPress={() => setAboutModal(true)}>
            <Text style={styles.menuIcon}>📱</Text>
            <View style={styles.menuContent}>
              <Text style={[styles.menuLabel, { color: textDark }]}>About LIFELINE</Text>
              <Text style={[styles.menuDesc, { color: textLight }]}>Version info and credits</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setPrivacyModal(true)}>
            <Text style={styles.menuIcon}>🔒</Text>
            <View style={styles.menuContent}>
              <Text style={[styles.menuLabel, { color: textDark }]}>Privacy Policy</Text>
              <Text style={[styles.menuDesc, { color: textLight }]}>How we handle your data</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 🚪 LOGOUT */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal visible={profileModal} transparent animationType="slide" onRequestClose={() => setProfileModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: card }]}>
            <Text style={[styles.modalTitle, { color: textDark }]}>✏️ Edit Display Name</Text>
            <View style={[styles.inputWrapper, { borderColor: border, backgroundColor: surface }]}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={[styles.input, { color: textDark }]}
                placeholder="Display name"
                placeholderTextColor={textLight}
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>
            <TouchableOpacity
              style={[styles.modalButton, saving && { opacity: 0.7 }]}
              onPress={handleUpdateProfile}
              disabled={saving}
            >
              <Text style={styles.modalButtonText}>{saving ? "Saving..." : "Save Changes"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalCancel, { borderColor: border }]} onPress={() => setProfileModal(false)}>
              <Text style={[styles.modalCancelText, { color: textMid }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CHANGE PASSWORD MODAL */}
      <Modal visible={passwordModal} transparent animationType="slide" onRequestClose={() => setPasswordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: card }]}>
            <Text style={[styles.modalTitle, { color: textDark }]}>🔑 Change Password</Text>
            {[
              { placeholder: "Current password", value: currentPassword, setter: setCurrentPassword },
              { placeholder: "New password", value: newPassword, setter: setNewPassword },
              { placeholder: "Confirm new password", value: confirmPassword, setter: setConfirmPassword },
            ].map((field, index) => (
              <View key={index} style={[styles.inputWrapper, { borderColor: border, backgroundColor: surface }]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={[styles.input, { color: textDark }]}
                  placeholder={field.placeholder}
                  placeholderTextColor={textLight}
                  value={field.value}
                  onChangeText={field.setter}
                  secureTextEntry
                />
              </View>
            ))}
            <TouchableOpacity
              style={[styles.modalButton, saving && { opacity: 0.7 }]}
              onPress={handleChangePassword}
              disabled={saving}
            >
              <Text style={styles.modalButtonText}>{saving ? "Saving..." : "Change Password"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCancel, { borderColor: border }]}
              onPress={() => { setPasswordModal(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
            >
              <Text style={[styles.modalCancelText, { color: textMid }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ABOUT MODAL */}
      <Modal visible={aboutModal} transparent animationType="slide" onRequestClose={() => setAboutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: card }]}>
            <View style={styles.aboutHeader}>
              <Text style={styles.aboutEmoji}>🚑</Text>
              <Text style={styles.aboutName}>LIFELINE</Text>
              <Text style={[styles.aboutVersion, { color: textLight }]}>Version 1.0.4</Text>
            </View>
            {[
              { label: "Developer", value: "CTU Danao Campus" },
              { label: "Purpose", value: "Disaster Preparedness & DRRM" },
              { label: "Platform", value: "Android & iOS (Expo Go)" },
              { label: "Built with", value: "React Native + Firebase" },
              { label: "Campus", value: "Sabang, Danao City, Cebu" },
              { label: "DRRMO Hotline", value: "0917-723-6262" },
            ].map((item, index) => (
              <View key={index} style={[styles.aboutRow, { borderColor: border }]}>
                <Text style={[styles.aboutLabel, { color: textLight }]}>{item.label}</Text>
                <Text style={[styles.aboutValue, { color: textDark }]}>{item.value}</Text>
              </View>
            ))}
            <TouchableOpacity style={[styles.modalCancel, { borderColor: border }]} onPress={() => setAboutModal(false)}>
              <Text style={[styles.modalCancelText, { color: textMid }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PRIVACY MODAL */}
      <Modal visible={privacyModal} transparent animationType="slide" onRequestClose={() => setPrivacyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: card, paddingBottom: 30 }]}>
            <Text style={[styles.modalTitle, { color: textDark }]}>🔒 Privacy Policy</Text>
            <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
              {[
                { title: "Data Collection", text: "LIFELINE collects your email address, display name, and location data (only when SOS is triggered) to provide disaster preparedness services." },
                { title: "Data Storage", text: "Your data is securely stored in Firebase by Google. We do not sell or share your personal information with third parties." },
                { title: "Location Data", text: "Location is only accessed when you tap the SOS button. We do not track your location continuously." },
                { title: "Notifications", text: "We send emergency alerts and announcements from CTU Danao DRRMO. You can disable notifications in Settings." },
                { title: "Contact", text: "For privacy concerns, contact CTU Danao DRRMO at 0917-723-6262." },
              ].map((item, index) => (
                <View key={index} style={styles.privacyItem}>
                  <Text style={[styles.privacyTitle]}>{item.title}</Text>
                  <Text style={[styles.privacyText, { color: textMid }]}>{item.text}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalCancel, { borderColor: border }]} onPress={() => setPrivacyModal(false)}>
              <Text style={[styles.modalCancelText, { color: textMid }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 55, paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backButton: { width: 40 },
  backText: { color: "#fff", fontSize: 24 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  container: { flex: 1, paddingHorizontal: 20 },
  userCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 15, padding: 16,
    marginBottom: 20, marginTop: 10,
    borderWidth: 1, elevation: 2,
  },
  userAvatar: {
    width: 55, height: 55, borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center", alignItems: "center", marginRight: 14,
  },
  userAvatarText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  userInfo: { flex: 1 },
  userName: { fontWeight: "bold", fontSize: 16 },
  userEmail: { fontSize: 13, marginTop: 3 },
  section: {
    borderRadius: 15, padding: 16,
    marginBottom: 15, borderWidth: 1,
  },
  sectionTitle: { fontWeight: "bold", fontSize: 15, marginBottom: 8 },
  sectionNote: { fontSize: 11, marginBottom: 10, fontStyle: "italic" },
  langButtons: { flexDirection: "row", gap: 8 },
  langButton: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 4,
    padding: 10, borderRadius: 10, borderWidth: 1.5,
  },
  langButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  langFlag: { fontSize: 16 },
  langLabel: { fontSize: 11, fontWeight: "bold" },
  checkMark: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  settingIcon: { fontSize: 26 },
  settingLabel: { fontWeight: "bold", fontSize: 14 },
  settingDesc: { fontSize: 12, marginTop: 2 },
  speedButtons: { flexDirection: "row", gap: 8 },
  speedButton: {
    flex: 1, alignItems: "center", padding: 12,
    borderRadius: 10, borderWidth: 1.5,
  },
  speedButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  speedIcon: { fontSize: 24, marginBottom: 4 },
  speedLabel: { fontSize: 12, fontWeight: "bold" },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, borderBottomWidth: 1,
  },
  menuIcon: { fontSize: 22, marginRight: 12 },
  menuContent: { flex: 1 },
  menuLabel: { fontWeight: "bold", fontSize: 14 },
  menuDesc: { fontSize: 12, marginTop: 2 },
  menuArrow: { fontSize: 22, color: "#ccc" },
  logoutButton: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 10,
    backgroundColor: "#ffebee", borderRadius: 15,
    padding: 16, marginBottom: 15,
    borderWidth: 1.5, borderColor: "#ffcdd2",
  },
  logoutIcon: { fontSize: 22 },
  logoutText: { color: "#e53935", fontWeight: "bold", fontSize: 16 },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBox: {
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 25, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, fontSize: 15 },
  modalButton: {
    backgroundColor: COLORS.primary, padding: 15,
    borderRadius: 12, alignItems: "center", marginTop: 5,
  },
  modalButtonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  modalCancel: {
    padding: 14, borderRadius: 12,
    alignItems: "center", marginTop: 10, borderWidth: 1.5,
  },
  modalCancelText: { fontWeight: "bold", fontSize: 15 },
  aboutHeader: { alignItems: "center", marginBottom: 20 },
  aboutEmoji: { fontSize: 50, marginBottom: 8 },
  aboutName: { fontSize: 24, fontWeight: "bold", color: COLORS.primary },
  aboutVersion: { fontSize: 13, marginTop: 4 },
  aboutRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1,
  },
  aboutLabel: { fontSize: 13 },
  aboutValue: { fontWeight: "bold", fontSize: 13, maxWidth: "60%", textAlign: "right" },
  privacyItem: { marginBottom: 15 },
  privacyTitle: { fontWeight: "bold", color: COLORS.primary, fontSize: 14, marginBottom: 5 },
  privacyText: { fontSize: 13, lineHeight: 20 },
});
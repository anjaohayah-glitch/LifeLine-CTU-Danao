// app/settings.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword, updateProfile } from "firebase/auth";
import { useState } from "react";
import {
  Alert, Modal, ScrollView, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View,
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
    theme, t,
  } = useSettings();

  const { bg, card, border, textDark, textMid, textLight, surface } = theme;
  const isDark = theme.bg === "#121212";

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
    if (!displayName.trim()) { Alert.alert("Error", "Display name cannot be empty."); return; }
    try {
      setSaving(true);
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      setProfileModal(false);
      Alert.alert("Success ✅", "Profile updated successfully!");
    } catch (e) { Alert.alert("Error", e.message); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) { Alert.alert("Error", "Please fill in all fields."); return; }
    if (newPassword !== confirmPassword) { Alert.alert("Error", "New passwords do not match."); return; }
    if (newPassword.length < 6) { Alert.alert("Error", "Password must be at least 6 characters."); return; }
    try {
      setSaving(true);
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setPasswordModal(false);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      Alert.alert("Success ✅", "Password changed successfully!");
    } catch (e) {
      Alert.alert("Error", e.code === "auth/wrong-password" ? "Current password is incorrect." : e.message);
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    Alert.alert(t("logout"), "Are you sure you want to logout?", [
      { text: t("cancel"), style: "cancel" },
      { text: t("logout"), style: "destructive", onPress: async () => {
        await signOut(auth);
        await AsyncStorage.removeItem("userUID");
        router.replace("/login");
      }},
    ]);
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

  const SectionCard = ({ children }) => (
    <View style={[styles.section, { backgroundColor: card, borderColor: border }]}>
      {children}
    </View>
  );

  const SectionTitle = ({ icon, label }) => (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitleIcon}>{icon}</Text>
      <Text style={[styles.sectionTitle, { color: textDark }]}>{label}</Text>
    </View>
  );

  const MenuItem = ({ icon, label, desc, onPress, last }) => (
    <TouchableOpacity
      style={[styles.menuItem, !last && { borderBottomWidth: 1, borderBottomColor: border }]}
      onPress={onPress}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: isDark ? "#1a1a1a" : surface }]}>
        <Text style={styles.menuIcon}>{icon}</Text>
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, { color: textDark }]}>{label}</Text>
        {desc ? <Text style={[styles.menuDesc, { color: textLight }]}>{desc}</Text> : null}
      </View>
      <Text style={[styles.menuArrow, { color: textLight }]}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.wrapper, { backgroundColor: bg }]}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚙️ {t("settings_title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

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
          <View style={[styles.onlineBadge, { backgroundColor: isDark ? "#1a3a1a" : "#E8F5E9" }]}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Active</Text>
          </View>
        </View>

        {/* LANGUAGE */}
        <SectionCard>
          <SectionTitle icon="🌐" label={t("language_label")} />
          <View style={styles.langGrid}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.key}
                style={[
                  styles.langCard,
                  { borderColor: border, backgroundColor: isDark ? "#1a1a1a" : surface },
                  language === lang.key && { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
                ]}
                onPress={() => updateLanguage(lang.key)}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langLabel, { color: language === lang.key ? "#fff" : textDark }]}>
                  {lang.label}
                </Text>
                {language === lang.key && (
                  <View style={styles.langCheck}>
                    <Text style={styles.langCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.langNote, { color: textLight }]}>
            {language === "en" ? "🇺🇸 App is in English" : language === "ceb" ? "🇵🇭 Ang app kay Cebuano" : "🇵🇭 Ang app ay Filipino"}
          </Text>
        </SectionCard>

        {/* APPEARANCE */}
        <SectionCard>
          <SectionTitle icon="🎨" label={t("appearance")} />
          <View style={[styles.toggleRow, { backgroundColor: isDark ? "#1a1a1a" : surface, borderColor: border }]}>
            <Text style={styles.toggleIcon}>{darkMode ? "🌙" : "☀️"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: textDark }]}>{t("dark_mode")}</Text>
              <Text style={[styles.toggleDesc, { color: textLight }]}>
                {darkMode ? "Dark theme enabled" : "Light theme enabled"}
              </Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={updateDarkMode}
              trackColor={{ false: "#ccc", true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        </SectionCard>

        {/* NOTIFICATIONS */}
        <SectionCard>
          <SectionTitle icon="🔔" label={t("notifications_label")} />
          <View style={[styles.toggleRow, { backgroundColor: isDark ? "#1a1a1a" : surface, borderColor: border }]}>
            <Text style={styles.toggleIcon}>🚨</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: textDark }]}>{t("emergency_alerts")}</Text>
              <Text style={[styles.toggleDesc, { color: textLight }]}>
                {notifications ? "Receiving real-time alerts" : "Alerts disabled"}
              </Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={updateNotifications}
              trackColor={{ false: "#ccc", true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        </SectionCard>

        {/* VOICE SPEED */}
        <SectionCard>
          <SectionTitle icon="🔊" label={t("voice_speed")} />
          <View style={styles.speedGrid}>
            {VOICE_SPEEDS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.speedCard,
                  { borderColor: border, backgroundColor: isDark ? "#1a1a1a" : surface },
                  voiceSpeed === s.key && { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
                ]}
                onPress={() => updateVoiceSpeed(s.key)}
              >
                <Text style={styles.speedIcon}>{s.icon}</Text>
                <Text style={[styles.speedLabel, { color: voiceSpeed === s.key ? "#fff" : textDark }]}>
                  {s.label}
                </Text>
                {voiceSpeed === s.key && <Text style={styles.speedCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </SectionCard>

        {/* ACCOUNT */}
        <SectionCard>
          <SectionTitle icon="👤" label={t("account")} />
          <MenuItem icon="✏️" label={t("edit_name")} desc="Update your name in the app" onPress={() => setProfileModal(true)} />
          <MenuItem icon="🔑" label={t("change_password")} desc="Update your account password" onPress={() => setPasswordModal(true)} last />
        </SectionCard>

        {/* INFORMATION */}
        <SectionCard>
          <SectionTitle icon="ℹ️" label={t("information")} />
          <MenuItem icon="📱" label={t("about")} desc="Version info and credits" onPress={() => setAboutModal(true)} />
          <MenuItem icon="🔒" label={t("privacy")} desc="How we handle your data" onPress={() => setPrivacyModal(true)} last />
        </SectionCard>

        {/* LOGOUT */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: isDark ? "#2a1010" : "#FFEBEE", borderColor: isDark ? "#5a2020" : "#FFCDD2" }]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>{t("logout")}</Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* EDIT NAME MODAL */}
      <Modal visible={profileModal} transparent animationType="slide" onRequestClose={() => setProfileModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: card }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: textDark }]}>✏️ {t("edit_name")}</Text>
            <View style={[styles.inputWrap, { borderColor: border, backgroundColor: surface }]}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={[styles.input, { color: textDark }]}
                placeholder="Display name"
                placeholderTextColor={textLight}
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>
            <TouchableOpacity style={[styles.modalBtn, saving && { opacity: 0.7 }]} onPress={handleUpdateProfile} disabled={saving}>
              <Text style={styles.modalBtnText}>{saving ? "Saving..." : t("save_changes")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalCancel, { borderColor: border }]} onPress={() => setProfileModal(false)}>
              <Text style={[styles.modalCancelText, { color: textMid }]}>{t("cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CHANGE PASSWORD MODAL */}
      <Modal visible={passwordModal} transparent animationType="slide" onRequestClose={() => setPasswordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: card }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: textDark }]}>🔑 {t("change_password")}</Text>
            {[
              { placeholder: "Current password", value: currentPassword, setter: setCurrentPassword },
              { placeholder: "New password", value: newPassword, setter: setNewPassword },
              { placeholder: "Confirm new password", value: confirmPassword, setter: setConfirmPassword },
            ].map((field, i) => (
              <View key={i} style={[styles.inputWrap, { borderColor: border, backgroundColor: surface }]}>
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
            <TouchableOpacity style={[styles.modalBtn, saving && { opacity: 0.7 }]} onPress={handleChangePassword} disabled={saving}>
              <Text style={styles.modalBtnText}>{saving ? "Saving..." : t("change_password")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCancel, { borderColor: border }]}
              onPress={() => { setPasswordModal(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
            >
              <Text style={[styles.modalCancelText, { color: textMid }]}>{t("cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ABOUT MODAL */}
      <Modal visible={aboutModal} transparent animationType="slide" onRequestClose={() => setAboutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: card }]}>
            <View style={styles.modalHandle} />
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
            ].map((item, i) => (
              <View key={i} style={[styles.aboutRow, { borderColor: border }]}>
                <Text style={[styles.aboutLabel, { color: textLight }]}>{item.label}</Text>
                <Text style={[styles.aboutValue, { color: textDark }]}>{item.value}</Text>
              </View>
            ))}
            <TouchableOpacity style={[styles.modalCancel, { borderColor: border, marginTop: 16 }]} onPress={() => setAboutModal(false)}>
              <Text style={[styles.modalCancelText, { color: textMid }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PRIVACY MODAL */}
      <Modal visible={privacyModal} transparent animationType="slide" onRequestClose={() => setPrivacyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: card }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: textDark }]}>🔒 {t("privacy")}</Text>
            <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
              {[
                { title: "Data Collection", text: "LIFELINE collects your email, display name, and location (only when SOS is triggered) to provide disaster preparedness services." },
                { title: "Data Storage", text: "Your data is securely stored in Firebase by Google. We do not sell or share your personal information with third parties." },
                { title: "Location Data", text: "Location is only accessed when you tap the SOS button. We do not track your location continuously." },
                { title: "Notifications", text: "We send emergency alerts from CTU Danao DRRMO. You can disable notifications in Settings." },
                { title: "Contact", text: "For privacy concerns, contact CTU Danao DRRMO at 0917-723-6262." },
              ].map((item, i) => (
                <View key={i} style={{ marginBottom: 14 }}>
                  <Text style={styles.privacyHeading}>{item.title}</Text>
                  <Text style={[styles.privacyText, { color: textMid }]}>{item.text}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalCancel, { borderColor: border, marginTop: 12 }]} onPress={() => setPrivacyModal(false)}>
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

  // HEADER
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 55, paddingBottom: 24, paddingHorizontal: 20,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  backBtn: { width: 40 },
  backText: { color: "#fff", fontSize: 22 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },

  scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },

  // USER CARD
  userCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 18, padding: 16, marginBottom: 14,
    borderWidth: 1, elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
  },
  userAvatar: {
    width: 52, height: 52, borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: "center", alignItems: "center", marginRight: 14,
  },
  userAvatarText: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  userInfo: { flex: 1 },
  userName: { fontWeight: "bold", fontSize: 16 },
  userEmail: { fontSize: 12, marginTop: 3 },
  onlineBadge: {
    flexDirection: "row", alignItems: "center",
    gap: 4, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4CAF50" },
  onlineText: { fontSize: 11, fontWeight: "bold", color: "#4CAF50" },

  // SECTION
  section: { borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionTitleIcon: { fontSize: 18 },
  sectionTitle: { fontWeight: "bold", fontSize: 15 },

  // LANGUAGE
  langGrid: { flexDirection: "row", gap: 8, marginBottom: 10 },
  langCard: {
    flex: 1, borderRadius: 12, borderWidth: 1.5,
    padding: 12, alignItems: "center", gap: 4,
    position: "relative",
  },
  langFlag: { fontSize: 22 },
  langLabel: { fontSize: 11, fontWeight: "bold" },
  langCheck: {
    position: "absolute", top: 5, right: 5,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center", alignItems: "center",
  },
  langCheckText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  langNote: { fontSize: 11, fontStyle: "italic", textAlign: "center" },

  // TOGGLE ROW
  toggleRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, padding: 12,
    borderWidth: 1, gap: 12,
  },
  toggleIcon: { fontSize: 26 },
  toggleLabel: { fontWeight: "bold", fontSize: 14 },
  toggleDesc: { fontSize: 11, marginTop: 2 },

  // SPEED
  speedGrid: { flexDirection: "row", gap: 8 },
  speedCard: {
    flex: 1, borderRadius: 12, borderWidth: 1.5,
    padding: 12, alignItems: "center", gap: 4,
  },
  speedIcon: { fontSize: 24 },
  speedLabel: { fontSize: 12, fontWeight: "bold" },
  speedCheck: { color: "#fff", fontSize: 10, fontWeight: "bold" },

  // MENU ITEM
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  menuIconWrap: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  menuIcon: { fontSize: 18 },
  menuContent: { flex: 1 },
  menuLabel: { fontWeight: "bold", fontSize: 14 },
  menuDesc: { fontSize: 11, marginTop: 2 },
  menuArrow: { fontSize: 20 },

  // LOGOUT
  logoutBtn: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 10,
    borderRadius: 16, padding: 16,
    marginBottom: 14, borderWidth: 1.5,
  },
  logoutIcon: { fontSize: 20 },
  logoutText: { color: "#e53935", fontWeight: "bold", fontSize: 15 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: "#ECEFF1", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 18, textAlign: "center" },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  inputIcon: { fontSize: 17, marginRight: 10 },
  input: { flex: 1, fontSize: 15 },
  modalBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 12, alignItems: "center", marginTop: 4 },
  modalBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  modalCancel: { padding: 13, borderRadius: 12, alignItems: "center", marginTop: 10, borderWidth: 1.5 },
  modalCancelText: { fontWeight: "bold", fontSize: 14 },

  // ABOUT
  aboutHeader: { alignItems: "center", marginBottom: 18 },
  aboutEmoji: { fontSize: 48, marginBottom: 8 },
  aboutName: { fontSize: 22, fontWeight: "bold", color: COLORS.primary },
  aboutVersion: { fontSize: 12, marginTop: 4 },
  aboutRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1 },
  aboutLabel: { fontSize: 13 },
  aboutValue: { fontWeight: "bold", fontSize: 13, maxWidth: "60%", textAlign: "right" },

  // PRIVACY
  privacyHeading: { fontWeight: "bold", color: COLORS.primary, fontSize: 13, marginBottom: 4 },
  privacyText: { fontSize: 12, lineHeight: 19 },
});
// app/admin.js
import { onValue, ref, remove, set } from "firebase/database";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../constants/colors";
import { useSettings } from "../context/SettingsContext";
import { db } from "../firebase";
import { useAdmin } from "../hooks/useAdmin";

export default function Admin() {
  const { isAdmin, loading } = useAdmin();
  const [sosRequests, setSosRequests] = useState([]);
  const [announcement, setAnnouncement] = useState("");
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("alerts");
  const { theme } = useSettings();
  const { bg, card, border, textDark, textMid, textLight, surface } = theme;

  useEffect(() => {
    const sosRef = ref(db, "sosRequests");
    const unsubscribe = onValue(sosRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        setSosRequests(list);
      } else setSosRequests([]);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const usersRef = ref(db, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        setUsers(list);
      } else setUsers([]);
    });
    return () => unsubscribe();
  }, []);

  const sendAlert = async () => {
    await set(ref(db, "emergencyAlert"), { active: true, message: "Emergency alert issued!" });
    Alert.alert("Alert Sent", "🚨 Emergency alert is now live!");
  };

  const clearAlert = async () => {
    await set(ref(db, "emergencyAlert"), { active: false, message: "" });
    Alert.alert("Alert Cleared", "Emergency alert has been turned off.");
  };

  const sendAnnouncement = async () => {
    if (!announcement.trim()) {
      Alert.alert("Empty", "Please type an announcement first.");
      return;
    }
    await set(ref(db, "announcement"), {
      message: announcement,
      timestamp: new Date().toISOString(),
    });
    setAnnouncement("");
    Alert.alert("Sent!", "📢 Announcement broadcast to all users.");
  };

  const deleteSOS = async (id) => {
    await remove(ref(db, "sosRequests/" + id));
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { color: COLORS.primary }]}>Checking access...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[styles.accessDenied, { backgroundColor: bg }]}>
        <Text style={styles.accessIcon}>🚫</Text>
        <Text style={styles.accessTitle}>Access Denied</Text>
        <Text style={[styles.accessDesc, { color: textMid }]}>
          You do not have admin privileges to access this page.
          Please contact your campus DRRMO administrator.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: bg }]}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛡 Admin Dashboard</Text>
        <Text style={styles.headerSub}>CTU Danao DRRMO Control Panel</Text>
      </View>

      {/* TABS */}
      <View style={[styles.tabs, { borderColor: border }]}>
        {["alerts", "sos", "announce", "users"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: textLight }, activeTab === tab && styles.activeTabText]}>
              {tab === "alerts" ? "🚨 Alert" :
               tab === "sos" ? "📍 SOS" :
               tab === "announce" ? "📢 Post" : "👥 Users"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={[styles.content, { backgroundColor: bg }]}>

        {/* EMERGENCY ALERT TAB */}
        {activeTab === "alerts" && (
          <View>
            <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>Emergency Alert Control</Text>
            <Text style={[styles.description, { color: textMid }]}>
              Sending an alert will show a banner to ALL users instantly.
            </Text>
            <TouchableOpacity style={styles.sosButton} onPress={sendAlert}>
              <Text style={styles.buttonText}>🚨 SEND EMERGENCY ALERT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={clearAlert}>
              <Text style={styles.buttonText}>✅ CLEAR ALERT</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SOS TAB */}
        {activeTab === "sos" && (
          <View>
            <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>
              SOS Requests ({sosRequests.length})
            </Text>
            {sosRequests.length > 0 ? (
              sosRequests.map((req) => (
                <View key={req.id} style={[styles.sosCard, { backgroundColor: card, borderColor: border }]}>
                  <Text style={[styles.sosName, { color: textDark }]}>👤 {req.name || req.email}</Text>
                  <Text style={[styles.sosText, { color: textMid }]}>📍 {req.address || `${req.latitude?.toFixed(4)}, ${req.longitude?.toFixed(4)}`}</Text>
                  <Text style={[styles.sosTime, { color: textLight }]}>🕐 {new Date(req.timestamp).toLocaleString()}</Text>
                  <View style={styles.sosActions}>
                    {req.locationUrl && (
                      <TouchableOpacity
                        style={styles.mapButton}
                        onPress={() => Linking.openURL(req.locationUrl)}
                      >
                        <Text style={styles.mapButtonText}>🗺 View Map</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.deleteButton} onPress={() => deleteSOS(req.id)}>
                      <Text style={styles.deleteText}>🗑 Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>✅</Text>
                <Text style={[styles.emptyText, { color: textLight }]}>No SOS requests right now</Text>
              </View>
            )}
          </View>
        )}

        {/* ANNOUNCEMENT TAB */}
        {activeTab === "announce" && (
          <View>
            <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>Broadcast Announcement</Text>
            <Text style={[styles.description, { color: textMid }]}>
              Message will be shown to all users on their home screen.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: surface, borderColor: border, color: textDark }]}
              placeholder="Type your announcement here..."
              placeholderTextColor={textLight}
              value={announcement}
              onChangeText={setAnnouncement}
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity style={styles.announceButton} onPress={sendAnnouncement}>
              <Text style={styles.buttonText}>📢 BROADCAST NOW</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && (
          <View>
            <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>
              Registered Users ({users.length})
            </Text>
            {users.length > 0 ? (
              users.map((user) => (
                <View key={user.id} style={[styles.userCard, { backgroundColor: card, borderColor: border }]}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {(user.fullName || user.email || "?")[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: textDark }]}>{user.fullName || "Unknown"}</Text>
                    <Text style={[styles.userEmail, { color: textLight }]}>✉️ {user.email || user.id}</Text>
                    {user.phone && <Text style={[styles.userDetail, { color: textLight }]}>📱 {user.phone}</Text>}
                    {user.barangay && <Text style={[styles.userDetail, { color: textLight }]}>📍 {user.barangay}</Text>}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={[styles.emptyText, { color: textLight }]}>No registered users yet.</Text>
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 15, fontSize: 15 },
  accessDenied: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30 },
  accessIcon: { fontSize: 70, marginBottom: 20 },
  accessTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.primary, marginBottom: 12 },
  accessDesc: { textAlign: "center", fontSize: 14, lineHeight: 22 },
  header: { backgroundColor: COLORS.primary, paddingTop: 55, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, marginHorizontal: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  activeTab: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 11 },
  activeTabText: { color: COLORS.primary, fontWeight: "bold" },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  description: { marginBottom: 20, fontSize: 13 },
  sosButton: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 12, alignItems: "center", marginBottom: 12, elevation: 3 },
  clearButton: { backgroundColor: "#2e7d32", padding: 15, borderRadius: 12, alignItems: "center", elevation: 3 },
  announceButton: { backgroundColor: "#1565C0", padding: 15, borderRadius: 12, alignItems: "center", marginTop: 10, elevation: 3 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  sosCard: { borderRadius: 12, padding: 15, marginBottom: 10, borderWidth: 1 },
  sosName: { fontWeight: "bold", fontSize: 14, marginBottom: 4 },
  sosText: { fontSize: 13, marginTop: 2 },
  sosTime: { fontSize: 12, marginTop: 4 },
  sosActions: { flexDirection: "row", gap: 10, marginTop: 10, justifyContent: "flex-end" },
  mapButton: { backgroundColor: "#1565C0", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  mapButtonText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  deleteButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#ffebee" },
  deleteText: { color: COLORS.primary, fontWeight: "bold", fontSize: 12 },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 14, textAlignVertical: "top", minHeight: 120, marginBottom: 10, fontSize: 14 },
  userCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  userAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary, justifyContent: "center", alignItems: "center", marginRight: 12 },
  userAvatarText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  userInfo: { flex: 1 },
  userName: { fontWeight: "bold", fontSize: 15 },
  userEmail: { fontSize: 12, marginTop: 3 },
  userDetail: { fontSize: 12, marginTop: 2 },
  emptyState: { alignItems: "center", marginTop: 50 },
  emptyIcon: { fontSize: 50 },
  emptyText: { marginTop: 10, fontSize: 15 },
});
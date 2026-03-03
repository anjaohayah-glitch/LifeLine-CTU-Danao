// app/admin.js
import { onValue, ref, remove, set } from "firebase/database";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { COLORS } from "../constants/colors";
import { db } from "../firebase";
import { useAdmin } from "../hooks/useAdmin";

export default function Admin() {
  const { isAdmin, loading } = useAdmin();
  const [sosRequests, setSosRequests] = useState([]);
  const [announcement, setAnnouncement] = useState("");
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("alerts");

  useEffect(() => {
    const sosRef = ref(db, "sosRequests");
    const unsubscribe = onValue(sosRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        setSosRequests(list);
      } else {
        setSosRequests([]);
      }
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
      } else {
        setUsers([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const sendAlert = async () => {
    await set(ref(db, "emergencyAlert"), true);
    Alert.alert("Alert Sent", "🚨 Emergency alert is now live!");
  };

  const clearAlert = async () => {
    await set(ref(db, "emergencyAlert"), false);
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

  // ⏳ LOADING
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Checking access...</Text>
      </View>
    );
  }

  // 🚫 ACCESS DENIED
  if (!isAdmin) {
    return (
      <View style={styles.accessDenied}>
        <Text style={styles.accessIcon}>🚫</Text>
        <Text style={styles.accessTitle}>Access Denied</Text>
        <Text style={styles.accessDesc}>
          You do not have admin privileges to access this page.
          Please contact your campus DRRMO administrator.
        </Text>
      </View>
    );
  }

  // ✅ ADMIN DASHBOARD
  return (
    <View style={styles.wrapper}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛡 Admin Dashboard</Text>
        <Text style={styles.headerSub}>CTU Danao DRRMO Control Panel</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        {["alerts", "sos", "announce", "users"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === "alerts" ? "🚨 Alert" :
               tab === "sos" ? "📍 SOS" :
               tab === "announce" ? "📢 Announce" : "👥 Users"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>

        {/* 🚨 EMERGENCY ALERT TAB */}
        {activeTab === "alerts" && (
          <View>
            <Text style={styles.sectionTitle}>Emergency Alert Control</Text>
            <Text style={styles.description}>
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

        {/* 📍 SOS MAP TAB */}
        {activeTab === "sos" && (
          <View>
            <Text style={styles.sectionTitle}>SOS Requests ({sosRequests.length})</Text>
            {sosRequests.length > 0 ? (
              <>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: sosRequests[0].latitude,
                    longitude: sosRequests[0].longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                >
                  {sosRequests.map((req) => (
                    <Marker
                      key={req.id}
                      coordinate={{ latitude: req.latitude, longitude: req.longitude }}
                      title="SOS Request"
                      description={req.timestamp}
                      pinColor="red"
                    />
                  ))}
                </MapView>
                {sosRequests.map((req) => (
                  <View key={req.id} style={styles.sosCard}>
                    <Text style={styles.sosText}>
                      📍 {req.latitude.toFixed(4)}, {req.longitude.toFixed(4)}
                    </Text>
                    <Text style={styles.sosTime}>
                      🕐 {new Date(req.timestamp).toLocaleString()}
                    </Text>
                    <TouchableOpacity
                      onPress={() => deleteSOS(req.id)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteText}>🗑 Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>✅</Text>
                <Text style={styles.emptyText}>No SOS requests right now</Text>
              </View>
            )}
          </View>
        )}

        {/* 📢 ANNOUNCEMENT TAB */}
        {activeTab === "announce" && (
          <View>
            <Text style={styles.sectionTitle}>Broadcast Announcement</Text>
            <Text style={styles.description}>
              Message will be shown to all users on their home screen.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Type your announcement here..."
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

        {/* 👥 USERS TAB */}
        {activeTab === "users" && (
          <View>
            <Text style={styles.sectionTitle}>Registered Users ({users.length})</Text>
            {users.length > 0 ? (
              users.map((user) => (
                <View key={user.id} style={styles.userCard}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {(user.fullName || user.email || "?")[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.fullName || "Unknown"}</Text>
                    <Text style={styles.userEmail}>✉️ {user.email || user.id}</Text>
                    {user.phone && (
                      <Text style={styles.userDetail}>📱 {user.phone}</Text>
                    )}
                    {user.barangay && (
                      <Text style={styles.userDetail}>📍 {user.barangay}</Text>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyText}>No registered users yet.</Text>
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff" },
  centered: {
    flex: 1, justifyContent: "center",
    alignItems: "center", backgroundColor: "#fff",
  },
  loadingText: { marginTop: 15, color: COLORS.primary, fontSize: 15 },
  accessDenied: {
    flex: 1, justifyContent: "center",
    alignItems: "center", padding: 30,
    backgroundColor: "#fff",
  },
  accessIcon: { fontSize: 70, marginBottom: 20 },
  accessTitle: {
    fontSize: 24, fontWeight: "bold",
    color: COLORS.primary, marginBottom: 12,
  },
  accessDesc: {
    color: COLORS.textMid, textAlign: "center",
    fontSize: 14, lineHeight: 22,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 55, paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1, borderColor: COLORS.border,
    marginHorizontal: 20,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  activeTab: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 11, color: COLORS.textLight },
  activeTabText: { color: COLORS.primary, fontWeight: "bold" },
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 18, fontWeight: "bold",
    color: COLORS.primary, marginBottom: 8,
  },
  description: { color: COLORS.textMid, marginBottom: 20, fontSize: 13 },
  sosButton: {
    backgroundColor: COLORS.primary, padding: 15,
    borderRadius: 12, alignItems: "center", marginBottom: 12,
    elevation: 3,
  },
  clearButton: {
    backgroundColor: "#2e7d32", padding: 15,
    borderRadius: 12, alignItems: "center",
    elevation: 3,
  },
  announceButton: {
    backgroundColor: "#1565C0", padding: 15,
    borderRadius: 12, alignItems: "center", marginTop: 10,
    elevation: 3,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  map: { width: "100%", height: 250, borderRadius: 12, marginBottom: 15 },
  sosCard: {
    backgroundColor: COLORS.surface, padding: 15,
    borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sosText: { fontWeight: "bold", color: COLORS.textDark },
  sosTime: { color: COLORS.textLight, fontSize: 12, marginTop: 4 },
  deleteButton: { marginTop: 8, alignSelf: "flex-end" },
  deleteText: { color: COLORS.primary, fontWeight: "bold" },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, padding: 14,
    textAlignVertical: "top", minHeight: 120,
    marginBottom: 10, backgroundColor: COLORS.surface,
    fontSize: 14,
  },
  userCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  userAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORS.primary,
    justifyContent: "center", alignItems: "center",
    marginRight: 12,
  },
  userAvatarText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  userInfo: { flex: 1 },
  userName: { fontWeight: "bold", fontSize: 15, color: COLORS.textDark },
  userEmail: { color: COLORS.textLight, fontSize: 12, marginTop: 3 },
  userDetail: { color: COLORS.textLight, fontSize: 12, marginTop: 2 },
  emptyState: { alignItems: "center", marginTop: 50 },
  emptyIcon: { fontSize: 50 },
  emptyText: { color: COLORS.textLight, marginTop: 10, fontSize: 15 },
});
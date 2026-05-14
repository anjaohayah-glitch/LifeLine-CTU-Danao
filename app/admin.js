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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useSettings } from "../context/SettingsContext";
import { db } from "../firebase";
import { useAdmin } from "../hooks/useAdmin";
import { checkEarthquakes } from "../hooks/useWeatherNotifications";
import { sendPushToAllUsers } from "../utils/sendPushNotification"; //  ADD THIS

export default function Admin() {
  const { isAdmin, loading } = useAdmin();
  const [sosRequests, setSosRequests] = useState([]);
  const [announcement, setAnnouncement] = useState("");
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("alerts");
  const [checkingQuake, setCheckingQuake] = useState(false);
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

  //  UPDATED - now also sends push to closed apps
  const sendAlert = async () => {
    try {
      await set(ref(db, "emergencyAlert"), {
        active: true,
        message: "Emergency alert issued!",
        timestamp: Date.now(),
      });

      //  Send push to ALL users even if app is closed
      await sendPushToAllUsers(
        " EMERGENCY ALERT — LIFELINE",
        "A disaster alert has been issued for CTU Danao Campus. Stay safe!",
        { screen: "home" },
        "emergency"
      );

      Alert.alert("Alert Sent", " Emergency alert is now live!");
    } catch (_e) {
      Alert.alert("Error", "Failed to send alert. Check internet connection.");
    }
  };

  const clearAlert = async () => {
    await set(ref(db, "emergencyAlert"), { active: false, message: "" });
    Alert.alert("Alert Cleared", "Emergency alert has been turned off.");
  };

  //  UPDATED - now also sends push to closed apps
  const sendAnnouncement = async () => {
    if (!announcement.trim()) {
      Alert.alert("Empty", "Please type an announcement first.");
      return;
    }
    try {
      await set(ref(db, "announcement"), {
        message: announcement,
        timestamp: new Date().toISOString(),
      });

      //  Send push to ALL users even if app is closed
      await sendPushToAllUsers(
        " New Announcement — LIFELINE",
        announcement,
        { screen: "home" },
        "lifeline_alerts"
      );

      setAnnouncement("");
      Alert.alert("Sent!", " Announcement broadcast to all users.");
    } catch (_e) {
      Alert.alert("Error", "Failed to send announcement.");
    }
  };

  const deleteSOS = async (id) => {
    await remove(ref(db, "sosRequests/" + id));
  };

  const handleCheckEarthquake = async () => {
    setCheckingQuake(true);
    try {
      const found = await checkEarthquakes();
      if (found) {
        //  Also push notify when earthquake detected
        await sendPushToAllUsers(
          " EARTHQUAKE DETECTED — LIFELINE",
          "A significant earthquake has been detected near Danao City. Take cover!",
          { screen: "home" },
          "emergency"
        );
        Alert.alert(
          " Earthquake Detected!",
          "A significant earthquake has been detected near Danao City.\n\nEmergency alert has been automatically activated for ALL users."
        );
      } else {
        Alert.alert(
          " All Clear",
          "No significant earthquakes (Magnitude 4.0+) detected near Danao City in the last 24 hours."
        );
      }
    } catch (_e) {
      Alert.alert("Error", "Could not check earthquake data. Check internet connection.");
    } finally {
      setCheckingQuake(false);
    }
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
        <Ionicons name="ban" size={55} color={COLORS.primary} style={styles.accessIcon} />
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
        <View style={styles.headerTitleRow}>
          <MaterialCommunityIcons name="shield-account" size={24} color="#fff" />
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
        </View>
        <Text style={styles.headerSub}>CTU Danao DRRMO Control Panel</Text>
      </View>

      {/* TABS */}
      <View style={[styles.tabs, { borderColor: border }]}>
        {["alerts", "sos", "announce", "quake", "users"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <View style={styles.tabInner}>
              <MaterialCommunityIcons
                name={tab === "alerts" ? "alarm-light" : tab === "sos" ? "map-marker-alert" : tab === "announce" ? "bullhorn" : tab === "quake" ? "earth" : "account-group"}
                size={15}
                color={activeTab === tab ? COLORS.primary : textLight}
              />
              <Text style={[styles.tabText, { color: textLight }, activeTab === tab && styles.activeTabText]}>
                {tab === "alerts" ? "Alerts" : tab === "sos" ? "SOS" : tab === "announce" ? "Announce" : tab === "quake" ? "Quake" : "Users"}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={[styles.content, { backgroundColor: bg }]}>

        {/* EMERGENCY ALERT TAB */}
        {activeTab === "alerts" && (
          <View>
            <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>Emergency Alert Control</Text>
            <Text style={[styles.description, { color: textMid }]}>
              Sending an alert will notify ALL users instantly — even if their app is closed.
            </Text>
            <TouchableOpacity style={styles.sosButton} onPress={sendAlert}>
              <MaterialCommunityIcons name="alarm-light" size={16} color="#fff" />
              <Text style={styles.buttonText}>SEND EMERGENCY ALERT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={clearAlert}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.buttonText}>CLEAR ALERT</Text>
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
                  <View style={styles.inlineRow}><Ionicons name="person" size={14} color={textDark} /><Text style={[styles.sosName, { color: textDark }]}>{req.name || req.email}</Text></View>
                  <View style={styles.inlineRow}><Ionicons name="location" size={14} color={textMid} /><Text style={[styles.sosText, { color: textMid }]}>{req.address || `${req.latitude?.toFixed(4)}, ${req.longitude?.toFixed(4)}`}</Text></View>
                  <View style={styles.inlineRow}><Ionicons name="time" size={14} color={textLight} /><Text style={[styles.sosTime, { color: textLight }]}>{new Date(req.timestamp).toLocaleString()}</Text></View>
                  <View style={styles.sosActions}>
                    {req.locationUrl && (
                      <TouchableOpacity style={styles.mapButton} onPress={() => Linking.openURL(req.locationUrl)}>
                        <MaterialCommunityIcons name="map" size={14} color="#fff" />
                        <Text style={styles.mapButtonText}>View Map</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.deleteButton} onPress={() => deleteSOS(req.id)}>
                      <Ionicons name="trash" size={14} color={COLORS.primary} />
                      <Text style={styles.deleteText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={48} color={COLORS.primary} />
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
              Message will be sent to ALL users — even if their app is closed.
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
              <Text style={styles.buttonText}> BROADCAST NOW</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* EARTHQUAKE TAB */}
        {activeTab === "quake" && (
          <View>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="earth" size={18} color={COLORS.primary} />
              <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>Earthquake Monitor</Text>
            </View>
            <Text style={[styles.description, { color: textMid }]}>
              Monitor real-time earthquake activity near Danao City using USGS data. If detected, all users are automatically alerted.
            </Text>
            <View style={[styles.quakeStatusCard, { backgroundColor: card, borderColor: border }]}>
              <MaterialCommunityIcons name="earth" size={40} color={COLORS.primary} style={styles.quakeStatusIcon} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.quakeStatusTitle, { color: textDark }]}>USGS Real-Time Monitoring</Text>
                <Text style={[styles.quakeStatusDesc, { color: textMid }]}>
                  Auto-checks every 15 minutes. Triggers emergency alert for Magnitude 4.0+ near Danao City.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.quakeCheckButton, checkingQuake && { opacity: 0.7 }]}
              onPress={handleCheckEarthquake}
              disabled={checkingQuake}
            >
              {checkingQuake
                ? <ActivityIndicator color="#fff" size="small" />
                : <View style={styles.buttonTextRow}>
                    <Ionicons name="search" size={16} color="#fff" />
                    <Text style={styles.buttonText}>CHECK EARTHQUAKES NOW</Text>
                  </View>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quakeViewButton}
              onPress={() => Linking.openURL("https://earthquake.usgs.gov/earthquakes/map/")}
            >
              <MaterialCommunityIcons name="map" size={16} color="#fff" />
              <Text style={styles.buttonText}>VIEW USGS EARTHQUAKE MAP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={clearAlert}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.buttonText}>CLEAR EMERGENCY ALERT</Text>
            </TouchableOpacity>
            <View style={[styles.quakeInfoBox, { backgroundColor: card, borderColor: "#4527A0" }]}>
              <View style={styles.inlineRow}>
                <Ionicons name="settings" size={16} color="#4527A0" />
                <Text style={[styles.quakeInfoTitle, { color: "#4527A0" }]}>How Automatic Detection Works</Text>
              </View>
              <Text style={[styles.quakeInfoText, { color: textMid }]}>
                • Checks USGS data every 15 minutes in the background{"\n"}
                • Triggers if Magnitude 4.0+ within 200km of Danao City{"\n"}
                • Auto-activates emergency alert for ALL users{"\n"}
                • Sends push notification with buzzer to all devices{"\n"}
                • Evacuation screen turns red for all users instantly{"\n"}
                • Admin can manually clear the alert above
              </Text>
            </View>
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
                    <View style={styles.inlineRow}><Ionicons name="mail" size={13} color={textLight} /><Text style={[styles.userEmail, { color: textLight }]}>{user.email || user.id}</Text></View>
                    {user.phone && <View style={styles.inlineRow}><Ionicons name="phone-portrait" size={13} color={textLight} /><Text style={[styles.userDetail, { color: textLight }]}>{user.phone}</Text></View>}
                    {user.barangay && <View style={styles.inlineRow}><Ionicons name="location" size={13} color={textLight} /><Text style={[styles.userDetail, { color: textLight }]}>{user.barangay}</Text></View>}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people" size={48} color={COLORS.primary} />
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
  accessIcon: { marginBottom: 20 },
  accessTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.primary, marginBottom: 12 },
  accessDesc: { textAlign: "center", fontSize: 14, lineHeight: 22 },
  header: { backgroundColor: COLORS.primary, paddingTop: 55, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, marginBottom: 10 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, marginHorizontal: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabInner: { alignItems: "center", gap: 3 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 11 },
  activeTabText: { color: COLORS.primary, fontWeight: "bold" },
  content: { padding: 20 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  description: { marginBottom: 20, fontSize: 13 },
  sosButton: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12, elevation: 3, flexDirection: "row", gap: 6 },
  clearButton: { backgroundColor: "#2e7d32", padding: 15, borderRadius: 12, alignItems: "center", justifyContent: "center", elevation: 3, marginTop: 12, flexDirection: "row", gap: 6 },
  announceButton: { backgroundColor: "#1565C0", padding: 15, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 10, elevation: 3, flexDirection: "row", gap: 6 },
  buttonTextRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  sosCard: { borderRadius: 12, padding: 15, marginBottom: 10, borderWidth: 1 },
  sosName: { fontWeight: "bold", fontSize: 14, marginBottom: 4 },
  sosText: { fontSize: 13, marginTop: 2 },
  sosTime: { fontSize: 12, marginTop: 4 },
  sosActions: { flexDirection: "row", gap: 10, marginTop: 10, justifyContent: "flex-end" },
  mapButton: { backgroundColor: "#1565C0", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 4 },
  mapButtonText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  deleteButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#ffebee", flexDirection: "row", alignItems: "center", gap: 4 },
  deleteText: { color: COLORS.primary, fontWeight: "bold", fontSize: 12 },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 14, textAlignVertical: "top", minHeight: 120, marginBottom: 10, fontSize: 14 },
  quakeStatusCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 14, marginBottom: 15, borderWidth: 1, gap: 12 },
  quakeStatusIcon: {},
  quakeStatusTitle: { fontWeight: "bold", fontSize: 14, marginBottom: 4 },
  quakeStatusDesc: { fontSize: 12, lineHeight: 18 },
  quakeCheckButton: { backgroundColor: "#4527A0", padding: 15, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12, elevation: 3 },
  quakeViewButton: { backgroundColor: "#2E7D32", padding: 15, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12, elevation: 3, flexDirection: "row", gap: 6 },
  quakeInfoBox: { borderRadius: 12, padding: 15, borderWidth: 1.5, marginTop: 5 },
  quakeInfoTitle: { fontWeight: "bold", fontSize: 14, marginBottom: 8 },
  quakeInfoText: { fontSize: 13, lineHeight: 22 },
  userCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  userAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary, justifyContent: "center", alignItems: "center", marginRight: 12 },
  userAvatarText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  userInfo: { flex: 1 },
  userName: { fontWeight: "bold", fontSize: 15 },
  userEmail: { fontSize: 12, marginTop: 3 },
  userDetail: { fontSize: 12, marginTop: 2 },
  emptyState: { alignItems: "center", marginTop: 50 },
  emptyText: { marginTop: 10, fontSize: 15 },
});

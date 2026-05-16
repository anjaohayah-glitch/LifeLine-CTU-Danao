// app/admin.js
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { onValue, ref, remove, set } from "firebase/database";
import { useEffect, useRef, useState } from "react";
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
import { checkEarthquakes } from "../hooks/useWeatherNotifications";

export default function Admin() {
  const { isAdmin, loading } = useAdmin();
  const [sosRequests, setSosRequests] = useState([]);
  const [announcement, setAnnouncement] = useState("");
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("alerts");
  const [checkingQuake, setCheckingQuake] = useState(false);
  const [sirenPlaying, setSirenPlaying] = useState(false);
  const sirenRef = useRef(null);
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

  // ── CLEANUP siren on unmount ──────────────────────────
  useEffect(() => {
    return () => {
      if (sirenRef.current) {
        sirenRef.current.unloadAsync();
      }
    };
  }, []);

  // ── PLAY SIREN ───────────────────────────────────────
  const playSiren = async () => {
    try {
      // Set audio mode to play even on silent
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });

      // Stop existing siren if playing
      if (sirenRef.current) {
        await sirenRef.current.unloadAsync();
        sirenRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        require("../assets/sounds/siren.mp3"),
        {
          shouldPlay: true,
          isLooping: true, // loops until stopped
          volume: 1.0,
        }
      );

      sirenRef.current = sound;
      setSirenPlaying(true);
    } catch (e) {
      console.log("Siren play error:", e);
    }
  };

  // ── STOP SIREN ───────────────────────────────────────
  const stopSiren = async () => {
    try {
      if (sirenRef.current) {
        await sirenRef.current.stopAsync();
        await sirenRef.current.unloadAsync();
        sirenRef.current = null;
      }
      setSirenPlaying(false);
    } catch (e) {
      console.log("Siren stop error:", e);
    }
  };

  // ── SEND EMERGENCY ALERT ─────────────────────────────
  const sendAlert = async () => {
    try {
      await set(ref(db, "emergencyAlert"), {
        active: true,
        message: "Emergency alert issued!",
        timestamp: Date.now(),
      });

      // Play siren when alert is sent
      await playSiren();

      Alert.alert(
        "Alert Sent",
        "Emergency alert is now live for ALL users!\n\nSiren is playing. Tap CLEAR ALERT to stop.",
        [{ text: "OK" }]
      );
    } catch (e) {
      Alert.alert("Error", "Failed to send alert. Check internet connection.");
    }
  };

  // ── CLEAR EMERGENCY ALERT ────────────────────────────
  const clearAlert = async () => {
    await set(ref(db, "emergencyAlert"), { active: false, message: "" });

    // Stop siren when alert is cleared
    await stopSiren();

    Alert.alert("Alert Cleared", "Emergency alert has been turned off.");
  };

  // ── SEND ANNOUNCEMENT ────────────────────────────────
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
      setAnnouncement("");
      Alert.alert("Sent!", "Announcement broadcast to all users.");
    } catch (e) {
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
        await playSiren(); // also play siren for earthquake
        Alert.alert(
          "Earthquake Detected!",
          "A significant earthquake has been detected near Danao City.\n\nEmergency alert activated for ALL users.\nSiren is playing."
        );
      } else {
        Alert.alert(
          "All Clear",
          "No significant earthquakes (Magnitude 4.0+) detected near Danao City in the last 24 hours."
        );
      }
    } catch (e) {
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

      {/* SIREN ACTIVE BANNER */}
      {sirenPlaying && (
        <View style={styles.sirenBanner}>
          <MaterialCommunityIcons name="alarm-light" size={18} color="#fff" />
          <Text style={styles.sirenBannerText}>SIREN ACTIVE — Emergency Alert On</Text>
          <TouchableOpacity style={styles.sirenStopBtn} onPress={stopSiren}>
            <Ionicons name="stop-circle" size={18} color="#fff" />
            <Text style={styles.sirenStopText}>STOP</Text>
          </TouchableOpacity>
        </View>
      )}

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
                name={
                  tab === "alerts" ? "alarm-light" :
                  tab === "sos" ? "map-marker-alert" :
                  tab === "announce" ? "bullhorn" :
                  tab === "quake" ? "earth" : "account-group"
                }
                size={15}
                color={activeTab === tab ? COLORS.primary : textLight}
              />
              <Text style={[styles.tabText, { color: textLight }, activeTab === tab && styles.activeTabText]}>
                {tab === "alerts" ? "Alerts" :
                 tab === "sos" ? "SOS" :
                 tab === "announce" ? "Announce" :
                 tab === "quake" ? "Quake" : "Users"}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={[styles.content, { backgroundColor: bg }]}>

        {/* EMERGENCY ALERT TAB */}
        {activeTab === "alerts" && (
          <View>
            <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>
              Emergency Alert Control
            </Text>
            <Text style={[styles.description, { color: textMid }]}>
              Sending an alert will notify ALL users instantly and activate the siren on this device.
            </Text>

            {/* SIREN STATUS */}
            <View style={[styles.sirenStatusCard, { backgroundColor: card, borderColor: border }]}>
              <MaterialCommunityIcons
                name="volume-high"
                size={24}
                color={sirenPlaying ? COLORS.primary : textLight}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.sirenStatusTitle, { color: textDark }]}>
                  Siren Status
                </Text>
                <Text style={[styles.sirenStatusDesc, { color: sirenPlaying ? COLORS.primary : textLight }]}>
                  {sirenPlaying ? "ACTIVE — Siren is playing" : "Inactive — No alert active"}
                </Text>
              </View>
              {sirenPlaying && (
                <TouchableOpacity style={styles.sirenStopCardBtn} onPress={stopSiren}>
                  <Ionicons name="stop-circle" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.sosButton} onPress={sendAlert}>
              <MaterialCommunityIcons name="alarm-light" size={16} color="#fff" />
              <Text style={styles.buttonText}>SEND EMERGENCY ALERT + SIREN</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearButton} onPress={clearAlert}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.buttonText}>CLEAR ALERT + STOP SIREN</Text>
            </TouchableOpacity>

            {/* MANUAL SIREN CONTROLS */}
            <Text style={[styles.sirenLabel, { color: textMid }]}>Manual Siren Control</Text>
            <View style={styles.sirenControls}>
              <TouchableOpacity
                style={[styles.sirenPlayBtn, sirenPlaying && { opacity: 0.5 }]}
                onPress={playSiren}
                disabled={sirenPlaying}
              >
                <Ionicons name="volume-high" size={16} color="#fff" />
                <Text style={styles.buttonText}>PLAY SIREN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sirenStopBtnFull, !sirenPlaying && { opacity: 0.5 }]}
                onPress={stopSiren}
                disabled={!sirenPlaying}
              >
                <Ionicons name="stop-circle" size={16} color="#fff" />
                <Text style={styles.buttonText}>STOP SIREN</Text>
              </TouchableOpacity>
            </View>
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
                  <View style={styles.inlineRow}>
                    <Ionicons name="person" size={14} color={textDark} />
                    <Text style={[styles.sosName, { color: textDark }]}>{req.name || req.email}</Text>
                  </View>
                  <View style={styles.inlineRow}>
                    <Ionicons name="location" size={14} color={textMid} />
                    <Text style={[styles.sosText, { color: textMid }]}>
                      {req.address || `${req.latitude?.toFixed(4)}, ${req.longitude?.toFixed(4)}`}
                    </Text>
                  </View>
                  <View style={styles.inlineRow}>
                    <Ionicons name="time" size={14} color={textLight} />
                    <Text style={[styles.sosTime, { color: textLight }]}>
                      {new Date(req.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.sosActions}>
                    {req.locationUrl && (
                      <TouchableOpacity
                        style={styles.mapButton}
                        onPress={() => Linking.openURL(req.locationUrl)}
                      >
                        <MaterialCommunityIcons name="map" size={14} color="#fff" />
                        <Text style={styles.mapButtonText}>View Map</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteSOS(req.id)}
                    >
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
              <MaterialCommunityIcons name="bullhorn" size={16} color="#fff" />
              <Text style={styles.buttonText}>BROADCAST NOW</Text>
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
              Monitor real-time earthquake activity near Danao City using USGS data.
            </Text>
            <View style={[styles.quakeStatusCard, { backgroundColor: card, borderColor: border }]}>
              <MaterialCommunityIcons name="earth" size={40} color={COLORS.primary} />
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
              {checkingQuake ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={styles.buttonTextRow}>
                  <Ionicons name="search" size={16} color="#fff" />
                  <Text style={styles.buttonText}>CHECK EARTHQUAKES NOW</Text>
                </View>
              )}
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
                    <View style={styles.inlineRow}>
                      <Ionicons name="mail" size={13} color={textLight} />
                      <Text style={[styles.userEmail, { color: textLight }]}>{user.email || user.id}</Text>
                    </View>
                    {user.phone && (
                      <View style={styles.inlineRow}>
                        <Ionicons name="phone-portrait" size={13} color={textLight} />
                        <Text style={[styles.userDetail, { color: textLight }]}>{user.phone}</Text>
                      </View>
                    )}
                    {user.barangay && (
                      <View style={styles.inlineRow}>
                        <Ionicons name="location" size={13} color={textLight} />
                        <Text style={[styles.userDetail, { color: textLight }]}>{user.barangay}</Text>
                      </View>
                    )}
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

  // SIREN BANNER
  sirenBanner: { backgroundColor: COLORS.primary, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  sirenBannerText: { flex: 1, color: "#fff", fontWeight: "bold", fontSize: 13 },
  sirenStopBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  sirenStopText: { color: "#fff", fontWeight: "bold", fontSize: 12 },

  // SIREN STATUS CARD
  sirenStatusCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 14, marginBottom: 15, borderWidth: 1, gap: 12 },
  sirenStatusTitle: { fontWeight: "bold", fontSize: 14, marginBottom: 2 },
  sirenStatusDesc: { fontSize: 12 },
  sirenStopCardBtn: { backgroundColor: COLORS.primary, borderRadius: 20, padding: 8 },

  // SIREN CONTROLS
  sirenLabel: { fontSize: 12, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  sirenControls: { flexDirection: "row", gap: 10 },
  sirenPlayBtn: { flex: 1, backgroundColor: "#E65100", padding: 14, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  sirenStopBtnFull: { flex: 1, backgroundColor: "#37474F", padding: 14, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },

  // TABS
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
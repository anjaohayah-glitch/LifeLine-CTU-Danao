// app/family.js
import * as Location from "expo-location";
import { onValue, push, ref, remove, set } from "firebase/database";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../constants/colors";
import { useSettings } from "../context/SettingsContext";
import { auth, db } from "../firebase";

export default function Family() {
  const [contacts, setContacts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [messages, setMessages] = useState({});
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("contacts");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [myStatus, setMyStatus] = useState(null);

  const user = auth.currentUser;
  const { theme } = useSettings();
  const { bg, card, border, textDark, textMid, textLight, surface } = theme;
  const isDark = theme.bg === "#121212";

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onValue(ref(db, `contacts/${user.uid}`), (snapshot) => {
      const data = snapshot.val();
      setContacts(data
        ? Object.entries(data).map(([id, val]) => ({ id, ...val })).filter((c) => c.status === "accepted")
        : []);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onValue(ref(db, `contactRequests/${user.uid}`), (snapshot) => {
      const data = snapshot.val();
      setPendingRequests(data
        ? Object.entries(data).map(([id, val]) => ({ id, ...val })).filter((r) => r.status === "pending")
        : []);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onValue(ref(db, "users"), (snapshot) => {
      const data = snapshot.val();
      if (data) setAllUsers(Object.entries(data).map(([id, val]) => ({ id, ...val })).filter((u) => u.id !== user?.uid));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onValue(ref(db, `safetyStatus/${user.uid}`), (snapshot) => {
      setMyStatus(snapshot.val());
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedContact) return;
    const chatId = getChatId(user.uid, selectedContact.uid);
    const unsubscribe = onValue(ref(db, `messages/${chatId}`), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({ id, ...val })).sort((a, b) => a.timestamp - b.timestamp);
        setMessages((prev) => ({ ...prev, [chatId]: list }));
      }
    });
    return () => unsubscribe();
  }, [selectedContact]);

  const getChatId = (uid1, uid2) => [uid1, uid2].sort().join("_");

  const sendContactRequest = async (userToAdd) => {
    if (!user) return;
    if (contacts.find((c) => c.uid === userToAdd.id)) {
      Alert.alert("Already Added", "This person is already in your contacts.");
      return;
    }
    try {
      await set(ref(db, `contactRequests/${userToAdd.id}/${user.uid}`), {
        uid: user.uid, name: auth.currentUser.displayName || user.email,
        email: user.email, status: "pending", sentAt: new Date().toISOString(),
      });
      await set(ref(db, `sentRequests/${user.uid}/${userToAdd.id}`), {
        uid: userToAdd.id, status: "pending", sentAt: new Date().toISOString(),
      });
      Alert.alert("Request Sent! 📨", `Request sent to ${userToAdd.fullName || "this person"}.`);
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const acceptRequest = async (request) => {
    try {
      await set(ref(db, `contacts/${user.uid}/${request.uid}`), { uid: request.uid, name: request.name, email: request.email, status: "accepted", addedAt: new Date().toISOString() });
      await set(ref(db, `contacts/${request.uid}/${user.uid}`), { uid: user.uid, name: auth.currentUser.displayName || user.email, email: user.email, status: "accepted", addedAt: new Date().toISOString() });
      await remove(ref(db, `contactRequests/${user.uid}/${request.uid}`));
      await remove(ref(db, `sentRequests/${request.uid}/${user.uid}`));
      Alert.alert("Contact Added! ✅", `${request.name} is now your contact.`);
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const declineRequest = async (request) => {
    await remove(ref(db, `contactRequests/${user.uid}/${request.uid}`));
    await remove(ref(db, `sentRequests/${request.uid}/${user.uid}`));
  };

  const removeContact = (contactId, name) => {
    Alert.alert("Remove Contact", `Remove ${name} from your contacts?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        await remove(ref(db, `contacts/${user.uid}/${contactId}`));
        await remove(ref(db, `contacts/${contactId}/${user.uid}`));
      }},
    ]);
  };

  const sendSafe = async () => {
    if (!user) return;
    try {
      setLoading(true);
      await set(ref(db, `safetyStatus/${user.uid}`), { status: "safe", message: "I am safe! 🟢", timestamp: Date.now(), name: auth.currentUser.displayName || user.email });
      for (const contact of contacts) {
        await push(ref(db, `messages/${getChatId(user.uid, contact.uid)}`), { senderId: user.uid, senderName: auth.currentUser.displayName || user.email, text: "🟢 I am safe! No need to worry.", timestamp: Date.now(), type: "safe" });
      }
      Alert.alert("✅ Sent!", "Your contacts have been notified that you are safe.");
    } catch (e) { Alert.alert("Error", e.message); }
    finally { setLoading(false); }
  };

  const sendHelp = async () => {
    Alert.alert("🆘 Send Help Alert", "This will alert ALL your contacts that you need help and share your live location. Continue?", [
      { text: "Cancel", style: "cancel" },
      { text: "Send Alert", style: "destructive", onPress: async () => {
        try {
          setLoading(true);
          let locationText = "Location unavailable";
          let locationUrl = "";
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === "granted") {
              const location = await Location.getCurrentPositionAsync({});
              const { latitude, longitude } = location.coords;
              const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
              if (geocode.length > 0) {
                const g = geocode[0];
                locationText = [g.street, g.district, g.city, g.region].filter(Boolean).join(", ");
              }
              locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
            }
          } catch (e) {}
          await set(ref(db, `safetyStatus/${user.uid}`), { status: "help", message: "I need help! 🔴", timestamp: Date.now(), name: auth.currentUser.displayName || user.email, location: locationText });
          for (const contact of contacts) {
            await push(ref(db, `messages/${getChatId(user.uid, contact.uid)}`), { senderId: user.uid, senderName: auth.currentUser.displayName || user.email, text: `🔴 I NEED HELP! Please check on me immediately.\n\n📍 My Location:\n${locationText}\n\n🗺 Tap here to navigate:\n${locationUrl}`, timestamp: Date.now(), type: "help" });
          }
          Alert.alert("🆘 Alert Sent!", "All your contacts have been notified with your live location.");
        } catch (e) { Alert.alert("Error", e.message); }
        finally { setLoading(false); }
      }},
    ]);
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedContact) return;
    try {
      await push(ref(db, `messages/${getChatId(user.uid, selectedContact.uid)}`), { senderId: user.uid, senderName: auth.currentUser.displayName || user.email, text: messageText.trim(), timestamp: Date.now(), type: "message" });
      setMessageText("");
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const filteredUsers = allUsers.filter((u) =>
    (u.fullName || u.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderChat = () => {
    if (!selectedContact) return null;
    const chatId = getChatId(user.uid, selectedContact.uid);
    const chatMessages = messages[chatId] || [];

    return (
      <Modal visible={modalVisible} animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={Platform.OS === "ios" ? "padding" : "height"}>

          {/* CHAT HEADER */}
          <View style={[styles.chatHeader, { backgroundColor: COLORS.primary }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.chatBackBtn}>
              <Text style={styles.chatBack}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.chatHeaderCenter}>
              <View style={styles.chatAvatar}>
                <Text style={styles.chatAvatarText}>{(selectedContact.name || "?")[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.chatName}>{selectedContact.name}</Text>
            </View>
            <View style={{ width: 60 }} />
          </View>

          <FlatList
            data={chatMessages}
            keyExtractor={(item) => item.id}
            style={[styles.chatList, { backgroundColor: bg }]}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const isMe = item.senderId === user.uid;
              const isSafe = item.type === "safe";
              const isHelp = item.type === "help";
              const hasUrl = /https?:\/\/[^\s]+/.test(item.text);
              return (
                <TouchableOpacity
                  activeOpacity={hasUrl ? 0.7 : 1}
                  onPress={() => {
                    const urlMatch = item.text.match(/https?:\/\/[^\s]+/);
                    if (urlMatch) Linking.openURL(urlMatch[0]);
                  }}
                >
                  <View style={[
                    styles.messageBubble,
                    isMe ? styles.myBubble : [styles.theirBubble, { backgroundColor: card, borderColor: border }],
                    isSafe && styles.safeBubble,
                    isHelp && styles.helpBubble,
                  ]}>
                    <Text style={[styles.messageText, { color: textDark }, isMe && { color: "#fff" }, (isSafe || isHelp) && { color: "#fff" }]}>
                      {item.text}
                    </Text>
                    {isHelp && hasUrl && (
                      <View style={styles.tapHint}>
                        <Text style={styles.tapHintText}>🗺 Tap to open in Google Maps</Text>
                      </View>
                    )}
                    <Text style={[styles.messageTime, { color: textLight }, (isMe || isSafe || isHelp) && { color: "rgba(255,255,255,0.65)" }]}>
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          <View style={[styles.chatInputRow, { backgroundColor: card, borderColor: border }]}>
            <TextInput
              style={[styles.chatInput, { backgroundColor: surface, borderColor: border, color: textDark }]}
              placeholder="Type a message..."
              placeholderTextColor={textLight}
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Text style={styles.sendText}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: bg }]}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👨‍👩‍👧 Family & Peers</Text>
        <Text style={styles.headerSub}>Stay connected during emergencies</Text>
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNum}>{contacts.length}</Text>
            <Text style={styles.headerStatLabel}>Contacts</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNum}>{pendingRequests.length}</Text>
            <Text style={styles.headerStatLabel}>Requests</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNum}>{myStatus ? (myStatus.status === "safe" ? "🟢" : "🔴") : "—"}</Text>
            <Text style={styles.headerStatLabel}>My Status</Text>
          </View>
        </View>
      </View>

      {/* STATUS BUTTONS */}
      <View style={styles.statusRow}>
        <TouchableOpacity
          style={[styles.statusButton, { backgroundColor: "#2e7d32" }, loading && { opacity: 0.6 }]}
          onPress={sendSafe} disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.statusText}>🟢 I Am Safe</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statusButton, { backgroundColor: "#B00020" }, loading && { opacity: 0.6 }]}
          onPress={sendHelp} disabled={loading}
        >
          <Text style={styles.statusText}>🔴 Need Help</Text>
        </TouchableOpacity>
      </View>

      {/* MY STATUS CARD */}
      {myStatus && (
        <View style={[styles.myStatusCard, {
          backgroundColor: myStatus.status === "safe"
            ? (isDark ? "#1a3a1a" : "#E8F5E9")
            : (isDark ? "#2a1010" : "#FFEBEE"),
          borderColor: myStatus.status === "safe"
            ? (isDark ? "#2e5a2e" : "#A5D6A7")
            : (isDark ? "#5a2020" : "#FFCDD2"),
        }]}>
          <Text style={styles.myStatusIcon}>{myStatus.status === "safe" ? "🟢" : "🔴"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.myStatusText, { color: textDark }]}>
              {myStatus.status === "safe" ? "You marked yourself as safe" : "You sent a help alert"}
            </Text>
            <Text style={[styles.myStatusTime, { color: textLight }]}>
              {new Date(myStatus.timestamp).toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      {/* TABS */}
      <View style={[styles.tabs, { borderColor: border }]}>
        {[
          { key: "contacts", label: `👥 Contacts (${contacts.length})` },
          { key: "requests", label: `📨 Requests (${pendingRequests.length})` },
          { key: "search", label: "🔍 Find" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, { color: textLight }, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CONTACTS TAB */}
      {activeTab === "contacts" && (
        <ScrollView style={[styles.content, { backgroundColor: bg }]} showsVerticalScrollIndicator={false}>
          {contacts.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={[styles.emptyTitle, { color: textDark }]}>No contacts yet</Text>
              <Text style={[styles.emptyDesc, { color: textLight }]}>Search for family or peers to add them.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => setActiveTab("search")}>
                <Text style={styles.emptyButtonText}>🔍 Find People</Text>
              </TouchableOpacity>
            </View>
          ) : contacts.map((contact) => (
            <View key={contact.id} style={[styles.contactCard, { backgroundColor: card, borderColor: border }]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(contact.name || "?")[0].toUpperCase()}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: textDark }]}>{contact.name}</Text>
                <Text style={[styles.contactEmail, { color: textLight }]}>{contact.email}</Text>
                {contact.barangay && (
                  <Text style={styles.contactAddress}>📍 {contact.barangay}</Text>
                )}
              </View>
              <View style={styles.contactActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: isDark ? "#1a2a3a" : "#E3F2FD" }]}
                  onPress={() => { setSelectedContact(contact); setModalVisible(true); }}
                >
                  <Text style={styles.actionBtnText}>💬</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: isDark ? "#2a1a1a" : "#FFEBEE" }]}
                  onPress={() => removeContact(contact.id, contact.name)}
                >
                  <Text style={styles.actionBtnText}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={{ height: 60 }} />
        </ScrollView>
      )}

      {/* REQUESTS TAB */}
      {activeTab === "requests" && (
        <ScrollView style={[styles.content, { backgroundColor: bg }]} showsVerticalScrollIndicator={false}>
          {pendingRequests.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📨</Text>
              <Text style={[styles.emptyTitle, { color: textDark }]}>No pending requests</Text>
              <Text style={[styles.emptyDesc, { color: textLight }]}>Contact requests will appear here.</Text>
            </View>
          ) : pendingRequests.map((request) => (
            <View key={request.id} style={[styles.requestCard, {
              backgroundColor: isDark ? "#2a2000" : "#FFF8E1",
              borderColor: isDark ? "#5a4a00" : "#FFE082",
            }]}>
              <View style={[styles.avatar, { backgroundColor: "#E65100" }]}>
                <Text style={styles.avatarText}>{(request.name || "?")[0].toUpperCase()}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: textDark }]}>{request.name}</Text>
                <Text style={[styles.contactEmail, { color: textLight }]}>Wants to add you as a contact</Text>
              </View>
              <View style={styles.contactActions}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#2e7d32" }]} onPress={() => acceptRequest(request)}>
                  <Text style={[styles.actionBtnText, { color: "#fff" }]}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#B00020" }]} onPress={() => declineRequest(request)}>
                  <Text style={[styles.actionBtnText, { color: "#fff" }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={{ height: 60 }} />
        </ScrollView>
      )}

      {/* SEARCH TAB */}
      {activeTab === "search" && (
        <View style={[styles.content, { backgroundColor: bg, flex: 1 }]}>
          <View style={[styles.searchBar, { backgroundColor: surface, borderColor: border }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: textDark }]}
              placeholder="Search by name..."
              placeholderTextColor={textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {filteredUsers.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={[styles.emptyTitle, { color: textDark }]}>No users found</Text>
                <Text style={[styles.emptyDesc, { color: textLight }]}>Try a different name or email.</Text>
              </View>
            ) : filteredUsers.map((u) => {
              const isAccepted = contacts.find((c) => c.uid === u.id);
              return (
                <View key={u.id} style={[styles.contactCard, { backgroundColor: card, borderColor: border }]}>
                  <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
                    <Text style={styles.avatarText}>{(u.fullName || "?")[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={[styles.contactName, { color: textDark }]}>{u.fullName || "Unknown"}</Text>
                    <Text style={[styles.contactEmail, { color: textLight }]}>LIFELINE User</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.addButton, isAccepted && { backgroundColor: "#2e7d32" }]}
                    onPress={() => !isAccepted && sendContactRequest(u)}
                  >
                    <Text style={styles.addButtonText}>{isAccepted ? "✓ Added" : "+ Add"}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      )}

      {renderChat()}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },

  // HEADER
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 55, paddingBottom: 24, paddingHorizontal: 24,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  headerStats: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16, padding: 12, marginTop: 16,
  },
  headerStat: { flex: 1, alignItems: "center" },
  headerStatNum: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  headerStatLabel: { color: "rgba(255,255,255,0.7)", fontSize: 10, marginTop: 2 },
  headerStatDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.2)" },

  // STATUS BUTTONS
  statusRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginTop: 16, marginBottom: 10 },
  statusButton: { flex: 1, padding: 14, borderRadius: 14, alignItems: "center", elevation: 2, shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  statusText: { color: "#fff", fontWeight: "bold", fontSize: 14 },

  // MY STATUS
  myStatusCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 20, borderRadius: 14,
    padding: 12, marginBottom: 10, borderWidth: 1, gap: 10,
  },
  myStatusIcon: { fontSize: 22 },
  myStatusText: { fontWeight: "600", fontSize: 13 },
  myStatusTime: { fontSize: 11, marginTop: 2 },

  // TABS
  tabs: { flexDirection: "row", borderBottomWidth: 1, marginHorizontal: 20, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  activeTab: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 11, fontWeight: "600" },
  activeTabText: { color: COLORS.primary, fontWeight: "bold" },

  // CONTENT
  content: { flex: 1, paddingHorizontal: 20 },

  // EMPTY
  empty: { alignItems: "center", marginTop: 50 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontWeight: "bold", fontSize: 17, marginTop: 12 },
  emptyDesc: { marginTop: 6, textAlign: "center", fontSize: 13 },
  emptyButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, marginTop: 20 },
  emptyButtonText: { color: "#fff", fontWeight: "bold", fontSize: 14 },

  // CONTACT CARD
  contactCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1,
    elevation: 1, shadowColor: "#000", shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 }, shadowRadius: 3,
  },
  requestCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  avatarText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  contactInfo: { flex: 1 },
  contactName: { fontWeight: "bold", fontSize: 14 },
  contactEmail: { fontSize: 12, marginTop: 2 },
  contactAddress: { color: "#2e7d32", fontSize: 11, marginTop: 2 },
  contactActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  actionBtnText: { fontSize: 16 },

  // ADD BUTTON
  addButton: { backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: "#fff", fontWeight: "bold", fontSize: 12 },

  // SEARCH
  searchBar: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14 },

  // CHAT MODAL
  chatHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 55, paddingBottom: 14, paddingHorizontal: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  chatBackBtn: { width: 60 },
  chatBack: { color: "rgba(255,255,255,0.85)", fontSize: 15, fontWeight: "600" },
  chatHeaderCenter: { alignItems: "center", flexDirection: "row", gap: 10 },
  chatAvatar: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center", alignItems: "center",
  },
  chatAvatarText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  chatName: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  chatList: { flex: 1 },
  messageBubble: { maxWidth: "75%", borderRadius: 16, padding: 12, marginBottom: 8 },
  myBubble: { backgroundColor: COLORS.primary, alignSelf: "flex-end", borderBottomRightRadius: 4 },
  theirBubble: { alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1 },
  safeBubble: { backgroundColor: "#2e7d32", alignSelf: "flex-start" },
  helpBubble: { backgroundColor: "#B00020", alignSelf: "flex-start" },
  messageText: { fontSize: 14, lineHeight: 20 },
  tapHint: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8, padding: 6, marginTop: 8, alignItems: "center" },
  tapHintText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  messageTime: { fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  chatInputRow: { flexDirection: "row", padding: 12, borderTopWidth: 1, alignItems: "flex-end" },
  chatInput: { flex: 1, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendButton: { backgroundColor: COLORS.primary, width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", marginLeft: 10 },
  sendText: { color: "#fff", fontSize: 18 },
});
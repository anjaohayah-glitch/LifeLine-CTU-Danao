// app/family.js
import * as Location from "expo-location";
import { onValue, push, ref, remove, set } from "firebase/database";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
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

  useEffect(() => {
    if (!user) return;
    const contactsRef = ref(db, `contacts/${user.uid}`);
    const unsubscribe = onValue(contactsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .filter((c) => c.status === "accepted");
        setContacts(list);
      } else {
        setContacts([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const reqRef = ref(db, `contactRequests/${user.uid}`);
    const unsubscribe = onValue(reqRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .filter((r) => r.status === "pending");
        setPendingRequests(list);
      } else {
        setPendingRequests([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const usersRef = ref(db, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .filter((u) => u.id !== user?.uid);
        setAllUsers(list);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const statusRef = ref(db, `safetyStatus/${user.uid}`);
    const unsubscribe = onValue(statusRef, (snapshot) => {
      setMyStatus(snapshot.val());
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedContact) return;
    const chatId = getChatId(user.uid, selectedContact.uid);
    const msgRef = ref(db, `messages/${chatId}`);
    const unsubscribe = onValue(msgRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a, b) => a.timestamp - b.timestamp);
        setMessages((prev) => ({ ...prev, [chatId]: list }));
      }
    });
    return () => unsubscribe();
  }, [selectedContact]);

  const getChatId = (uid1, uid2) => [uid1, uid2].sort().join("_");

  const sendContactRequest = async (userToAdd) => {
    if (!user) return;
    const alreadyContact = contacts.find((c) => c.uid === userToAdd.id);
    if (alreadyContact) {
      Alert.alert("Already Added", "This person is already in your contacts.");
      return;
    }
    try {
      await set(ref(db, `contactRequests/${userToAdd.id}/${user.uid}`), {
        uid: user.uid,
        name: auth.currentUser.displayName || user.email,
        email: user.email,
        status: "pending",
        sentAt: new Date().toISOString(),
      });
      await set(ref(db, `sentRequests/${user.uid}/${userToAdd.id}`), {
        uid: userToAdd.id,
        status: "pending",
        sentAt: new Date().toISOString(),
      });
      Alert.alert("Request Sent! 📨", `A contact request has been sent to ${userToAdd.fullName || "this person"}.`);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const acceptRequest = async (request) => {
    try {
      await set(ref(db, `contacts/${user.uid}/${request.uid}`), {
        uid: request.uid,
        name: request.name,
        email: request.email,
        status: "accepted",
        addedAt: new Date().toISOString(),
      });
      await set(ref(db, `contacts/${request.uid}/${user.uid}`), {
        uid: user.uid,
        name: auth.currentUser.displayName || user.email,
        email: user.email,
        status: "accepted",
        addedAt: new Date().toISOString(),
      });
      await remove(ref(db, `contactRequests/${user.uid}/${request.uid}`));
      await remove(ref(db, `sentRequests/${request.uid}/${user.uid}`));
      Alert.alert("Contact Added! ✅", `${request.name} is now your contact.`);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const declineRequest = async (request) => {
    await remove(ref(db, `contactRequests/${user.uid}/${request.uid}`));
    await remove(ref(db, `sentRequests/${request.uid}/${user.uid}`));
  };

  const removeContact = (contactId, name) => {
    Alert.alert("Remove Contact", `Remove ${name} from your contacts?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          await remove(ref(db, `contacts/${user.uid}/${contactId}`));
          await remove(ref(db, `contacts/${contactId}/${user.uid}`));
        },
      },
    ]);
  };

  const sendSafe = async () => {
    if (!user) return;
    try {
      setLoading(true);
      await set(ref(db, `safetyStatus/${user.uid}`), {
        status: "safe",
        message: "I am safe! 🟢",
        timestamp: Date.now(),
        name: auth.currentUser.displayName || user.email,
      });
      for (const contact of contacts) {
        await push(ref(db, `messages/${getChatId(user.uid, contact.uid)}`), {
          senderId: user.uid,
          senderName: auth.currentUser.displayName || user.email,
          text: "🟢 I am safe! No need to worry.",
          timestamp: Date.now(),
          type: "safe",
        });
      }
      Alert.alert("✅ Sent!", "Your contacts have been notified that you are safe.");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendHelp = async () => {
    Alert.alert(
      "🆘 Send Help Alert",
      "This will alert ALL your contacts that you need help and share your live location. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Alert", style: "destructive",
          onPress: async () => {
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
                    locationText = [g.street, g.district, g.city, g.region]
                      .filter(Boolean).join(", ");
                  }
                  locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
                }
              } catch (e) {}

              await set(ref(db, `safetyStatus/${user.uid}`), {
                status: "help",
                message: "I need help! 🔴",
                timestamp: Date.now(),
                name: auth.currentUser.displayName || user.email,
                location: locationText,
              });

              for (const contact of contacts) {
                await push(ref(db, `messages/${getChatId(user.uid, contact.uid)}`), {
                  senderId: user.uid,
                  senderName: auth.currentUser.displayName || user.email,
                  text: `🔴 I NEED HELP! Please check on me immediately.\n\n📍 My Location:\n${locationText}\n\n🗺 Live Location: ${locationUrl}`,
                  timestamp: Date.now(),
                  type: "help",
                });
              }
              Alert.alert("🆘 Alert Sent!", "All your contacts have been notified with your live location.");
            } catch (error) {
              Alert.alert("Error", error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedContact) return;
    try {
      const chatId = getChatId(user.uid, selectedContact.uid);
      await push(ref(db, `messages/${chatId}`), {
        senderId: user.uid,
        senderName: auth.currentUser.displayName || user.email,
        text: messageText.trim(),
        timestamp: Date.now(),
        type: "message",
      });
      setMessageText("");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
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
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.chatBack}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.chatName}>{selectedContact.name}</Text>
            <View style={{ width: 50 }} />
          </View>

          <FlatList
            data={chatMessages}
            keyExtractor={(item) => item.id}
            style={styles.chatList}
            contentContainerStyle={{ padding: 15 }}
            renderItem={({ item }) => {
              const isMe = item.senderId === user.uid;
              const isSafe = item.type === "safe";
              const isHelp = item.type === "help";
              return (
                <View style={[
                  styles.messageBubble,
                  isMe ? styles.myBubble : styles.theirBubble,
                  isSafe && styles.safeBubble,
                  isHelp && styles.helpBubble,
                ]}>
                  <Text style={[
                    styles.messageText,
                    isMe && { color: "#fff" },
                    (isSafe || isHelp) && { color: "#fff" },
                  ]}>
                    {item.text}
                  </Text>
                  <Text style={[
                    styles.messageTime,
                    (isMe || isSafe || isHelp) && { color: "rgba(255,255,255,0.7)" },
                  ]}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              );
            }}
          />

          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Type a message..."
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
    <View style={styles.wrapper}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👨‍👩‍👧 Family & Peers</Text>
        <Text style={styles.headerSub}>Stay connected during emergencies</Text>
        {pendingRequests.length > 0 && (
          <View style={styles.requestBadge}>
            <Text style={styles.requestBadgeText}>
              📨 {pendingRequests.length} pending request{pendingRequests.length > 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </View>

      {/* STATUS BUTTONS */}
      <View style={styles.statusRow}>
        <TouchableOpacity
          style={[styles.statusButton, { backgroundColor: "#2e7d32" }, loading && { opacity: 0.7 }]}
          onPress={sendSafe} disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.statusText}>🟢 I Am Safe</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statusButton, { backgroundColor: COLORS.primary }, loading && { opacity: 0.7 }]}
          onPress={sendHelp} disabled={loading}
        >
          <Text style={styles.statusText}>🔴 I Need Help</Text>
        </TouchableOpacity>
      </View>

      {/* MY STATUS */}
      {myStatus && (
        <View style={[styles.myStatusCard, { backgroundColor: myStatus.status === "safe" ? "#e8f5e9" : "#ffebee" }]}>
          <Text style={styles.myStatusText}>
            Your status: {myStatus.status === "safe" ? "🟢 Safe" : "🔴 Needs Help"}
          </Text>
          <Text style={styles.myStatusTime}>
            {new Date(myStatus.timestamp).toLocaleString()}
          </Text>
        </View>
      )}

      {/* TABS */}
      <View style={styles.tabs}>
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
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CONTACTS TAB */}
      {activeTab === "contacts" && (
        <ScrollView style={styles.content}>
          {contacts.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No contacts yet</Text>
              <Text style={styles.emptyDesc}>Search for family or peers to add them.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => setActiveTab("search")}>
                <Text style={styles.emptyButtonText}>🔍 Find People</Text>
              </TouchableOpacity>
            </View>
          ) : (
            contacts.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>
                    {(contact.name || "?")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactEmail}>{contact.email}</Text>
                  {/* Show address only if contact made it public */}
                  {contact.addressPublic !== false && contact.barangay && (
                    <Text style={styles.contactAddress}>📍 {contact.barangay}</Text>
                  )}
                </View>
                <View style={styles.contactActions}>
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => { setSelectedContact(contact); setModalVisible(true); }}
                  >
                    <Text style={styles.chatButtonText}>💬</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeContact(contact.id, contact.name)}
                  >
                    <Text style={styles.removeButtonText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* REQUESTS TAB */}
      {activeTab === "requests" && (
        <ScrollView style={styles.content}>
          {pendingRequests.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📨</Text>
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptyDesc}>Contact requests will appear here.</Text>
            </View>
          ) : (
            pendingRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>
                    {(request.name || "?")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{request.name}</Text>
                  <Text style={styles.requestTime}>
                    Wants to add you as a contact
                  </Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => acceptRequest(request)}
                  >
                    <Text style={styles.acceptText}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => declineRequest(request)}
                  >
                    <Text style={styles.declineText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* SEARCH TAB - only show name, nothing else */}
      {activeTab === "search" && (
        <View style={styles.content}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <ScrollView>
            {filteredUsers.length === 0 ? (
              <Text style={styles.noResults}>No users found</Text>
            ) : (
              filteredUsers.map((u) => {
                const isAccepted = contacts.find((c) => c.uid === u.id);
                return (
                  <View key={u.id} style={styles.contactCard}>
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarText}>
                        {(u.fullName || "?")[0].toUpperCase()}
                      </Text>
                    </View>
                    {/* Only show name — no email, no address */}
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{u.fullName || "Unknown"}</Text>
                      <Text style={styles.contactMeta}>LIFELINE User</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.addButton, isAccepted && styles.addedButton]}
                      onPress={() => !isAccepted && sendContactRequest(u)}
                    >
                      <Text style={styles.addButtonText}>
                        {isAccepted ? "✓ Added" : "➕ Add"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}

      {renderChat()}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff" },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 55, paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 15,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 },
  requestBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10, paddingHorizontal: 10,
    paddingVertical: 4, marginTop: 8, alignSelf: "flex-start",
  },
  requestBadgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  statusRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 12 },
  statusButton: {
    flex: 1, padding: 14, borderRadius: 12,
    alignItems: "center", elevation: 3,
  },
  statusText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  myStatusCard: {
    marginHorizontal: 20, borderRadius: 12,
    padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: "#eee",
  },
  myStatusText: { fontWeight: "bold", fontSize: 14 },
  myStatusTime: { color: COLORS.textLight, fontSize: 11, marginTop: 3 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1, borderColor: COLORS.border,
    marginHorizontal: 20,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  activeTab: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 11, color: COLORS.textLight },
  activeTabText: { color: COLORS.primary, fontWeight: "bold" },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 15 },
  empty: { alignItems: "center", marginTop: 50 },
  emptyIcon: { fontSize: 50 },
  emptyTitle: { fontWeight: "bold", fontSize: 18, marginTop: 10, color: COLORS.textDark },
  emptyDesc: { color: COLORS.textLight, marginTop: 5, textAlign: "center" },
  emptyButton: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    padding: 14, marginTop: 20, paddingHorizontal: 30,
  },
  emptyButtonText: { color: "#fff", fontWeight: "bold" },
  contactCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  requestCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFF8E1", borderRadius: 12,
    padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: "#FFE082",
  },
  contactAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  contactAvatarText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  contactInfo: { flex: 1 },
  contactName: { fontWeight: "bold", fontSize: 14, color: COLORS.textDark },
  contactEmail: { color: COLORS.textLight, fontSize: 12, marginTop: 2 },
  contactAddress: { color: "#2e7d32", fontSize: 11, marginTop: 2 },
  contactMeta: { color: COLORS.textLight, fontSize: 11, marginTop: 2 },
  requestTime: { color: COLORS.textLight, fontSize: 12, marginTop: 2 },
  contactActions: { flexDirection: "row", gap: 8 },
  requestActions: { flexDirection: "row", gap: 8 },
  chatButton: {
    backgroundColor: COLORS.info, width: 36, height: 36,
    borderRadius: 10, justifyContent: "center", alignItems: "center",
  },
  chatButtonText: { fontSize: 16 },
  removeButton: {
    backgroundColor: "#ffebee", width: 36, height: 36,
    borderRadius: 10, justifyContent: "center", alignItems: "center",
  },
  removeButtonText: { fontSize: 16 },
  acceptButton: {
    backgroundColor: "#2e7d32", width: 36, height: 36,
    borderRadius: 10, justifyContent: "center", alignItems: "center",
  },
  acceptText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  declineButton: {
    backgroundColor: COLORS.primary, width: 36, height: 36,
    borderRadius: 10, justifyContent: "center", alignItems: "center",
  },
  declineText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  addButton: {
    backgroundColor: COLORS.primary, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  addedButton: { backgroundColor: "#2e7d32" },
  addButtonText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  searchBar: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, marginBottom: 15,
    backgroundColor: COLORS.surface,
  },
  searchIcon: { fontSize: 18, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textDark },
  noResults: { textAlign: "center", color: COLORS.textLight, marginTop: 30 },
  chatHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary,
    paddingTop: 55, paddingBottom: 15, paddingHorizontal: 20,
  },
  chatBack: { color: "rgba(255,255,255,0.85)", fontSize: 16 },
  chatName: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  chatList: { flex: 1, backgroundColor: "#f9f9f9" },
  messageBubble: {
    maxWidth: "75%", borderRadius: 16,
    padding: 12, marginBottom: 8,
  },
  myBubble: {
    backgroundColor: COLORS.primary, alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: "#fff", alignSelf: "flex-start",
    borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border,
  },
  safeBubble: { backgroundColor: "#2e7d32", alignSelf: "flex-start" },
  helpBubble: { backgroundColor: COLORS.primary, alignSelf: "flex-start" },
  messageText: { fontSize: 14, color: COLORS.textDark, lineHeight: 20 },
  messageTime: { fontSize: 10, color: COLORS.textLight, marginTop: 4, alignSelf: "flex-end" },
  chatInputRow: {
    flexDirection: "row", padding: 12,
    borderTopWidth: 1, borderColor: COLORS.border,
    backgroundColor: "#fff", alignItems: "flex-end",
  },
  chatInput: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 10, fontSize: 14,
    backgroundColor: COLORS.surface, maxHeight: 100,
  },
  sendButton: {
    backgroundColor: COLORS.primary, width: 44, height: 44,
    borderRadius: 22, justifyContent: "center",
    alignItems: "center", marginLeft: 10,
  },
  sendText: { color: "#fff", fontSize: 18 },
});
// app/family.js
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
  const [activeTab, setActiveTab] = useState("contacts");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [myStatus, setMyStatus] = useState(null);

  const user = auth.currentUser;

  // 🔥 Load my contacts
  useEffect(() => {
    if (!user) return;
    const contactsRef = ref(db, `contacts/${user.uid}`);
    const unsubscribe = onValue(contactsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        setContacts(list);
      } else {
        setContacts([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // 🔥 Load all users for search
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

  // 🔥 Load my safety status
  useEffect(() => {
    if (!user) return;
    const statusRef = ref(db, `safetyStatus/${user.uid}`);
    const unsubscribe = onValue(statusRef, (snapshot) => {
      setMyStatus(snapshot.val());
    });
    return () => unsubscribe();
  }, []);

  // 🔥 Load messages with selected contact
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

  const getChatId = (uid1, uid2) =>
    [uid1, uid2].sort().join("_");

  // ➕ Add contact
  const addContact = async (userToAdd) => {
    if (!user) return;
    const alreadyAdded = contacts.find((c) => c.uid === userToAdd.id);
    if (alreadyAdded) {
      Alert.alert("Already Added", "This person is already in your contacts.");
      return;
    }
    try {
      await set(ref(db, `contacts/${user.uid}/${userToAdd.id}`), {
        uid: userToAdd.id,
        name: userToAdd.fullName || userToAdd.email,
        email: userToAdd.email,
        addedAt: new Date().toISOString(),
      });
      Alert.alert("Added! ✅", `${userToAdd.fullName || userToAdd.email} added to your contacts.`);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  // 🗑 Remove contact
  const removeContact = (contactId, name) => {
    Alert.alert("Remove Contact", `Remove ${name} from your contacts?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await remove(ref(db, `contacts/${user.uid}/${contactId}`));
        },
      },
    ]);
  };

  // ✅ Send I am Safe
  const sendSafe = async () => {
    if (!user) return;
    try {
      setLoading(true);
      await set(ref(db, `safetyStatus/${user.uid}`), {
        status: "safe",
        message: "I am safe! 🟢",
        timestamp: Date.now(),
        name: user.email,
      });

      // Notify all contacts
      for (const contact of contacts) {
        await push(ref(db, `messages/${getChatId(user.uid, contact.uid)}`), {
          senderId: user.uid,
          senderName: user.email,
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

  // 🆘 Send I Need Help
  const sendHelp = async () => {
    Alert.alert(
      "🆘 Send Help Alert",
      "This will alert ALL your contacts that you need help. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Alert",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await set(ref(db, `safetyStatus/${user.uid}`), {
                status: "help",
                message: "I need help! 🔴",
                timestamp: Date.now(),
                name: user.email,
              });

              for (const contact of contacts) {
                await push(ref(db, `messages/${getChatId(user.uid, contact.uid)}`), {
                  senderId: user.uid,
                  senderName: user.email,
                  text: "🔴 I NEED HELP! Please check on me immediately.",
                  timestamp: Date.now(),
                  type: "help",
                });
              }
              Alert.alert("🆘 Alert Sent!", "All your contacts have been notified.");
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

  // 💬 Send message
  const sendMessage = async () => {
    if (!messageText.trim() || !selectedContact) return;
    try {
      const chatId = getChatId(user.uid, selectedContact.uid);
      await push(ref(db, `messages/${chatId}`), {
        senderId: user.uid,
        senderName: user.email,
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
    (u.fullName || u.email || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  // CHAT MODAL
  const renderChat = () => {
    if (!selectedContact) return null;
    const chatId = getChatId(user.uid, selectedContact.uid);
    const chatMessages = messages[chatId] || [];

    return (
      <Modal visible={modalVisible} animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
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
                    isMe && { color: "rgba(255,255,255,0.7)" },
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
      </View>

      {/* STATUS BUTTONS */}
      <View style={styles.statusRow}>
        <TouchableOpacity
          style={[styles.statusButton, { backgroundColor: "#2e7d32" }, loading && { opacity: 0.7 }]}
          onPress={sendSafe}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.statusText}>🟢 I Am Safe</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statusButton, { backgroundColor: COLORS.primary }, loading && { opacity: 0.7 }]}
          onPress={sendHelp}
          disabled={loading}
        >
          <Text style={styles.statusText}>🔴 I Need Help</Text>
        </TouchableOpacity>
      </View>

      {/* MY STATUS */}
      {myStatus && (
        <View style={[
          styles.myStatusCard,
          { backgroundColor: myStatus.status === "safe" ? "#e8f5e9" : "#ffebee" }
        ]}>
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
        {["contacts", "search"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === "contacts" ? `👥 My Contacts (${contacts.length})` : "🔍 Find People"}
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
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setActiveTab("search")}
              >
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
                </View>
                <View style={styles.contactActions}>
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => {
                      setSelectedContact(contact);
                      setModalVisible(true);
                    }}
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

      {/* SEARCH TAB */}
      {activeTab === "search" && (
        <View style={styles.content}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <ScrollView>
            {filteredUsers.length === 0 ? (
              <Text style={styles.noResults}>No users found</Text>
            ) : (
              filteredUsers.map((u) => {
                const isAdded = contacts.find((c) => c.uid === u.id);
                return (
                  <View key={u.id} style={styles.contactCard}>
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarText}>
                        {(u.fullName || u.email || "?")[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{u.fullName || "Unknown"}</Text>
                      <Text style={styles.contactEmail}>{u.email}</Text>
                      {u.barangay && (
                        <Text style={styles.contactBarangay}>📍 {u.barangay}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.addButton, isAdded && styles.addedButton]}
                      onPress={() => !isAdded && addContact(u)}
                    >
                      <Text style={styles.addButtonText}>
                        {isAdded ? "✓ Added" : "+ Add"}
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
  statusRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 12 },
  statusButton: {
    flex: 1, padding: 14, borderRadius: 12,
    alignItems: "center", elevation: 3,
    shadowColor: "#000", shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 4,
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
  tabText: { fontSize: 13, color: COLORS.textLight },
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
  contactAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: "center", alignItems: "center",
    marginRight: 12,
  },
  contactAvatarText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  contactInfo: { flex: 1 },
  contactName: { fontWeight: "bold", fontSize: 14, color: COLORS.textDark },
  contactEmail: { color: COLORS.textLight, fontSize: 12, marginTop: 2 },
  contactBarangay: { color: COLORS.textLight, fontSize: 11, marginTop: 2 },
  contactActions: { flexDirection: "row", gap: 8 },
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
    paddingTop: 55, paddingBottom: 15,
    paddingHorizontal: 20,
  },
  chatBack: { color: "rgba(255,255,255,0.85)", fontSize: 16 },
  chatName: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  chatList: { flex: 1, backgroundColor: "#f9f9f9" },
  messageBubble: {
    maxWidth: "75%", borderRadius: 16,
    padding: 12, marginBottom: 8,
  },
  myBubble: {
    backgroundColor: COLORS.primary,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: "#fff", alignSelf: "flex-start",
    borderBottomLeftRadius: 4, borderWidth: 1,
    borderColor: COLORS.border,
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
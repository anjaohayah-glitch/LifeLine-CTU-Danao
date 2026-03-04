// app/assistant.js
import * as Speech from "expo-speech";
import { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { COLORS } from "../constants/colors";

const GEMINI_API_KEY = "AIzaSyDTUObpY-yz_Xhw4udrWTfdNMN_Pm71qK0";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are ARIA (Automated Response and Information Assistant), a disaster preparedness AI assistant for LIFELINE — the official disaster preparedness app of CTU Danao Campus in Danao City, Cebu, Philippines.

Your role is to:
- Answer questions about disaster preparedness, response, and recovery
- Give clear, concise evacuation instructions
- Provide first aid guidance
- Share DRRM (Disaster Risk Reduction and Management) information
- Help users during emergencies
- Answer questions about CTU Danao Campus safe zones and evacuation centers

CTU Danao Campus is located at Sabang, Danao City, Cebu (10.50339, 124.02917).
Campus DRRMO Hotline: 0917-723-6262
National Emergency: 911
Red Cross: 143

Keep responses SHORT, CLEAR, and HELPFUL — max 3-4 sentences.
If someone is in immediate danger, always tell them to call 911 first.
You can respond in English, Cebuano, or Filipino depending on what language the user uses.`;

const SUGGESTIONS = [
  "What to do in earthquake?",
  "How to do CPR?",
  "Nearest evacuation center?",
  "Typhoon signal 3 meaning?",
  "What is a go bag?",
  "DRRMO hotline number?",
];

export default function Assistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! I'm ARIA 🤖, your disaster preparedness assistant powered by AI.\n\nAsk me anything about disasters, first aid, or evacuation!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef(null);

  const handleSend = useCallback(async (text) => {
    const message = text || input;
    if (!message.trim()) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setIsThinking(true);

    try {
      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
       body: JSON.stringify({
  contents: [
    {
      role: "user",
      parts: [{ text: SYSTEM_PROMPT + "\n\nUser question: " + message }],
    },
  ],
  generationConfig: {
    maxOutputTokens: 200,
    temperature: 0.7,
  },
}),
      });

      const data = await response.json();
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't get a response. Please try again.";

      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);

      // 🔊 Speak the response
      setIsSpeaking(true);
      Speech.speak(reply, {
        language: "en-US",
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Sorry, I'm having trouble connecting. Please check your internet connection.",
        },
      ]);
    } finally {
      setIsThinking(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input]);

  const stopSpeaking = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

  const clearChat = () => {
    Speech.stop();
    setIsSpeaking(false);
    setMessages([
      {
        role: "assistant",
        text: "Hi! I'm ARIA 🤖, your disaster preparedness assistant powered by AI.\n\nAsk me anything about disasters, first aid, or evacuation!",
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>🤖 ARIA</Text>
          <Text style={styles.headerSub}>AI Disaster Preparedness Assistant</Text>
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* ARIA STATUS */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, {
          backgroundColor: isThinking ? "#FB8C00" : isSpeaking ? "#2e7d32" : "#4caf50"
        }]} />
        <Text style={styles.statusText}>
          {isThinking ? "ARIA is thinking..." : isSpeaking ? "ARIA is speaking..." : "ARIA is ready"}
        </Text>
        {isSpeaking && (
          <TouchableOpacity style={styles.stopSpeakButton} onPress={stopSpeaking}>
            <Text style={styles.stopSpeakText}>⏹ Stop</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* CHAT MESSAGES */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, index) => (
          <View
            key={index}
            style={[
              styles.messageBubble,
              msg.role === "user" ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            {msg.role === "assistant" && (
              <View style={styles.messageHeader}>
                <Text style={styles.messageAvatar}>🤖</Text>
                <Text style={styles.messageRole}>ARIA</Text>
              </View>
            )}
            <Text style={[
              styles.messageText,
              msg.role === "user" && { color: "#fff" },
            ]}>
              {msg.text}
            </Text>
          </View>
        ))}

        {isThinking && (
          <View style={styles.assistantBubble}>
            <View style={styles.messageHeader}>
              <Text style={styles.messageAvatar}>🤖</Text>
              <Text style={styles.messageRole}>ARIA</Text>
            </View>
            <View style={styles.thinkingDots}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.thinkingText}>Thinking...</Text>
            </View>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* SUGGESTIONS */}
      {messages.length <= 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionsScroll}
          contentContainerStyle={styles.suggestionsContent}
        >
          {SUGGESTIONS.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={styles.suggestion}
              onPress={() => handleSend(s)}
            >
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* INPUT */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask ARIA anything..."
          placeholderTextColor={COLORS.textLight}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={300}
          onSubmitEditing={() => handleSend()}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || isThinking) && styles.sendDisabled]}
          onPress={() => handleSend()}
          disabled={!input.trim() || isThinking}
        >
          {isThinking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendIcon}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {},
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 4 },
  clearButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20,
  },
  clearText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  statusBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: COLORS.border,
    gap: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { flex: 1, color: COLORS.textMid, fontSize: 13 },
  stopSpeakButton: {
    backgroundColor: "#ffebee",
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 15, borderWidth: 1, borderColor: "#ffcdd2",
  },
  stopSpeakText: { color: "#e53935", fontSize: 12, fontWeight: "bold" },
  chatContainer: { flex: 1, padding: 15 },
  messageBubble: {
    maxWidth: "80%", padding: 12,
    borderRadius: 16, marginBottom: 12,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: COLORS.surface,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  messageHeader: {
    flexDirection: "row", alignItems: "center",
    gap: 5, marginBottom: 6,
  },
  messageAvatar: { fontSize: 14 },
  messageRole: { fontSize: 11, color: COLORS.textLight, fontWeight: "bold" },
  messageText: { fontSize: 14, color: COLORS.textDark, lineHeight: 21 },
  thinkingDots: { flexDirection: "row", alignItems: "center", gap: 8 },
  thinkingText: { color: COLORS.textLight, fontSize: 13 },
  suggestionsScroll: { maxHeight: 50, marginBottom: 8 },
  suggestionsContent: { paddingHorizontal: 15, gap: 8, alignItems: "center" },
  suggestion: {
    backgroundColor: "#EDE7F6",
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: "#B39DDB",
  },
  suggestionText: { color: "#4527A0", fontSize: 12, fontWeight: "bold" },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    padding: 12, borderTopWidth: 1,
    borderColor: COLORS.border, gap: 10,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1, backgroundColor: COLORS.surface,
    borderRadius: 25, paddingHorizontal: 18,
    paddingVertical: 10, fontSize: 14,
    color: COLORS.textDark, borderWidth: 1.5,
    borderColor: COLORS.border, maxHeight: 100,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 46, height: 46, borderRadius: 23,
    justifyContent: "center", alignItems: "center",
    elevation: 3,
  },
  sendDisabled: { backgroundColor: "#ccc" },
  sendIcon: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
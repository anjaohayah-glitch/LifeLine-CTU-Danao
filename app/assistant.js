// app/assistant.js
import * as Speech from "expo-speech";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
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

export default function Assistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! I'm ARIA, your disaster preparedness assistant. Ask me anything about disasters, first aid, or evacuation! 🚑",
    },
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");

  // 🎙 Speech recognition events
  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[0]?.transcript || "";
    setTranscript(text);
    if (event.isFinal && text) {
      handleUserMessage(text);
    }
  });
  useSpeechRecognitionEvent("error", () => {
    setIsListening(false);
    setTranscript("");
  });

  const startListening = async () => {
    try {
      Speech.stop();
      setIsSpeaking(false);
      setTranscript("");

      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) return;

      await ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        maxAlternatives: 1,
      });
    } catch (error) {
      console.log("Speech recognition error:", error);
    }
  };

  const stopListening = () => {
    ExpoSpeechRecognitionModule.stop();
  };

  const handleUserMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    const userMessage = { role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setIsThinking(true);
    setTranscript("");

    try {
      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.7,
          },
        }),
      });

      const data = await response.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't get a response. Please try again.";

      const assistantMessage = { role: "assistant", text: reply };
      setMessages((prev) => [...prev, assistantMessage]);

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
        { role: "assistant", text: "Sorry, I'm having trouble connecting. Please check your internet connection." },
      ]);
    } finally {
      setIsThinking(false);
    }
  }, []);

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
        text: "Hi! I'm ARIA, your disaster preparedness assistant. Ask me anything about disasters, first aid, or evacuation! 🚑",
      },
    ]);
  };

  return (
    <View style={styles.wrapper}>

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

      {/* ARIA AVATAR */}
      <View style={styles.avatarContainer}>
        <View style={[
          styles.avatar,
          isListening && styles.avatarListening,
          isThinking && styles.avatarThinking,
          isSpeaking && styles.avatarSpeaking,
        ]}>
          <Text style={styles.avatarEmoji}>
            {isListening ? "🎙" : isThinking ? "💭" : isSpeaking ? "🔊" : "🤖"}
          </Text>
        </View>
        <Text style={styles.avatarStatus}>
          {isListening ? "Listening..." :
           isThinking ? "Thinking..." :
           isSpeaking ? "Speaking..." : "Tap mic to speak"}
        </Text>
        {transcript ? (
          <Text style={styles.transcriptText}>"{transcript}"</Text>
        ) : null}
      </View>

      {/* CHAT MESSAGES */}
      <ScrollView
        style={styles.chatContainer}
        showsVerticalScrollIndicator={false}
        ref={(ref) => ref?.scrollToEnd({ animated: true })}
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
              <Text style={styles.messageRole}>🤖 ARIA</Text>
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
            <Text style={styles.messageRole}>🤖 ARIA</Text>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* SUGGESTED QUESTIONS */}
      {messages.length <= 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionsContainer}
          contentContainerStyle={styles.suggestionsContent}
        >
          {[
            "What to do in earthquake?",
            "How to do CPR?",
            "Nearest evacuation center?",
            "Typhoon signal 3 meaning?",
            "What is a go bag?",
            "DRRMO hotline?",
          ].map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestion}
              onPress={() => handleUserMessage(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* MIC BUTTON */}
      <View style={styles.controls}>
        {isSpeaking && (
          <TouchableOpacity style={styles.stopButton} onPress={stopSpeaking}>
            <Text style={styles.stopText}>⏹ Stop</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.micButton,
            isListening && styles.micButtonActive,
            isThinking && styles.micButtonDisabled,
          ]}
          onPress={isListening ? stopListening : startListening}
          disabled={isThinking}
        >
          <Text style={styles.micIcon}>{isListening ? "⏹" : "🎙"}</Text>
          <Text style={styles.micText}>
            {isListening ? "Tap to Stop" : "Tap to Speak"}
          </Text>
        </TouchableOpacity>
      </View>

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
  avatarContainer: {
    alignItems: "center", paddingVertical: 20,
    borderBottomWidth: 1, borderColor: COLORS.border,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.surface,
    justifyContent: "center", alignItems: "center",
    borderWidth: 3, borderColor: COLORS.border,
    marginBottom: 8,
  },
  avatarListening: {
    borderColor: "#e53935", borderWidth: 3,
    backgroundColor: "#ffebee",
  },
  avatarThinking: {
    borderColor: "#FB8C00", borderWidth: 3,
    backgroundColor: "#FFF3E0",
  },
  avatarSpeaking: {
    borderColor: "#2e7d32", borderWidth: 3,
    backgroundColor: "#e8f5e9",
  },
  avatarEmoji: { fontSize: 40 },
  avatarStatus: { color: COLORS.textMid, fontSize: 13 },
  transcriptText: {
    color: COLORS.primary, fontStyle: "italic",
    fontSize: 13, marginTop: 5, paddingHorizontal: 20,
    textAlign: "center",
  },
  chatContainer: { flex: 1, padding: 15 },
  messageBubble: {
    maxWidth: "80%", padding: 12,
    borderRadius: 16, marginBottom: 10,
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
  messageRole: {
    fontSize: 11, color: COLORS.textLight,
    marginBottom: 4, fontWeight: "bold",
  },
  messageText: { fontSize: 14, color: COLORS.textDark, lineHeight: 20 },
  suggestionsContainer: { maxHeight: 50, marginBottom: 10 },
  suggestionsContent: { paddingHorizontal: 15, gap: 8 },
  suggestion: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  suggestionText: { color: COLORS.primary, fontSize: 12, fontWeight: "bold" },
  controls: {
    padding: 20, alignItems: "center", gap: 10,
    borderTopWidth: 1, borderColor: COLORS.border,
  },
  stopButton: {
    backgroundColor: "#ffebee",
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: "#ffcdd2",
  },
  stopText: { color: "#e53935", fontWeight: "bold" },
  micButton: {
    backgroundColor: COLORS.primary,
    width: 120, height: 120, borderRadius: 60,
    justifyContent: "center", alignItems: "center",
    elevation: 6, shadowColor: COLORS.primary,
    shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  micButtonActive: {
    backgroundColor: "#e53935",
    shadowColor: "#e53935",
  },
  micButtonDisabled: {
    backgroundColor: "#ccc",
    shadowColor: "#ccc",
  },
  micIcon: { fontSize: 40 },
  micText: { color: "#fff", fontSize: 11, fontWeight: "bold", marginTop: 4 },
});
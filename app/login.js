// app/login.js
import { useRouter } from "expo-router";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../constants/colors";
import { auth } from "../firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotModal, setForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/home");
    } catch (error) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }
    try {
      setResetLoading(true);
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setForgotModal(false);
      setResetEmail("");
      Alert.alert(
        "Email Sent! 📧",
        `A password reset link has been sent to:\n\n${resetEmail}\n\nPlease check your inbox or spam folder.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      let message = "Something went wrong. Please try again.";
      if (error.code === "auth/user-not-found") {
        message = "No account found with this email address.";
      } else if (error.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      }
      Alert.alert("Error", message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.topSection}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>🚑</Text>
        </View>
        <Text style={styles.logoText}>LIFELINE</Text>
        <Text style={styles.logoSub}>CTU Danao Disaster Preparedness</Text>
      </View>

      <View style={styles.bottomSection}>
        <Text style={styles.welcomeText}>Welcome Back 👋</Text>
        <Text style={styles.welcomeSub}>Sign in to your account</Text>

        {/* EMAIL */}
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIcon}>✉️</Text>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={COLORS.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* PASSWORD */}
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIcon}>🔒</Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={COLORS.textLight}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.showText}>{showPassword ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
        </View>

        {/* FORGOT PASSWORD */}
        <TouchableOpacity
          style={styles.forgotRow}
          onPress={() => {
            setResetEmail(email);
            setForgotModal(true);
          }}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* LOGIN BUTTON */}
        <TouchableOpacity
          style={[styles.loginButton, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginText}>LOGIN</Text>
          )}
        </TouchableOpacity>

        {/* REGISTER LINK */}
        <TouchableOpacity
          style={styles.registerRow}
          onPress={() => router.push("/register")}
        >
          <Text style={styles.registerText}>Don't have an account? </Text>
          <Text style={styles.registerLink}>Sign Up</Text>
        </TouchableOpacity>
      </View>

      {/* 🔑 FORGOT PASSWORD MODAL */}
      <Modal
        visible={forgotModal}
        transparent
        animationType="slide"
        onRequestClose={() => setForgotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalIcon}>🔑</Text>
              <Text style={styles.modalTitle}>Forgot Password?</Text>
              <Text style={styles.modalSub}>
                Enter your email and we'll send you a reset link.
              </Text>
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textLight}
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity
              style={[styles.sendButton, resetLoading && { opacity: 0.7 }]}
              onPress={handleForgotPassword}
              disabled={resetLoading}
            >
              {resetLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendText}>📧 Send Reset Link</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => { setForgotModal(false); setResetEmail(""); }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: COLORS.primary },
  topSection: {
    flex: 0.45, alignItems: "center",
    justifyContent: "center", overflow: "hidden",
  },
  circle1: {
    position: "absolute", width: 300, height: 300,
    borderRadius: 150, backgroundColor: "rgba(255,255,255,0.07)",
    top: -80, right: -80,
  },
  circle2: {
    position: "absolute", width: 200, height: 200,
    borderRadius: 100, backgroundColor: "rgba(255,255,255,0.07)",
    bottom: -40, left: -40,
  },
  logoBox: {
    width: 90, height: 90, borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
    marginBottom: 12, borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoEmoji: { fontSize: 45 },
  logoText: { fontSize: 34, fontWeight: "bold", color: "#fff", letterSpacing: 5 },
  logoSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 6 },
  bottomSection: {
    flex: 0.55, backgroundColor: "#fff",
    borderTopLeftRadius: 35, borderTopRightRadius: 35,
    padding: 30, paddingTop: 35,
    elevation: 20, shadowColor: "#000",
    shadowOpacity: 0.15, shadowOffset: { width: 0, height: -5 },
    shadowRadius: 10,
  },
  welcomeText: { fontSize: 24, fontWeight: "bold", color: COLORS.textDark, marginBottom: 4 },
  welcomeSub: { color: COLORS.textLight, marginBottom: 25 },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, marginBottom: 15,
    backgroundColor: COLORS.surface,
  },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: COLORS.textDark },
  showText: { color: COLORS.primary, fontWeight: "bold", fontSize: 13 },
  forgotRow: { alignItems: "flex-end", marginTop: -8, marginBottom: 15 },
  forgotText: { color: COLORS.primary, fontWeight: "bold", fontSize: 13 },
  loginButton: {
    backgroundColor: COLORS.primary, padding: 16,
    borderRadius: 12, alignItems: "center", marginTop: 5,
    elevation: 4, shadowColor: COLORS.primary,
    shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  loginText: { color: "#fff", fontWeight: "bold", fontSize: 16, letterSpacing: 1 },
  registerRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  registerText: { color: COLORS.textLight },
  registerLink: { color: COLORS.primary, fontWeight: "bold" },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 30, paddingBottom: 40,
  },
  modalHeader: { alignItems: "center", marginBottom: 25 },
  modalIcon: { fontSize: 45, marginBottom: 12 },
  modalTitle: { fontSize: 22, fontWeight: "bold", color: COLORS.textDark, marginBottom: 8 },
  modalSub: { color: COLORS.textMid, textAlign: "center", fontSize: 14, lineHeight: 20 },
  sendButton: {
    backgroundColor: COLORS.primary, padding: 16,
    borderRadius: 12, alignItems: "center", marginTop: 5, elevation: 4,
  },
  sendText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  cancelButton: {
    padding: 14, borderRadius: 12, alignItems: "center",
    marginTop: 10, borderWidth: 1.5, borderColor: COLORS.border,
  },
  cancelText: { color: COLORS.textMid, fontWeight: "bold", fontSize: 15 },
});
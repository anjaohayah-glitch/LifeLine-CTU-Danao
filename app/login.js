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
  ScrollView,
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
      Alert.alert("Email Sent! 📧", `A password reset link has been sent to:\n\n${resetEmail}\n\nPlease check your inbox or spam folder.`, [{ text: "OK" }]);
    } catch (error) {
      let message = "Something went wrong. Please try again.";
      if (error.code === "auth/user-not-found") message = "No account found with this email address.";
      else if (error.code === "auth/invalid-email") message = "Please enter a valid email address.";
      Alert.alert("Error", message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.wrapper} behavior={Platform.OS === "ios" ? "padding" : "height"}>

      {/* ── TOP HERO ─────────────────────────────────── */}
      <View style={styles.topSection}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />

        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>🚑</Text>
        </View>
        <Text style={styles.logoText}>LIFELINE</Text>
        <Text style={styles.logoSub}>CTU Danao Disaster Preparedness</Text>

        <View style={styles.pillsRow}>
          {["🆘 SOS", "🗺 Evacuate", "📚 Guides"].map((pill, i) => (
            <View key={i} style={styles.pill}>
              <Text style={styles.pillText}>{pill}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── BOTTOM CARD ──────────────────────────────── */}
      <ScrollView
        style={styles.bottomSection}
        contentContainerStyle={styles.bottomContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.welcomeText}>Welcome Back 👋</Text>
        <Text style={styles.welcomeSub}>Sign in to stay connected and stay safe</Text>

        {/* EMAIL */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <View style={[styles.inputWrapper, email.length > 0 && styles.inputWrapperActive]}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#B0BEC5"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {email.length > 0 && (
              <TouchableOpacity onPress={() => setEmail("")}>
                <Text style={styles.clearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* PASSWORD */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Password</Text>
          <View style={[styles.inputWrapper, password.length > 0 && styles.inputWrapperActive]}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#B0BEC5"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.showText}>{showPassword ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FORGOT */}
        <TouchableOpacity
          style={styles.forgotRow}
          onPress={() => { setResetEmail(email); setForgotModal(true); }}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* LOGIN BUTTON */}
        <TouchableOpacity
          style={[styles.loginButton, loading && { opacity: 0.8 }]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.loginButtonInner}>
              <Text style={styles.loginButtonText}>SIGN IN</Text>
              <Text style={styles.loginButtonArrow}>→</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* DIVIDER */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* REGISTER */}
        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push("/register")}
          activeOpacity={0.85}
        >
          <Text style={styles.registerButtonText}>Create New Account</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>🔒 Your data is secure and encrypted</Text>
        </View>
      </ScrollView>

      {/* ── FORGOT PASSWORD MODAL ────────────────────── */}
      <Modal visible={forgotModal} transparent animationType="slide" onRequestClose={() => setForgotModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <Text style={styles.modalIcon}>🔑</Text>
              </View>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <Text style={styles.modalSub}>
                Enter your registered email and we'll send you a reset link instantly.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#B0BEC5"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, resetLoading && { opacity: 0.7 }]}
              onPress={handleForgotPassword}
              disabled={resetLoading}
            >
              {resetLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.loginButtonInner}>
                  <Text style={styles.loginButtonText}>SEND RESET LINK</Text>
                  <Text style={styles.loginButtonArrow}>📧</Text>
                </View>
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

  // TOP
  topSection: { flex: 0.45, alignItems: "center", justifyContent: "center", overflow: "hidden", paddingHorizontal: 20 },
  circle1: { position: "absolute", width: 350, height: 350, borderRadius: 175, backgroundColor: "rgba(255,255,255,0.06)", top: -120, right: -100 },
  circle2: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.06)", bottom: -60, left: -60 },
  circle3: { position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.06)", top: 20, left: 20 },
  logoBox: { width: 88, height: 88, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", marginBottom: 14, borderWidth: 2, borderColor: "rgba(255,255,255,0.25)", elevation: 8 },
  logoEmoji: { fontSize: 44 },
  logoText: { fontSize: 34, fontWeight: "bold", color: "#fff", letterSpacing: 6, marginBottom: 4 },
  logoSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginBottom: 20 },
  pillsRow: { flexDirection: "row", gap: 8 },
  pill: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  pillText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  // BOTTOM
  bottomSection: { flex: 0.55, backgroundColor: "#fff", borderTopLeftRadius: 36, borderTopRightRadius: 36 },
  bottomContent: { paddingHorizontal: 28, paddingTop: 30, paddingBottom: 40 },
  welcomeText: { fontSize: 24, fontWeight: "bold", color: "#1A1A2E", marginBottom: 4 },
  welcomeSub: { color: "#90A4AE", fontSize: 13, marginBottom: 24 },

  // INPUTS
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#546E7A", marginBottom: 6, letterSpacing: 0.5 },
  inputWrapper: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#ECEFF1", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: "#F8FAFB" },
  inputWrapperActive: { borderColor: COLORS.primary, backgroundColor: "#FFF5F5" },
  inputIcon: { fontSize: 17, marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: "#1A1A2E" },
  showText: { color: COLORS.primary, fontWeight: "bold", fontSize: 13 },
  clearText: { color: "#90A4AE", fontSize: 15, fontWeight: "bold" },

  // FORGOT
  forgotRow: { alignItems: "flex-end", marginBottom: 20, marginTop: -6 },
  forgotText: { color: COLORS.primary, fontWeight: "bold", fontSize: 13 },

  // LOGIN BUTTON
  loginButton: { backgroundColor: COLORS.primary, borderRadius: 16, padding: 16, alignItems: "center", marginBottom: 16, elevation: 6, shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12 },
  loginButtonInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  loginButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16, letterSpacing: 1.5 },
  loginButtonArrow: { color: "#fff", fontSize: 18 },

  // DIVIDER
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#ECEFF1" },
  dividerText: { color: "#90A4AE", fontSize: 13 },

  // REGISTER
  registerButton: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 16, padding: 15, alignItems: "center", marginBottom: 20 },
  registerButtonText: { color: COLORS.primary, fontWeight: "bold", fontSize: 15 },

  // FOOTER
  footer: { alignItems: "center" },
  footerText: { color: "#B0BEC5", fontSize: 11 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 28, paddingBottom: 44 },
  modalHandle: { width: 40, height: 4, backgroundColor: "#ECEFF1", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalHeader: { alignItems: "center", marginBottom: 24 },
  modalIconBox: { width: 70, height: 70, borderRadius: 20, backgroundColor: "#FFF5F5", justifyContent: "center", alignItems: "center", marginBottom: 12, borderWidth: 1.5, borderColor: "#FFCDD2" },
  modalIcon: { fontSize: 34 },
  modalTitle: { fontSize: 22, fontWeight: "bold", color: "#1A1A2E", marginBottom: 8 },
  modalSub: { color: "#90A4AE", textAlign: "center", fontSize: 13, lineHeight: 20 },
  cancelButton: { padding: 14, borderRadius: 14, alignItems: "center", marginTop: 10, borderWidth: 1.5, borderColor: "#ECEFF1" },
  cancelText: { color: "#90A4AE", fontWeight: "bold", fontSize: 15 },
});
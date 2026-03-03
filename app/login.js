// app/login.js
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.topSection}>
        {/* DECORATIVE CIRCLES */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        {/* LOGO */}
        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>🚑</Text>
        </View>
        <Text style={styles.logoText}>LIFELINE</Text>
        <Text style={styles.logoSub}>CTU Danao Disaster Preparedness</Text>
      </View>

      <View style={styles.bottomSection}>
        <Text style={styles.welcomeText}>Welcome </Text>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: COLORS.primary },
  topSection: {
    flex: 0.45,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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
  logoText: {
    fontSize: 34, fontWeight: "bold",
    color: "#fff", letterSpacing: 5,
  },
  logoSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13, marginTop: 6,
  },
  bottomSection: {
    flex: 0.55,
    backgroundColor: "#fff",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 30,
    paddingTop: 35,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -5 },
    shadowRadius: 10,
  },
  welcomeText: {
    fontSize: 24, fontWeight: "bold",
    color: COLORS.textDark, marginBottom: 4,
  },
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
  loginButton: {
    backgroundColor: COLORS.primary,
    padding: 16, borderRadius: 12,
    alignItems: "center", marginTop: 5,
    elevation: 4, shadowColor: COLORS.primary,
    shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  loginText: { color: "#fff", fontWeight: "bold", fontSize: 16, letterSpacing: 1 },
  registerRow: {
    flexDirection: "row", justifyContent: "center", marginTop: 20,
  },
  registerText: { color: COLORS.textLight },
  registerLink: { color: COLORS.primary, fontWeight: "bold" },
});
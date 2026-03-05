// app/register.js
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
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
import { auth, db } from "../firebase";

const InputField = ({ icon, placeholder, value, onChangeText, keyboardType, secureTextEntry, editable = true, rightElement }) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.inputIcon}>{icon}</Text>
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textLight}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType || "default"}
      secureTextEntry={secureTextEntry}
      editable={editable}
      autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
    />
    {rightElement}
  </View>
);

export default function Register() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [barangay, setBarangay] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyNumber, setEmergencyNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [termsModal, setTermsModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const validateStep1 = () => {
    if (!fullName.trim()) return "Please enter your full name.";
    if (!email.trim()) return "Please enter your email.";
    if (!password.trim()) return "Please enter a password.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  };

  const validateStep2 = () => {
    if (!phone.trim()) return "Please enter your phone number.";
    if (!barangay.trim()) return "Please enter your barangay/address.";
    return null;
  };

  const handleNext = () => {
    const error = validateStep1();
    if (error) { Alert.alert("Missing Info", error); return; }
    setStep(2);
  };

  const handleRegister = async () => {
    const error = validateStep2();
    if (error) { Alert.alert("Missing Info", error); return; }
    if (!agreedToTerms) {
      setTermsModal(true);
      return;
    }
    await doRegister();
  };

  const doRegister = async () => {
    try {
      setLoading(true);
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;
      await set(ref(db, "users/" + uid), {
        fullName,
        email,
        phone,
        barangay,
        addressPublic: true,
        emergencyName,
        emergencyNumber,
        createdAt: new Date().toISOString(),
      });
      Alert.alert(
        "Account Created! 🎉",
        "Welcome to LIFELINE! You can now log in.",
        [{ text: "Login", onPress: () => router.replace("/login") }]
      );
    } catch (error) {
      Alert.alert("Registration Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* TOP SECTION */}
      <View style={styles.topSection}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>🚑</Text>
        </View>
        <Text style={styles.logoText}>LIFELINE</Text>
        <Text style={styles.logoSub}>Create your account</Text>
      </View>

      {/* BOTTOM SECTION */}
      <View style={styles.bottomSection}>

        {/* STEP INDICATOR */}
        <View style={styles.stepIndicator}>
          <View style={styles.stepRow}>
            <View style={[styles.stepCircle, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.stepCircleText}>1</Text>
            </View>
            <View style={[styles.stepLine, { backgroundColor: step === 2 ? COLORS.primary : COLORS.border }]} />
            <View style={[styles.stepCircle, { backgroundColor: step === 2 ? COLORS.primary : COLORS.border }]}>
              <Text style={styles.stepCircleText}>2</Text>
            </View>
          </View>
          <View style={styles.stepLabels}>
            <Text style={[styles.stepLabel, { color: COLORS.primary }]}>Account</Text>
            <Text style={[styles.stepLabel, { color: step === 2 ? COLORS.primary : COLORS.textLight }]}>Details</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {step === 1 ? (
            <>
              <Text style={styles.sectionTitle}>Account Information</Text>
              <InputField icon="👤" placeholder="Full Name" value={fullName} onChangeText={setFullName} />
              <InputField icon="✉️" placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" />
              <InputField
                icon="🔒" placeholder="Password (min 6 characters)"
                value={password} onChangeText={setPassword}
                secureTextEntry={!showPassword}
                rightElement={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Text style={styles.showText}>{showPassword ? "Hide" : "Show"}</Text>
                  </TouchableOpacity>
                }
              />
              <InputField
                icon="🔒" placeholder="Confirm Password"
                value={confirmPassword} onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                rightElement={
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                    <Text style={styles.showText}>{showConfirm ? "Hide" : "Show"}</Text>
                  </TouchableOpacity>
                }
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                <Text style={styles.primaryButtonText}>Next →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Personal Details</Text>
              <InputField icon="📱" placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <InputField icon="📍" placeholder="Barangay / Address" value={barangay} onChangeText={setBarangay} />

              <Text style={styles.sectionTitle}>🆘 Emergency Contact</Text>
              <Text style={styles.sectionSub}>Who should we contact in case of emergency?</Text>
              <InputField icon="👥" placeholder="Contact Name" value={emergencyName} onChangeText={setEmergencyName} />
              <InputField icon="📞" placeholder="Contact Number" value={emergencyNumber} onChangeText={setEmergencyNumber} keyboardType="phone-pad" />

              {/* TERMS CHECKBOX */}
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setTermsModal(true)}
              >
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                  {agreedToTerms && <Text style={styles.checkboxCheck}>✓</Text>}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{" "}
                  <Text style={styles.termsLink}>Terms & Conditions</Text>
                  {" "}and{" "}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.backButton]}
                  onPress={() => setStep(1)}
                >
                  <Text style={styles.primaryButtonText}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, { flex: 1 }, loading && { opacity: 0.7 }]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Create Account 🎉</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity style={styles.loginRow} onPress={() => router.replace("/login")}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* TERMS MODAL */}
      <Modal visible={termsModal} transparent animationType="slide" onRequestClose={() => setTermsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>📋 Terms & Conditions</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalHeading}>Data Collection & Privacy</Text>
              <Text style={styles.modalText}>
                By creating an account, you agree that LIFELINE may collect and share your personal information (including your name, status, and live location) <Text style={{ fontWeight: "bold" }}>with your approved family and friends during emergencies only.</Text>
              </Text>

              <Text style={styles.modalHeading}>Location Sharing</Text>
              <Text style={styles.modalText}>
                Location data will only be shared when you press "I Need Help". We do not track your location continuously or share it without your consent.
              </Text>

              <Text style={styles.modalHeading}>Contact Requests</Text>
              <Text style={styles.modalText}>
                You must accept a contact request before someone can see your safety status or send you messages. You can remove contacts at any time.
              </Text>

              <Text style={styles.modalHeading}>Address Privacy</Text>
              <Text style={styles.modalText}>
                Your address is only visible to your approved contacts by default. You can set your address to private in your profile settings at any time.
              </Text>

              <Text style={styles.modalHeading}>Emergency Alerts</Text>
              <Text style={styles.modalText}>
                LIFELINE may send you emergency alerts and announcements from CTU Danao DRRMO. You can disable notifications in Settings.
              </Text>

              <Text style={styles.modalHeading}>Disclaimer</Text>
              <Text style={styles.modalText}>
                LIFELINE is a disaster preparedness tool. Always follow official government advisories and contact emergency services (911) in life-threatening situations.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.agreeButton}
              onPress={() => {
                setAgreedToTerms(true);
                setTermsModal(false);
              }}
            >
              <Text style={styles.agreeButtonText}>✅ I Agree & Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => setTermsModal(false)}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
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
    flex: 0.35, alignItems: "center",
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
    width: 70, height: 70, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
    marginBottom: 10, borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoEmoji: { fontSize: 35 },
  logoText: { fontSize: 28, fontWeight: "bold", color: "#fff", letterSpacing: 5 },
  logoSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 },
  bottomSection: {
    flex: 0.65, backgroundColor: "#fff",
    borderTopLeftRadius: 35, borderTopRightRadius: 35,
    padding: 25, paddingTop: 25,
  },
  stepIndicator: { alignItems: "center", marginBottom: 20 },
  stepRow: { flexDirection: "row", alignItems: "center" },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: "center", alignItems: "center",
  },
  stepCircleText: { color: "#fff", fontWeight: "bold" },
  stepLine: { width: 80, height: 3, marginHorizontal: 8 },
  stepLabels: {
    flexDirection: "row", justifyContent: "space-between",
    width: 130, marginTop: 6,
  },
  stepLabel: { fontSize: 12, fontWeight: "bold" },
  sectionTitle: {
    fontSize: 16, fontWeight: "bold",
    color: COLORS.textDark, marginBottom: 4, marginTop: 8,
  },
  sectionSub: { color: COLORS.textLight, fontSize: 12, marginBottom: 12 },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, marginBottom: 12,
    backgroundColor: COLORS.surface,
  },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: COLORS.textDark },
  showText: { color: COLORS.primary, fontWeight: "bold", fontSize: 12 },
  termsRow: {
    flexDirection: "row", alignItems: "center",
    marginBottom: 15, marginTop: 5, gap: 10,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: COLORS.primary,
    justifyContent: "center", alignItems: "center",
  },
  checkboxChecked: { backgroundColor: COLORS.primary },
  checkboxCheck: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  termsText: { flex: 1, fontSize: 12, color: COLORS.textMid, lineHeight: 18 },
  termsLink: { color: COLORS.primary, fontWeight: "bold" },
  primaryButton: {
    backgroundColor: COLORS.primary, padding: 15,
    borderRadius: 12, alignItems: "center", marginTop: 8,
    elevation: 4, shadowColor: COLORS.primary,
    shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  primaryButtonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  backButton: { backgroundColor: COLORS.textLight, width: 90 },
  loginRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  loginText: { color: COLORS.textLight },
  loginLink: { color: COLORS.primary, fontWeight: "bold" },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 25, paddingBottom: 30, maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 20, fontWeight: "bold",
    color: COLORS.textDark, marginBottom: 15, textAlign: "center",
  },
  modalScroll: { maxHeight: 350, marginBottom: 15 },
  modalHeading: {
    fontWeight: "bold", color: COLORS.primary,
    fontSize: 14, marginTop: 12, marginBottom: 5,
  },
  modalText: { color: COLORS.textMid, fontSize: 13, lineHeight: 20 },
  agreeButton: {
    backgroundColor: COLORS.primary, padding: 15,
    borderRadius: 12, alignItems: "center", marginBottom: 10,
  },
  agreeButtonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  declineButton: {
    padding: 12, borderRadius: 12, alignItems: "center",
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  declineButtonText: { color: COLORS.textMid, fontWeight: "bold" },
});
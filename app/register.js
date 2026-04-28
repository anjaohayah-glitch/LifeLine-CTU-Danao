// app/register.js
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ref, set } from "firebase/database";
import { useEffect, useState } from "react";
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
import { CTU_ACADEMIC_DATA } from "../constants/AcademicData";
import { COLORS } from "../constants/colors";
import { auth, db } from "../firebase";

const PSGC = "https://psgc.gitlab.io/api";

const ROLES = [
  { key: "student", label: "Student", icon: "🎓", desc: "Enrolled at CTU Danao" },
  { key: "faculty", label: "Faculty Staff", icon: "👨‍🏫", desc: "Teaching or admin staff" },
];

// ── PHONE INPUT WITH +63 PREFIX ──────────────────────────
const PhoneField = ({ value, onChangeText }) => (
  <View style={styles.inputWrapper}>
    <View style={styles.phonePrefixBox}>
      <Text style={styles.phonePrefixFlag}>🇵🇭</Text>
      <Text style={styles.phonePrefixText}>+63</Text>
    </View>
    <View style={styles.phoneDivider} />
    <TextInput
      style={[styles.input, { marginLeft: 8 }]}
      placeholder="9XX XXX XXXX"
      placeholderTextColor={COLORS.textLight}
      value={value}
      onChangeText={(text) => {
        // Strip leading 0 if user types it
        const cleaned = text.replace(/^0+/, "").replace(/[^0-9]/g, "");
        onChangeText(cleaned);
      }}
      keyboardType="phone-pad"
      maxLength={10}
    />
    <Text style={[styles.inputIcon, { marginLeft: 4 }]}>
      {value.length === 10 ? "✅" : ""}
    </Text>
  </View>
);

// ── GENERIC SELECTOR ─────────────────────────────────────
const SelectorField = ({ icon, label, value, options, onSelect, loading: fieldLoading, disabled }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.inputWrapper, disabled && { opacity: 0.5 }]}
        onPress={() => { if (!disabled) setOpen(true); }}
      >
        <Text style={styles.inputIcon}>{icon}</Text>
        <Text style={[styles.input, !value && { color: COLORS.textLight }]} numberOfLines={1}>
          {value || label}
        </Text>
        {fieldLoading
          ? <ActivityIndicator size="small" color={COLORS.primary} />
          : <Text style={{ color: COLORS.textLight, fontSize: 12 }}>▼</Text>
        }
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => { setOpen(false); setSearch(""); }}>
        <View style={styles.selectorOverlay}>
          <View style={styles.selectorBox}>
            <View style={styles.selectorHandle} />
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitle}>{label}</Text>
              <TouchableOpacity onPress={() => { setOpen(false); setSearch(""); }}>
                <Text style={styles.selectorClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={styles.selectorSearch}>
              <Text style={styles.selectorSearchIcon}>🔍</Text>
              <TextInput
                style={styles.selectorSearchInput}
                placeholder={`Search ${label.toLowerCase()}...`}
                placeholderTextColor={COLORS.textLight}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Text style={{ color: COLORS.textLight, fontSize: 14 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {filtered.length === 0 ? (
                <Text style={styles.selectorEmpty}>No results found</Text>
              ) : filtered.map((option, i) => (
                <TouchableOpacity
                  key={option.code || i}
                  style={[
                    styles.selectorItem,
                    value === option.name && styles.selectorItemActive,
                    i < filtered.length - 1 && { borderBottomWidth: 1, borderColor: COLORS.border },
                  ]}
                  onPress={() => { onSelect(option); setOpen(false); setSearch(""); }}
                >
                  <Text style={[styles.selectorItemText, value === option.name && styles.selectorItemTextActive]}>
                    {option.name}
                  </Text>
                  {value === option.name && <Text style={styles.selectorCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ── SIMPLE SELECTOR (for non-API lists) ──────────────────
const SimpleSelectorField = ({ icon, label, value, options, onSelect }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={styles.inputWrapper} onPress={() => setOpen(true)}>
        <Text style={styles.inputIcon}>{icon}</Text>
        <Text style={[styles.input, !value && { color: COLORS.textLight }]}>
          {value || label}
        </Text>
        <Text style={{ color: COLORS.textLight, fontSize: 12 }}>▼</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.selectorOverlay}>
          <View style={styles.selectorBox}>
            <View style={styles.selectorHandle} />
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={styles.selectorClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((option, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.selectorItem,
                    value === option && styles.selectorItemActive,
                    i < options.length - 1 && { borderBottomWidth: 1, borderColor: COLORS.border },
                  ]}
                  onPress={() => { onSelect(option); setOpen(false); }}
                >
                  <Text style={[styles.selectorItemText, value === option && styles.selectorItemTextActive]}>
                    {option}
                  </Text>
                  {value === option && <Text style={styles.selectorCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ── MAIN COMPONENT ───────────────────────────────────────
export default function Register() {
  const router = useRouter();

  // Step 1
  const [role, setRole] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 2 — Phone
  const [phone, setPhone] = useState("");

  // Step 2 — Address (PSGC)
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  // Step 2 — Academic
  const [college, setCollege] = useState("");
  const [program, setProgram] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [schedule, setSchedule] = useState("");

  // Step 2 — Emergency
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyNumber, setEmergencyNumber] = useState("");

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [termsModal, setTermsModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const availablePrograms = college ? CTU_ACADEMIC_DATA.programs[college] || [] : [];

  // Load provinces on step 2 mount
  useEffect(() => {
    if (step !== 2) return;
    const fetchProvinces = async () => {
      setLoadingProvinces(true);
      try {
        const res = await fetch(`${PSGC}/provinces/`);
        const data = await res.json();
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
        setProvinces(sorted);
      } catch (e) {
        Alert.alert("Network Error", "Could not load provinces. Please check your connection.");
      } finally {
        setLoadingProvinces(false);
      }
    };
    fetchProvinces();
  }, [step]);

  // Load cities when province selected
  const handleProvinceSelect = async (province) => {
    setSelectedProvince(province);
    setSelectedCity(null);
    setSelectedBarangay(null);
    setCities([]);
    setBarangays([]);
    setLoadingCities(true);
    try {
      const res = await fetch(`${PSGC}/provinces/${province.code}/cities-municipalities/`);
      const data = await res.json();
      const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
      setCities(sorted);
    } catch (e) {
      Alert.alert("Network Error", "Could not load cities.");
    } finally {
      setLoadingCities(false);
    }
  };

  // Load barangays when city selected
  const handleCitySelect = async (city) => {
    setSelectedCity(city);
    setSelectedBarangay(null);
    setBarangays([]);
    setLoadingBarangays(true);
    try {
      const res = await fetch(`${PSGC}/cities-municipalities/${city.code}/barangays/`);
      const data = await res.json();
      const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
      setBarangays(sorted);
    } catch (e) {
      Alert.alert("Network Error", "Could not load barangays.");
    } finally {
      setLoadingBarangays(false);
    }
  };

  const fullAddress = [
    selectedBarangay?.name,
    selectedCity?.name,
    selectedProvince?.name,
  ].filter(Boolean).join(", ");

  const validateStep1 = () => {
    if (!role) return "Please select your role.";
    if (!fullName.trim()) return "Please enter your full name.";
    if (!email.trim()) return "Please enter your email.";
    if (!password.trim()) return "Please enter a password.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  };

  const validateStep2 = () => {
    if (!phone.trim() || phone.length < 10) return "Please enter a valid 10-digit phone number.";
    if (!selectedProvince) return "Please select your province.";
    if (!selectedCity) return "Please select your city/municipality.";
    if (!selectedBarangay) return "Please select your barangay.";
    if (role === "student") {
      if (!college) return "Please select your college.";
      if (!program) return "Please select your program.";
      if (!yearLevel) return "Please select your year level.";
      if (!schedule) return "Please select your schedule.";
    }
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
    if (!agreedToTerms) { setTermsModal(true); return; }
    await doRegister();
  };

  const doRegister = async () => {
    try {
      setLoading(true);
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;
      await updateProfile(userCred.user, { displayName: fullName });
      await set(ref(db, "users/" + uid), {
        fullName, email,
        phone: "+63" + phone,
        province: selectedProvince?.name || "",
        city: selectedCity?.name || "",
        barangay: selectedBarangay?.name || "",
        fullAddress,
        role,
        college: role === "student" ? college : "",
        program: role === "student" ? program : "",
        yearLevel: role === "student" ? yearLevel : "",
        schedule: role === "student" ? schedule : "",
        addressPublic: true,
        emergencyName,
        emergencyNumber: emergencyNumber ? "+63" + emergencyNumber.replace(/^0+/, "") : "",
        createdAt: new Date().toISOString(),
      });
      Alert.alert(
        "Account Created! 🎉",
        `Welcome to LIFELINE, ${fullName}!\n\nYou can now log in and stay connected during emergencies.`,
        [{ text: "Login Now", onPress: () => router.replace("/login") }]
      );
    } catch (error) {
      Alert.alert("Registration Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.wrapper} behavior={Platform.OS === "ios" ? "padding" : "height"}>

      {/* TOP */}
      <View style={styles.topSection}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>🚑</Text>
        </View>
        <Text style={styles.logoText}>LIFELINE</Text>
        <Text style={styles.logoSub}>Create your account</Text>
      </View>

      {/* BOTTOM */}
      <View style={styles.bottomSection}>

        {/* STEP INDICATOR */}
        <View style={styles.stepIndicator}>
          <View style={styles.stepRow}>
            <View style={[styles.stepCircle, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.stepCircleText}>{step > 1 ? "✓" : "1"}</Text>
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

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── STEP 1 ───────────────────────────────── */}
          {step === 1 && (
            <>
              <Text style={styles.sectionTitle}>I am a...</Text>
              <View style={styles.roleRow}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r.key}
                    style={[styles.roleCard, role === r.key && styles.roleCardActive]}
                    onPress={() => setRole(r.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.roleIcon}>{r.icon}</Text>
                    <Text style={[styles.roleLabel, role === r.key && styles.roleLabelActive]}>{r.label}</Text>
                    <Text style={[styles.roleDesc, role === r.key && { color: COLORS.primary }]}>{r.desc}</Text>
                    {role === r.key && (
                      <View style={styles.roleCheck}>
                        <Text style={styles.roleCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Account Information</Text>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={COLORS.textLight}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={COLORS.textLight}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Password (min 6 characters)"
                  placeholderTextColor={COLORS.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.showText}>{showPassword ? "Hide" : "Show"}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={COLORS.textLight}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <Text style={styles.showText}>{showConfirm ? "Hide" : "Show"}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                <Text style={styles.primaryButtonText}>Next →</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── STEP 2 ───────────────────────────────── */}
          {step === 2 && (
            <>
              {/* Role badge */}
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {ROLES.find((r) => r.key === role)?.icon} Registering as {ROLES.find((r) => r.key === role)?.label}
                </Text>
              </View>

              {/* PHONE */}
              <Text style={styles.sectionTitle}>📋 Personal Information</Text>
              <Text style={styles.sectionSub}>Enter your Philippine mobile number</Text>
              <PhoneField value={phone} onChangeText={setPhone} />
              {phone.length > 0 && phone.length < 10 && (
                <Text style={styles.phoneHint}>⚠️ Enter 10 digits after +63 (e.g. 9171234567)</Text>
              )}
              {phone.length === 10 && (
                <Text style={styles.phonePreview}>📱 Full number: +63 {phone}</Text>
              )}

              {/* ADDRESS */}
              <Text style={styles.sectionTitle}>📍 Address</Text>
              <Text style={styles.sectionSub}>Select your province, city, and barangay</Text>

              {/* Province */}
              {loadingProvinces ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={COLORS.primary} />
                  <Text style={styles.loadingText}>Loading provinces...</Text>
                </View>
              ) : (
                <SelectorField
                  icon="🗺"
                  label="Select Province"
                  value={selectedProvince?.name || ""}
                  options={provinces}
                  onSelect={handleProvinceSelect}
                />
              )}

              {/* City */}
              <SelectorField
                icon="🏙"
                label={selectedProvince ? "Select City / Municipality" : "Select Province First"}
                value={selectedCity?.name || ""}
                options={cities}
                onSelect={handleCitySelect}
                loading={loadingCities}
                disabled={!selectedProvince || loadingCities}
              />

              {/* Barangay */}
              <SelectorField
                icon="🏘"
                label={selectedCity ? "Select Barangay" : "Select City First"}
                value={selectedBarangay?.name || ""}
                options={barangays}
                onSelect={(b) => setSelectedBarangay(b)}
                loading={loadingBarangays}
                disabled={!selectedCity || loadingBarangays}
              />

              {/* Full address preview */}
              {fullAddress ? (
                <View style={styles.addressPreview}>
                  <Text style={styles.addressPreviewIcon}>📍</Text>
                  <Text style={styles.addressPreviewText}>{fullAddress}</Text>
                </View>
              ) : null}

              {/* ACADEMIC — students only */}
              {role === "student" && (
                <>
                  <Text style={styles.sectionTitle}>🎓 Academic Information</Text>
                  <Text style={styles.sectionSub}>Select your college, program, year level, and schedule.</Text>
                  <SimpleSelectorField
                    icon="🏫" label="Select College"
                    value={college} options={CTU_ACADEMIC_DATA.colleges}
                    onSelect={(val) => { setCollege(val); setProgram(""); }}
                  />
                  <SimpleSelectorField
                    icon="📚"
                    label={college ? "Select Program" : "Select College First"}
                    value={program} options={availablePrograms}
                    onSelect={setProgram}
                  />
                  <View style={styles.rowFields}>
                    <View style={{ flex: 1 }}>
                      <SimpleSelectorField
                        icon="📅" label="Year Level"
                        value={yearLevel} options={CTU_ACADEMIC_DATA.yearLevels}
                        onSelect={setYearLevel}
                      />
                    </View>
                    <View style={{ width: 10 }} />
                    <View style={{ flex: 1 }}>
                      <SimpleSelectorField
                        icon="🌙" label="Schedule"
                        value={schedule} options={CTU_ACADEMIC_DATA.schedules}
                        onSelect={setSchedule}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* EMERGENCY CONTACT */}
              <Text style={styles.sectionTitle}>🆘 Emergency Contact</Text>
              <Text style={styles.sectionSub}>Who should we contact in case of emergency?</Text>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>👥</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contact Name (optional)"
                  placeholderTextColor={COLORS.textLight}
                  value={emergencyName}
                  onChangeText={setEmergencyName}
                />
              </View>

              <PhoneField value={emergencyNumber} onChangeText={setEmergencyNumber} />

              {/* TERMS */}
              <TouchableOpacity style={styles.termsRow} onPress={() => setTermsModal(true)}>
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                  {agreedToTerms && <Text style={styles.checkboxCheck}>✓</Text>}
                </View>
                <Text style={styles.termsText}>
                  I agree to the <Text style={styles.termsLink}>Terms & Conditions</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.primaryButton, styles.backBtn]} onPress={() => setStep(1)}>
                  <Text style={styles.primaryButtonText}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, { flex: 1 }, loading && { opacity: 0.7 }]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.primaryButtonText}>Create Account 🎉</Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity style={styles.loginRow} onPress={() => router.replace("/login")}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* TERMS MODAL */}
      <Modal visible={termsModal} transparent animationType="slide" onRequestClose={() => setTermsModal(false)}>
        <View style={styles.selectorOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.selectorHandle} />
            <Text style={styles.modalTitle}>📋 Terms & Conditions</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {[
                { heading: "Data Collection & Privacy", text: "By creating an account, you agree that LIFELINE may collect and share your personal information (including your name, status, and live location) with your approved contacts during emergencies only." },
                { heading: "Location Sharing", text: "Location data will only be shared when you press SOS or I Need Help. We do not track your location continuously or share it without your consent." },
                { heading: "Contact Requests", text: "You must accept a contact request before someone can see your safety status or send you messages. You can remove contacts at any time." },
                { heading: "Address Privacy", text: "Your address is only visible to your approved contacts by default. You can set your address to private in your profile settings at any time." },
                { heading: "Academic Information", text: "Your college, program, year level, and schedule are collected to help the campus DRRMO identify and assist students during emergencies." },
                { heading: "Emergency Alerts", text: "LIFELINE may send you emergency alerts and announcements from CTU Danao DRRMO. You can disable notifications in Settings." },
                { heading: "Disclaimer", text: "LIFELINE is a disaster preparedness tool. Always follow official government advisories and contact emergency services (911) in life-threatening situations." },
              ].map((item, i) => (
                <View key={i} style={{ marginBottom: 12 }}>
                  <Text style={styles.modalHeading}>{item.heading}</Text>
                  <Text style={styles.modalText}>{item.text}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => { setAgreedToTerms(true); setTermsModal(false); }}
            >
              <Text style={styles.primaryButtonText}>✅ I Agree & Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineButton} onPress={() => setTermsModal(false)}>
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

  // TOP
  topSection: { flex: 0.28, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  circle1: { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(255,255,255,0.07)", top: -80, right: -80 },
  circle2: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.07)", bottom: -40, left: -40 },
  logoBox: { width: 68, height: 68, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", marginBottom: 10, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)" },
  logoEmoji: { fontSize: 34 },
  logoText: { fontSize: 26, fontWeight: "bold", color: "#fff", letterSpacing: 5 },
  logoSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 4 },

  // BOTTOM
  bottomSection: { flex: 0.72, backgroundColor: "#fff", borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 24, paddingTop: 22 },

  // STEP
  stepIndicator: { alignItems: "center", marginBottom: 18 },
  stepRow: { flexDirection: "row", alignItems: "center" },
  stepCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  stepCircleText: { color: "#fff", fontWeight: "bold" },
  stepLine: { width: 80, height: 3, marginHorizontal: 8 },
  stepLabels: { flexDirection: "row", justifyContent: "space-between", width: 130, marginTop: 6 },
  stepLabel: { fontSize: 12, fontWeight: "bold" },

  // ROLE
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  roleCard: { flex: 1, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, padding: 14, alignItems: "center", backgroundColor: "#F8FAFB", position: "relative" },
  roleCardActive: { borderColor: COLORS.primary, backgroundColor: "#FFF5F5" },
  roleIcon: { fontSize: 28, marginBottom: 6 },
  roleLabel: { fontWeight: "bold", fontSize: 13, color: COLORS.textDark, marginBottom: 3 },
  roleLabelActive: { color: COLORS.primary },
  roleDesc: { fontSize: 10, color: COLORS.textLight, textAlign: "center" },
  roleCheck: { position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.primary, justifyContent: "center", alignItems: "center" },
  roleCheckText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  roleBadge: { backgroundColor: "#FFF5F5", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start", marginBottom: 14, borderWidth: 1, borderColor: "#FFCDD2" },
  roleBadgeText: { color: COLORS.primary, fontWeight: "bold", fontSize: 12 },

  // SECTION
  sectionTitle: { fontSize: 14, fontWeight: "bold", color: COLORS.textDark, marginBottom: 4, marginTop: 10 },
  sectionSub: { color: COLORS.textLight, fontSize: 11, marginBottom: 8 },

  // PHONE
  phonePrefixBox: { flexDirection: "row", alignItems: "center", gap: 4, paddingRight: 8 },
  phonePrefixFlag: { fontSize: 18 },
  phonePrefixText: { fontWeight: "bold", color: COLORS.textDark, fontSize: 14 },
  phoneDivider: { width: 1, height: 22, backgroundColor: COLORS.border },
  phoneHint: { color: "#E65100", fontSize: 11, marginTop: -6, marginBottom: 8, marginLeft: 4 },
  phonePreview: { color: "#2e7d32", fontSize: 11, marginTop: -6, marginBottom: 8, marginLeft: 4, fontWeight: "600" },

  // ADDRESS PREVIEW
  addressPreview: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#E8F5E9", borderRadius: 10,
    padding: 10, marginBottom: 10, gap: 8,
    borderWidth: 1, borderColor: "#A5D6A7",
  },
  addressPreviewIcon: { fontSize: 16 },
  addressPreviewText: { flex: 1, fontSize: 12, color: "#2e7d32", fontWeight: "600", lineHeight: 18 },

  // LOADING
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, marginBottom: 10 },
  loadingText: { color: COLORS.textLight, fontSize: 13 },

  // INPUTS
  inputWrapper: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, backgroundColor: COLORS.surface },
  inputIcon: { fontSize: 17, marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: COLORS.textDark },
  showText: { color: COLORS.primary, fontWeight: "bold", fontSize: 12 },
  rowFields: { flexDirection: "row" },

  // SELECTOR
  selectorOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  selectorBox: { backgroundColor: "#fff", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, maxHeight: "75%" },
  selectorHandle: { width: 40, height: 4, backgroundColor: "#ECEFF1", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  selectorHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  selectorTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.textDark },
  selectorClose: { fontSize: 18, color: COLORS.textLight, fontWeight: "bold" },
  selectorSearch: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12, backgroundColor: COLORS.surface, gap: 8 },
  selectorSearchIcon: { fontSize: 14 },
  selectorSearchInput: { flex: 1, fontSize: 14, color: COLORS.textDark },
  selectorEmpty: { textAlign: "center", color: COLORS.textLight, padding: 20, fontSize: 13 },
  selectorItem: { paddingVertical: 14, paddingHorizontal: 5, flexDirection: "row", alignItems: "center" },
  selectorItemActive: { backgroundColor: "#FFF5F5" },
  selectorItemText: { flex: 1, fontSize: 14, color: COLORS.textDark },
  selectorItemTextActive: { color: COLORS.primary, fontWeight: "bold" },
  selectorCheck: { color: COLORS.primary, fontWeight: "bold", fontSize: 16 },

  // TERMS
  termsRow: { flexDirection: "row", alignItems: "center", marginBottom: 14, marginTop: 4, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.primary, justifyContent: "center", alignItems: "center" },
  checkboxChecked: { backgroundColor: COLORS.primary },
  checkboxCheck: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  termsText: { flex: 1, fontSize: 12, color: COLORS.textMid, lineHeight: 18 },
  termsLink: { color: COLORS.primary, fontWeight: "bold" },

  // BUTTONS
  primaryButton: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 14, alignItems: "center", marginTop: 8, elevation: 4, shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
  primaryButtonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  backBtn: { backgroundColor: COLORS.textLight, width: 90 },
  loginRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  loginText: { color: COLORS.textLight, fontSize: 13 },
  loginLink: { color: COLORS.primary, fontWeight: "bold", fontSize: 13 },

  // MODAL
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 34, maxHeight: "88%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.textDark, marginBottom: 14, textAlign: "center" },
  modalScroll: { maxHeight: 340, marginBottom: 14 },
  modalHeading: { fontWeight: "bold", color: COLORS.primary, fontSize: 13, marginBottom: 4 },
  modalText: { color: COLORS.textMid, fontSize: 12, lineHeight: 19 },
  declineButton: { padding: 13, borderRadius: 12, alignItems: "center", marginTop: 10, borderWidth: 1.5, borderColor: COLORS.border },
  declineButtonText: { color: COLORS.textMid, fontWeight: "bold" },
});
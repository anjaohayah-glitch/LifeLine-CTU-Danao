// context/SettingsContext.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";

const SettingsContext = createContext({});
export const useSettings = () => useContext(SettingsContext);

const TRANSLATIONS = {
  en: {
    // NAV
    home: "Home", evacuate: "Evacuate", hotlines: "Hotlines",
    weather: "Weather", profile: "Profile",
    // HOME
    good_morning: "Good Morning ☀️", good_afternoon: "Good Afternoon 🌤",
    good_evening: "Good Evening 🌙",
    quick_access: "Quick Access", all_features: "All features",
    disaster_tips: "Disaster Tips", tap_to_expand: "Tap to expand",
    system_feed: "System Feed", marked_safe: "Marked Safe",
    status_unknown: "Status Unknown", mark_safe: "MARK\nSAFE",
    online: "Online", offline: "Offline",
    // EVACUATION
    evacuation_title: "Evacuation Centers",
    evacuation_sub: "Danao City Safe Zones & Evacuation Guide",
    nearest: "📍 NEAREST", go_here_now: "🚨 GO HERE NOW",
    start_navigation: "🗺 START NAVIGATION",
    safe_zones: "Safe Zones", danger_zones: "Danger Zones",
    monitoring: "Monitoring", centers: "🏠 Centers",
    danger: "⚠️ Danger Zones", tips: "💡 Tips",
    // FIRST AID
    firstaid_title: "First Aid Guide",
    firstaid_sub: "Step-by-step emergency instructions",
    guides: "Guides", emergency: "Emergency", offline_label: "Free",
    all: "🩺 All", critical: "🚨 Critical",
    injury: "🩹 Injury", disaster: "🌪 Disaster",
    // FAMILY
    family_title: "Family & Peers",
    family_sub: "Stay connected during emergencies",
    contacts: "Contacts", requests: "Requests", find: "🔍 Find",
    i_am_safe: "🟢 I Am Safe", need_help: "🔴 Need Help",
    // SETTINGS
    settings_title: "Settings", language_label: "Language",
    appearance: "Appearance", dark_mode: "Dark Mode",
    notifications_label: "Notifications", emergency_alerts: "Emergency Alerts",
    voice_speed: "Voice Guide Speed", account: "Account",
    edit_name: "Edit Display Name", change_password: "Change Password",
    information: "Information", about: "About LIFELINE",
    privacy: "Privacy Policy", logout: "Logout",
    // PROFILE
    profile_title: "My Profile",
    profile_sub: "Manage your personal information",
    personal_info: "Personal Information", emergency_contact: "Emergency Contact",
    edit_profile: "✏️ Edit Profile", save_changes: "💾 Save Changes",
    cancel: "Cancel",
    // GENERAL
    back: "← Back", search: "Search by name...",
    no_contacts: "No contacts yet", find_people: "🔍 Find People",
    call_now: "Tap to call", tap_navigate: "🗺 Tap to open in Google Maps",
  },
  ceb: {
    // NAV
    home: "Panimalay", evacuate: "Likas", hotlines: "Hotlines",
    weather: "Panahon", profile: "Profile",
    // HOME
    good_morning: "Maayong Buntag ☀️", good_afternoon: "Maayong Hapon 🌤",
    good_evening: "Maayong Gabii 🌙",
    quick_access: "Dali nga Access", all_features: "Tanan nga features",
    disaster_tips: "Mga Tip sa Kalamidad", tap_to_expand: "I-tap para mabukas",
    system_feed: "Sistema Feed", marked_safe: "Luwas na",
    status_unknown: "Wala'y Kahimtang", mark_safe: "MARKAHI\nLUWAS",
    online: "Online", offline: "Offline",
    // EVACUATION
    evacuation_title: "Mga Sentro sa Evacuation",
    evacuation_sub: "Mga Luwas nga Lugar sa Danao City",
    nearest: "📍 PINAKALAPIT", go_here_now: "🚨 ADTO DINHI KARON",
    start_navigation: "🗺 SUGDI ANG NAVIGATION",
    safe_zones: "Luwas nga Lugar", danger_zones: "Delikadong Lugar",
    monitoring: "Pagmonitor", centers: "🏠 Mga Sentro",
    danger: "⚠️ Delikado", tips: "💡 Mga Tip",
    // FIRST AID
    firstaid_title: "Unang Bulig",
    firstaid_sub: "Mga instruksyon sa emerhensya",
    guides: "Mga Gabay", emergency: "Emerhensya", offline_label: "Libre",
    all: "🩺 Tanan", critical: "🚨 Kritikal",
    injury: "🩹 Samad", disaster: "🌪 Kalamidad",
    // FAMILY
    family_title: "Pamilya ug Mga Kaedad",
    family_sub: "Magkonekta sa panahon sa emerhensya",
    contacts: "Mga Kontak", requests: "Mga Hangyo", find: "🔍 Pangita",
    i_am_safe: "🟢 Luwas Ko", need_help: "🔴 Nagkinahanglan Ko og Tabang",
    // SETTINGS
    settings_title: "Mga Setting", language_label: "Pinulongan",
    appearance: "Hitsura", dark_mode: "Dark Mode",
    notifications_label: "Mga Abiso", emergency_alerts: "Mga Alerto sa Emerhensya",
    voice_speed: "Tulin sa Tingog", account: "Account",
    edit_name: "I-edit ang Ngalan", change_password: "Usba ang Password",
    information: "Impormasyon", about: "Mahitungod sa LIFELINE",
    privacy: "Polisiya sa Privacy", logout: "Logout",
    // PROFILE
    profile_title: "Akong Profile",
    profile_sub: "Pagdumala sa imong impormasyon",
    personal_info: "Personal nga Impormasyon", emergency_contact: "Kontak sa Emerhensya",
    edit_profile: "✏️ I-edit ang Profile", save_changes: "💾 I-save ang Pagbag-o",
    cancel: "Kanselahon",
    // GENERAL
    back: "← Balik", search: "Pangita pinaagi sa ngalan...",
    no_contacts: "Wala pay mga kontak", find_people: "🔍 Pangita og Tawo",
    call_now: "I-tap para tawagan", tap_navigate: "🗺 I-tap para buksan sa Google Maps",
  },
  fil: {
    // NAV
    home: "Tahanan", evacuate: "Lumikas", hotlines: "Hotlines",
    weather: "Panahon", profile: "Profile",
    // HOME
    good_morning: "Magandang Umaga ☀️", good_afternoon: "Magandang Tanghali 🌤",
    good_evening: "Magandang Gabi 🌙",
    quick_access: "Mabilis na Access", all_features: "Lahat ng features",
    disaster_tips: "Mga Tip sa Sakuna", tap_to_expand: "I-tap para palawakin",
    system_feed: "Sistema Feed", marked_safe: "Ligtas na",
    status_unknown: "Hindi Alam ang Katayuan", mark_safe: "MARKAHAN\nLIGTAS",
    online: "Online", offline: "Offline",
    // EVACUATION
    evacuation_title: "Mga Sentro ng Evacuation",
    evacuation_sub: "Mga Ligtas na Lugar sa Danao City",
    nearest: "📍 PINAKAMALAPIT", go_here_now: "🚨 PUMUNTA DITO NGAYON",
    start_navigation: "🗺 SIMULAN ANG NAVIGATION",
    safe_zones: "Ligtas na Lugar", danger_zones: "Mapanganib na Lugar",
    monitoring: "Pagmamatyag", centers: "🏠 Mga Sentro",
    danger: "⚠️ Mapanganib", tips: "💡 Mga Tip",
    // FIRST AID
    firstaid_title: "Unang Lunas",
    firstaid_sub: "Mga hakbang sa emerhensya",
    guides: "Mga Gabay", emergency: "Emerhensya", offline_label: "Libre",
    all: "🩺 Lahat", critical: "🚨 Kritikal",
    injury: "🩹 Sugat", disaster: "🌪 Sakuna",
    // FAMILY
    family_title: "Pamilya at Mga Kaibigan",
    family_sub: "Manatiling konektado sa panahon ng emerhensya",
    contacts: "Mga Kontak", requests: "Mga Kahilingan", find: "🔍 Hanapin",
    i_am_safe: "🟢 Ligtas Ako", need_help: "🔴 Kailangan Ko ng Tulong",
    // SETTINGS
    settings_title: "Mga Setting", language_label: "Wika",
    appearance: "Hitsura", dark_mode: "Dark Mode",
    notifications_label: "Mga Abiso", emergency_alerts: "Mga Alerto sa Emerhensya",
    voice_speed: "Bilis ng Boses", account: "Account",
    edit_name: "I-edit ang Pangalan", change_password: "Baguhin ang Password",
    information: "Impormasyon", about: "Tungkol sa LIFELINE",
    privacy: "Patakaran sa Privacy", logout: "Mag-logout",
    // PROFILE
    profile_title: "Aking Profile",
    profile_sub: "Pamahalaan ang iyong impormasyon",
    personal_info: "Personal na Impormasyon", emergency_contact: "Kontak sa Emerhensya",
    edit_profile: "✏️ I-edit ang Profile", save_changes: "💾 I-save ang Pagbabago",
    cancel: "Kanselahin",
    // GENERAL
    back: "← Bumalik", search: "Maghanap sa pangalan...",
    no_contacts: "Wala pang mga kontak", find_people: "🔍 Humanap ng Tao",
    call_now: "I-tap para tumawag", tap_navigate: "🗺 I-tap para buksan sa Google Maps",
  },
};

export function SettingsProvider({ children }) {
  const [language, setLanguage] = useState("en");
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [voiceSpeed, setVoiceSpeed] = useState("normal");

  useEffect(() => {
    (async () => {
      try {
        const savedLang = await AsyncStorage.getItem("language");
        const savedDark = await AsyncStorage.getItem("darkMode");
        const savedNotif = await AsyncStorage.getItem("notifications");
        const savedSpeed = await AsyncStorage.getItem("voiceSpeed");
        if (savedLang) setLanguage(savedLang);
        if (savedDark !== null) setDarkMode(savedDark === "true");
        if (savedNotif !== null) setNotifications(savedNotif === "true");
        if (savedSpeed) setVoiceSpeed(savedSpeed);
      } catch (e) {}
    })();
  }, []);

  const updateLanguage = async (val) => { setLanguage(val); await AsyncStorage.setItem("language", val); };
  const updateDarkMode = async (val) => { setDarkMode(val); await AsyncStorage.setItem("darkMode", String(val)); };
  const updateNotifications = async (val) => { setNotifications(val); await AsyncStorage.setItem("notifications", String(val)); };
  const updateVoiceSpeed = async (val) => { setVoiceSpeed(val); await AsyncStorage.setItem("voiceSpeed", String(val)); };

  // Translate function — t("key") returns the string in the current language
  const t = (key) => TRANSLATIONS[language]?.[key] ?? TRANSLATIONS["en"][key] ?? key;

  const theme = {
    bg: darkMode ? "#121212" : "#ffffff",
    surface: darkMode ? "#1e1e1e" : "#f5f5f5",
    card: darkMode ? "#2c2c2c" : "#ffffff",
    border: darkMode ? "#333333" : "#e0e0e0",
    textDark: darkMode ? "#ffffff" : "#1a1a1a",
    textMid: darkMode ? "#cccccc" : "#555555",
    textLight: darkMode ? "#999999" : "#888888",
    primary: "#B00020",
  };

  return (
    <SettingsContext.Provider value={{
      language, updateLanguage,
      darkMode, updateDarkMode,
      notifications, updateNotifications,
      voiceSpeed, updateVoiceSpeed,
      theme, t,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}
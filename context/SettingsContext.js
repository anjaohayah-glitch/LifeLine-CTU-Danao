// context/SettingsContext.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";

const SettingsContext = createContext({});

export const useSettings = () => useContext(SettingsContext);

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

  const updateLanguage = async (val) => {
    setLanguage(val);
    await AsyncStorage.setItem("language", val);
  };

  const updateDarkMode = async (val) => {
    setDarkMode(val);
    await AsyncStorage.setItem("darkMode", String(val));
  };

  const updateNotifications = async (val) => {
    setNotifications(val);
    await AsyncStorage.setItem("notifications", String(val));
  };

  const updateVoiceSpeed = async (val) => {
    setVoiceSpeed(val);
    await AsyncStorage.setItem("voiceSpeed", String(val));
  };

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
      theme,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}
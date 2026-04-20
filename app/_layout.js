// app/_layout.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { useAlertNotifications } from "../hooks/useAlertNotifications";
import { useNotifications } from "../hooks/useNotifications";
import { SettingsProvider } from "../context/SettingsContext";
import { registerWeatherBackgroundFetch } from "../hooks/useWeatherNotifications";

function AppLayout() {
  useNotifications();
  useAlertNotifications();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="splash" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="home" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="evacuation" />
      <Stack.Screen name="hotlines" />
      <Stack.Screen name="weather" />
      <Stack.Screen name="firstaid" />
      <Stack.Screen name="guides" />
      <Stack.Screen name="checklist" />
      <Stack.Screen name="family" />
      <Stack.Screen name="drrm" />
      <Stack.Screen name="voiceguide" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

export default function Layout() {
  useEffect(() => {
    // ✅ Register background weather check when app starts
    registerWeatherBackgroundFetch();
  }, []);

  return (
    <SettingsProvider>
      <AppLayout />
    </SettingsProvider>
  );
}
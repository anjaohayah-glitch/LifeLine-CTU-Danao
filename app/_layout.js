
// app/_layout.js
import { Stack } from "expo-router";
import { SettingsProvider } from "../context/SettingsContext";
import { useAlertNotifications } from "../hooks/useAlertNotifications";
import { useNotifications } from "../hooks/useNotifications";

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
  return (
    <SettingsProvider>
      <AppLayout />
    </SettingsProvider>
  );
}
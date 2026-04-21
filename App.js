import React, { useEffect } from 'react';
import { Alert, Vibration } from 'react-native';
import messaging from '@react-native-firebase/messaging';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import TermsScreen from './screens/TermsScreen';

const Stack = createNativeStackNavigator();

// 🔥 HANDLE BACKGROUND MESSAGES
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in background!', remoteMessage);
});

export default function App() {

  useEffect(() => {
    requestPermission();
    getFCMToken();
    listenForMessages();
  }, []);

  // 🔔 Request Notification Permission
  async function requestPermission() {
    const authStatus = await messaging().requestPermission();

    if (authStatus) {
      console.log('✅ Permission granted');
    } else {
      console.log('❌ Permission denied');
    }
  }

  // 🔑 Get FCM Token
  async function getFCMToken() {
    const token = await messaging().getToken();
    console.log('🔥 FCM Token:', token);

    // 👉 OPTIONAL: send this token to your backend
  }

  // 📩 Listen for FOREGROUND messages
  function listenForMessages() {
    messaging().onMessage(async remoteMessage => {
      console.log('📩 Message received:', remoteMessage);

      Alert.alert(
        remoteMessage.notification?.title || "⚠️ Alert",
        remoteMessage.notification?.body || "New emergency update"
      );

      // 📳 BUZZ NOTIFICATION
      Vibration.vibrate([500, 200, 500]);
    });
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Terms" component={TermsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
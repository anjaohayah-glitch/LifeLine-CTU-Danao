// app/splash.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { auth } from "../firebase";

export default function Splash() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(subtitleFade, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    });

    let hasNavigated = false;

    const navigate = (destination) => {
      if (hasNavigated) return;
      hasNavigated = true;
      setTimeout(() => router.replace(destination), 2500);
    };

    // ✅ OFFLINE FIX: Check AsyncStorage FIRST before Firebase
    AsyncStorage.getItem("userUID").then((savedUID) => {
      if (savedUID) {
        // ✅ User was logged in before — go home even without internet
        navigate("/home");
        return;
      }

      // No saved session — need internet to check Firebase
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          // Save UID so next time works offline
          AsyncStorage.setItem("userUID", user.uid);
          navigate("/home");
        } else {
          AsyncStorage.removeItem("userUID");
          navigate("/login");
        }
      });

      // Fallback if Firebase takes too long (truly offline, no saved session)
      const fallback = setTimeout(() => {
        if (!hasNavigated) {
          hasNavigated = true;
          router.replace("/login");
        }
      }, 6000);

      return () => {
        unsubscribe();
        clearTimeout(fallback);
      };
    }).catch(() => {
      // AsyncStorage failed — fall back to Firebase
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        navigate(user ? "/home" : "/login");
      });
      const fallback = setTimeout(() => {
        if (!hasNavigated) {
          hasNavigated = true;
          router.replace("/login");
        }
      }, 6000);
      return () => { unsubscribe(); clearTimeout(fallback); };
    });

  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <Animated.View style={[
        styles.logoContainer,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}>
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>🚑</Text>
        </View>
        <Text style={styles.logoText}>LIFELINE</Text>
      </Animated.View>

      <Animated.View style={{ opacity: subtitleFade }}>
        <Text style={styles.subtitle}>CTU Danao Disaster Preparedness</Text>
        <Text style={styles.tagline}>Prepared. Connected. Safe.</Text>
      </Animated.View>

      <Animated.View style={[styles.loadingContainer, { opacity: subtitleFade }]}>
        <LoadingDots />
      </Animated.View>

      <Animated.Text style={[styles.footer, { opacity: subtitleFade }]}>
        Powered by CTU Danao Campus
      </Animated.Text>
    </View>
  );
}

function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  return (
    <View style={styles.dotsRow}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: "#B00020",
    justifyContent: "center", alignItems: "center",
  },
  circle1: {
    position: "absolute", width: 400, height: 400,
    borderRadius: 200, backgroundColor: "rgba(255,255,255,0.05)",
    top: -100, right: -100,
  },
  circle2: {
    position: "absolute", width: 300, height: 300,
    borderRadius: 150, backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -50, left: -80,
  },
  logoContainer: { alignItems: "center", marginBottom: 20 },
  logoBox: {
    width: 110, height: 110, borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
    marginBottom: 15, borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoIcon: { fontSize: 60 },
  logoText: { fontSize: 42, fontWeight: "bold", color: "#fff", letterSpacing: 6 },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center", marginBottom: 6 },
  tagline: { color: "rgba(255,255,255,0.6)", fontSize: 13, textAlign: "center", fontStyle: "italic" },
  loadingContainer: { marginTop: 50 },
  dotsRow: { flexDirection: "row", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff" },
  footer: { position: "absolute", bottom: 40, color: "rgba(255,255,255,0.4)", fontSize: 12 },
});
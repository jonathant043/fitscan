// app/_layout.tsx
import React, { useRef, useEffect, useState } from "react";
import { View, TouchableOpacity, StyleSheet, Text, Animated, Image } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as SplashScreen from "expo-splash-screen";
import { StripeProvider } from "@stripe/stripe-react-native";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { OfflineNotice } from "../components/OfflineNotice";
import { COLORS } from "../lib/constants";

// Stripe publishable key — set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in your .env
const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "pk_test_placeholder";

// Keep the native splash hidden until our custom one is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

// ---------------------------------------------------------------------------
// Custom animated splash screen
// ---------------------------------------------------------------------------
function FitScanSplash({ onDone }: { onDone: () => void }) {
  // Start fully opaque so the splash covers the tabs immediately on first render
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.5)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Hide native splash — our custom one is already visible at opacity 1
    SplashScreen.hideAsync().catch(() => {});

    // Sonar pulse rings — ring 1
    const pulse1 = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ring1Scale, { toValue: 1.55, duration: 1400, useNativeDriver: true }),
          Animated.timing(ring1Scale, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(ring1Opacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
          Animated.timing(ring1Opacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );

    // Ring 2 — offset by 700ms for staggered effect
    const pulse2Timer = setTimeout(() => {
      const pulse2 = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(ring2Scale, { toValue: 1.9, duration: 1400, useNativeDriver: true }),
            Animated.timing(ring2Scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(ring2Opacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
            Animated.timing(ring2Opacity, { toValue: 0.3, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
      pulse2.start();
    }, 700);

    pulse1.start();

    // Fade out after 2.2 s
    const doneTimer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(onDone);
    }, 2200);

    return () => {
      clearTimeout(pulse2Timer);
      clearTimeout(doneTimer);
      pulse1.stop();
    };
  }, []);

  return (
    <Animated.View style={[splashStyles.container, { opacity: fadeAnim }]}>
      {/* Pulse rings */}
      <View style={splashStyles.logoWrapper}>
        <Animated.View
          style={[
            splashStyles.ring,
            { transform: [{ scale: ring2Scale }], opacity: ring2Opacity },
          ]}
        />
        <Animated.View
          style={[
            splashStyles.ring,
            splashStyles.ringInner,
            { transform: [{ scale: ring1Scale }], opacity: ring1Opacity },
          ]}
        />

        {/* Logo image */}
        <Image
          source={require("../assets/logo.png")}
          style={splashStyles.logoImage}
          resizeMode="contain"
        />
      </View>

      <Text style={splashStyles.subtitle}>FITNESS MADE SIMPLE</Text>
    </Animated.View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#060d1a",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  logoWrapper: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  ring: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  ringInner: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  logoImage: {
    width: 160,
    height: 160,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
    letterSpacing: 3.5,
  },
});

// ---------------------------------------------------------------------------
// Raised circular scan tab button
// ---------------------------------------------------------------------------
type TabButtonProps = {
  onPress?: (...args: unknown[]) => void;
  accessibilityState?: { selected?: boolean };
};

function ScanTabButton({ onPress, accessibilityState }: TabButtonProps) {
  const active = accessibilityState?.selected ?? false;
  return (
    <TouchableOpacity
      onPress={onPress as () => void}
      activeOpacity={0.85}
      style={tabStyles.outer}
      accessibilityRole="button"
      accessibilityLabel="Scan"
    >
      <View style={[tabStyles.circle, active && tabStyles.circleActive]}>
        <Ionicons name="camera" size={26} color="#000" />
      </View>
      <Text style={[tabStyles.label, active && tabStyles.labelActive]}>Scan</Text>
    </TouchableOpacity>
  );
}

const tabStyles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 8,
  },
  circle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    marginTop: -22,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  circleActive: { backgroundColor: "#0ea5e9" },
  label: { fontSize: 10, fontWeight: "600", color: COLORS.textMuted, marginTop: 2 },
  labelActive: { color: COLORS.text },
});

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------
export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} urlScheme="fitscan">
    <ErrorBoundary>
      <View style={{ flex: 1 }}>
        <OfflineNotice />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: COLORS.text,
            tabBarInactiveTintColor: COLORS.textMuted,
            tabBarStyle: {
              backgroundColor: COLORS.background,
              borderTopColor: "#0f172a",
              borderTopWidth: 1,
              height: 72,
              paddingBottom: 10,
              overflow: "visible",
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Home",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="history"
            options={{
              title: "Progress",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="stats-chart-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="exercises"
            options={{
              title: "Exercises",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="barbell-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="equipment-scanner"
            options={{
              title: "Scan",
              tabBarButton: (props) => (
                <ScanTabButton
                  onPress={props.onPress as (...args: unknown[]) => void}
                  accessibilityState={props.accessibilityState}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: "Profile",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person-outline" size={size} color={color} />
              ),
            }}
          />
          {/* Hidden routes */}
          <Tabs.Screen name="home" options={{ href: null }} />
          <Tabs.Screen name="+not-found" options={{ href: null }} />
          <Tabs.Screen name="app/welcome" options={{ href: null }} />
          <Tabs.Screen name="paywall" options={{ href: null }} />
        </Tabs>

        {/* Custom splash overlay — rendered on top of tabs, removed when done */}
        {!splashDone && (
          <FitScanSplash onDone={() => setSplashDone(true)} />
        )}
      </View>
    </ErrorBoundary>
    </StripeProvider>
  );
}

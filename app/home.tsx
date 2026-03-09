// app/home.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const PROFILE_STORAGE_KEY = "fitscan_profile_v1";

type StoredProfile = {
  name?: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [name, setName] = useState<string>("FitScan");

  useEffect(() => {
    const loadName = async () => {
      try {
        const stored = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
        if (stored) {
          const parsed: StoredProfile = JSON.parse(stored);
          if (parsed?.name && parsed.name.trim().length > 0) {
            setName(parsed.name.trim());
          }
        }
      } catch (e) {
        console.warn("Failed to load profile name", e);
      }
    };

    loadName();
  }, []);

  return (
    <ImageBackground
      style={styles.container}
      source={undefined}
      // If you want a background image later, set it here; for now we just use gradient colors.
    >
      <View style={styles.topSpacing} />

      <Text style={styles.welcomeLabel}>Welcome back,</Text>
      <Text style={styles.welcomeName}>{name}</Text>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Fitness Made Simple</Text>
        <Text style={styles.heroText}>
          Scan any piece of gym equipment and get instant, personalized workout
          guidance powered by AI.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push("/equipment-scanner")}
      >
        <Ionicons name="camera-outline" size={20} color="#020617" />
        <Text style={styles.primaryButtonText}>Start Scanning</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push("/exercises")}
      >
        <Ionicons name="list-outline" size={20} color="#E5E7EB" />
        <Text style={styles.secondaryButtonText}>Browse Exercises</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push("/profile")}
      >
        <Ionicons name="person-outline" size={20} color="#E5E7EB" />
        <Text style={styles.secondaryButtonText}>View profile</Text>
      </TouchableOpacity>

      <View style={styles.tipBlock}>
        <Ionicons name="bulb-outline" size={16} color="#FBBF24" />
        <Text style={styles.tipText}>
          Start with the scanner to unlock AI-tailored sets based on your
          profile and equipment.
        </Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 32,
    backgroundColor: "#0369A1", // you can turn this into a gradient later
  },
  topSpacing: {
    height: 8,
  },
  welcomeLabel: {
    fontSize: 16,
    color: "#E5E7EB",
  },
  welcomeName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 24,
  },
  heroCard: {
    backgroundColor: "#020617",
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  heroText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#38BDF8",
    borderRadius: 999,
    paddingVertical: 16,
    marginBottom: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#020617",
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingVertical: 14,
    marginBottom: 12,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#E5E7EB",
    marginLeft: 8,
  },
  tipBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 18,
  },
  tipText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#E5E7EB",
    flex: 1,
  },
});
